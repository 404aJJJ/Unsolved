"""Exercise the HTTP contract using dummy case data, without real puzzle answers."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from server.main import app


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "case.json"
        self.doc = {"id": "05", "heading": "Test file", "sub": [], "blocks": []}
        self.path.write_text(json.dumps({
            "answers": {id: "TEST" for id in ("04", "05", "06")},
            "files": {id: {**self.doc, "id": id} for id in ("04", "05", "06")},
            "hints": {"05": ["First hint", "Second hint"]},
        }))
        self.patcher = patch("server.main.CASE_PATH", self.path)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.progress_path = Path(self.temp.name) / "progress.json"
        progress_patcher = patch("server.main.PROGRESS_PATH", self.progress_path)
        progress_patcher.start()
        self.addCleanup(progress_patcher.stop)
        database_patcher = patch("server.main.DATABASE_PATH", Path(self.temp.name) / "game.sqlite3")
        database_patcher.start()
        self.addCleanup(database_patcher.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_incident_image_returns_original_png(self):
        image_path = Path(__file__).parents[1] / "assets" / "incidentReport_01.png"
        response = self.client.get("/api/files/01/image")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "image/png")
        self.assertEqual(response.content, image_path.read_bytes())

    def test_incident_image_missing(self):
        with patch("server.main.Path.is_file", return_value=False):
            response = self.client.get("/api/files/01/image")
        self.assertEqual(response.status_code, 404)

    def test_health(self):
        self.assertEqual(self.client.get("/api/health").json(), {"ok": True})

    def test_correct_answer_normalizes_case_and_spaces(self):
        response = self.client.post("/api/unlock", json={"fileId": "05", "answer": " test "})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True, "file": self.doc})

    def test_wrong_answer_returns_hint_without_content_or_password(self):
        response = self.client.post("/api/unlock", json={"fileId": "05", "answer": "wrong", "attempt": 1})
        self.assertEqual(response.json(), {"ok": False, "hints": ["First hint"]})

    def test_unknown_file(self):
        response = self.client.post("/api/unlock", json={"fileId": "99", "answer": "TEST"})
        self.assertEqual(response.status_code, 404)

    def test_missing_or_invalid_data(self):
        for contents in (None, "{}", "not JSON"):
            if contents is None:
                self.path.unlink()
            else:
                self.path.write_text(contents)
            response = self.client.post("/api/unlock", json={"fileId": "05", "answer": "TEST"})
            self.assertEqual(response.status_code, 503)

    def test_invalid_request(self):
        for body in ({}, {"fileId": "05", "answer": 1234}, {"fileId": "05", "answer": "TEST", "attempt": 0}):
            self.assertEqual(self.client.post("/api/unlock", json=body).status_code, 422)

    def test_local_frontend_can_call_api(self):
        response = self.client.options("/api/unlock", headers={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")

    def test_each_locked_image_requires_its_own_correct_answer(self):
        filenames = {"04": "securityLogs_03.png", "05": "diamondExamReport_04.png", "06": "purchaseRecords_05.png"}
        for id, filename in filenames.items():
            url = f"/api/files/{id}/image"
            self.assertEqual(self.client.get(url).status_code, 403)
            self.client.post("/api/unlock", json={"fileId": id, "answer": "wrong"})
            self.assertEqual(self.client.get(url).status_code, 403)
            self.client.post("/api/unlock", json={"fileId": id, "answer": "TEST"})
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content, (Path(__file__).parents[1] / "assets" / filename).read_bytes())
            self.assertEqual(response.headers["cache-control"], "no-store")

    def test_saved_progress_is_read_by_a_new_client(self):
        self.client.post("/api/unlock", json={"fileId": "05", "answer": "TEST"})
        self.assertEqual(json.loads(self.progress_path.read_text()), {"unlocked_files": ["05"]})
        with TestClient(app) as fresh_client:
            self.assertEqual(fresh_client.get("/api/progress").json(), {"unlocked": {"05": self.doc}})
            self.assertEqual(fresh_client.get("/api/files/05/image").status_code, 200)

    def test_reset_clears_saved_progress_and_relocks_images(self):
        self.client.post("/api/unlock", json={"fileId": "05", "answer": "TEST"})
        self.assertEqual(self.client.post("/api/progress/reset").json(), {"ok": True})
        self.assertEqual(self.client.get("/api/progress").json(), {"unlocked": {}})
        self.assertEqual(self.client.get("/api/files/05/image").status_code, 403)

    def test_preview_does_not_change_progress_and_can_be_disabled(self):
        with patch("server.main.ALLOW_TEST_PREVIEW", True):
            self.assertEqual(self.client.get("/api/files/05/image?preview=true").status_code, 200)
        self.assertEqual(self.client.get("/api/progress").json(), {"unlocked": {}})
        self.assertEqual(self.client.get("/api/files/05/image").status_code, 403)
        with patch("server.main.ALLOW_TEST_PREVIEW", False):
            self.assertEqual(self.client.get("/api/files/05/image?preview=true").status_code, 403)

    def test_corrupt_progress_does_not_grant_access(self):
        self.progress_path.write_text("not JSON")
        self.assertEqual(self.client.get("/api/progress").status_code, 503)
        self.assertEqual(self.client.get("/api/files/05/image").status_code, 503)

    def test_locked_image_missing_after_unlock(self):
        self.client.post("/api/unlock", json={"fileId": "05", "answer": "TEST"})
        with patch("server.main.Path.is_file", return_value=False):
            self.assertEqual(self.client.get("/api/files/05/image").status_code, 404)

    def test_notebook_first_load_has_no_saved_text(self):
        self.assertEqual(self.client.get("/api/notes").json(), {"text": None})

    def test_notebook_saves_and_loads_from_a_new_client(self):
        text = "Margaret's story\nCompare the times. 💎"
        self.assertEqual(self.client.put("/api/notes", json={"text": text}).json(), {"ok": True})
        with TestClient(app) as new_client:
            self.assertEqual(new_client.get("/api/notes").json(), {"text": text})

    def test_notebook_replaces_text_and_can_be_cleared(self):
        for text in ("First draft", "Updated notes", ""):
            self.assertEqual(self.client.put("/api/notes", json={"text": text}).status_code, 200)
            self.assertEqual(self.client.get("/api/notes").json(), {"text": text})

    def test_notebook_treats_sql_as_text(self):
        text = "'); DROP TABLE notebook; --"
        self.client.put("/api/notes", json={"text": text})
        self.assertEqual(self.client.get("/api/notes").json(), {"text": text})

    def test_notebook_rejects_invalid_requests(self):
        for body in ({}, {"text": 42}, {"text": "x" * 100001}):
            self.assertEqual(self.client.put("/api/notes", json=body).status_code, 422)

    def test_notebook_database_failure_is_reported(self):
        with patch("server.main.open_database", side_effect=OSError):
            self.assertEqual(self.client.get("/api/notes").status_code, 503)
            self.assertEqual(self.client.put("/api/notes", json={"text": "keep this"}).status_code, 503)

    def test_restart_clears_notebook(self):
        self.client.put("/api/notes", json={"text": "old notes"})
        self.client.post("/api/progress/reset")
        self.assertEqual(self.client.get("/api/notes").json(), {"text": ""})

    def test_frontend_can_send_put_requests(self):
        response = self.client.options("/api/notes", headers={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "content-type",
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("PUT", response.headers["access-control-allow-methods"])


if __name__ == "__main__":
    unittest.main()
