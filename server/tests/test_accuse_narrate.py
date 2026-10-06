"""Sessions, config, the final report and narration (ElevenLabs), using fake solutions and mock HTTP transports."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from server import accuse as accuse_logic
from server import narrate as narrate_logic
from server.main import app

SOLUTION = {
    "culprit": "mw",
    "claims": {
        "opportunity": {"best": ["04"], "ok": []},
        "falseAlibi": {"best": ["04"], "ok": ["02"]},
        "replica": {"best": ["06"], "ok": ["05"]},
    },
    "chain": ["step one", "step two"],
    "rubric": "SECRET RUBRIC TEXT",
}
WIN = {"culprit": "mw", "evidence": ["04", "02", "06"]}


class Base(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        case = Path(self.temp.name) / "case.json"
        doc = {"id": "04", "heading": "x", "sub": [], "blocks": []}
        case.write_text(json.dumps({
            "answers": {i: "TEST" for i in ("04", "05", "06")},
            "files": {i: {**doc, "id": i} for i in ("04", "05", "06")},
            "solution": SOLUTION,
            "devScenarios": [{"label": "x"}],
        }))
        for target, value in (("server.main.CASE_PATH", case), ("server.main.DATABASE_PATH", Path(self.temp.name) / "g.sqlite3")):
            p = patch(target, value)
            p.start()
            self.addCleanup(p.stop)
        env = patch.dict("os.environ", {
            "GEMINI_API_KEY": "", "ELEVEN_LABS_API_KEY": "",
            "DATABASE_URL": "", "POSTGRES_URL": "", "UNSOLVED_CASE_JSON": "",
        })
        env.start()
        self.addCleanup(env.stop)
        accuse_logic._hits.clear()
        narrate_logic._hits.clear()
        narrate_logic._cache.clear()
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.addCleanup(lambda: setattr(app.state, "http_transport", None))

    def mock_http(self, handler):
        app.state.http_transport = httpx.MockTransport(handler)


class SessionTests(Base):
    def test_each_browser_gets_its_own_game(self):
        self.client.post("/api/unlock", json={"fileId": "05", "answer": "TEST"})
        self.client.put("/api/notes", json={"text": "mine"})
        with TestClient(app) as other:
            self.assertEqual(other.get("/api/progress").json(), {"unlocked": {}})
            self.assertEqual(other.get("/api/notes").json(), {"text": None})
            self.assertEqual(other.get("/api/files/05/image").status_code, 403)
            other.post("/api/progress/reset")
        # resetting another player's game does not touch mine
        self.assertEqual(list(self.client.get("/api/progress").json()["unlocked"]), ["05"])
        self.assertEqual(self.client.get("/api/notes").json(), {"text": "mine"})

    def test_cookie_is_opaque_http_only_and_not_forgeable(self):
        response = self.client.get("/api/health")
        header = response.headers["set-cookie"]
        self.assertIn("uid=", header)
        self.assertIn("HttpOnly", header)
        self.assertIn("SameSite=lax", header)
        with TestClient(app, cookies={"uid": "../../etc/passwd"}) as forged:
            self.assertEqual(forged.get("/api/progress").json(), {"unlocked": {}})
            self.assertNotIn("passwd", forged.get("/api/health").headers.get("set-cookie", "") or "x")

    def test_secure_cookie_behind_https_proxy(self):
        response = self.client.get("/api/health", headers={"x-forwarded-proto": "https"})
        self.assertIn("Secure", response.headers["set-cookie"])


class SampleCaseTests(Base):
    def test_missing_case_file_fails_loudly_by_default(self):
        Path(self.temp.name, "case.json").unlink()
        self.assertEqual(self.client.post("/api/unlock", json={"fileId": "05", "answer": "SAMPLE"}).status_code, 503)
        self.assertEqual(self.client.post("/api/accuse", json=WIN).status_code, 503)

    def test_sample_case_is_used_only_when_explicitly_allowed(self):
        Path(self.temp.name, "case.json").unlink()
        with patch("server.main.ALLOW_SAMPLE", True):
            ok = self.client.post("/api/unlock", json={"fileId": "05", "answer": "sample"}).json()
            self.assertTrue(ok["ok"])
            self.assertEqual(ok["file"]["id"], "05")
            bad = self.client.post("/api/unlock", json={"fileId": "05", "answer": "nope"}).json()
            self.assertFalse(bad["ok"])
            report = self.client.post("/api/accuse", json={"culprit": "bm", "evidence": ["06", "05", "04"]}).json()
            self.assertEqual(report["verdict"], "solved")
            self.assertIn("SAMPLE", report["explanation"][0])

    def test_real_file_always_wins_over_the_sample(self):
        with patch("server.main.ALLOW_SAMPLE", True):
            self.assertTrue(self.client.post("/api/unlock", json={"fileId": "05", "answer": "TEST"}).json()["ok"])
            self.assertFalse(self.client.post("/api/unlock", json={"fileId": "05", "answer": "SAMPLE"}).json()["ok"])

    def test_sample_file_contains_only_fake_content(self):
        text = (Path(__file__).parents[1] / "sample" / "case-sample.json").read_text()
        for real_secret in ("NIGHTINGALE", "ENIGMA", "R4821", "7316", "Margaret Wood"):
            self.assertNotIn(real_secret, text)
        # The sample must not mirror the real solution (culprit id or which records prove which claim).
        sample = json.loads(text)["solution"]
        self.assertNotEqual(sample["culprit"], "mw")
        self.assertNotEqual(sample["claims"]["opportunity"]["best"], ["04"])


class ConfigTests(Base):
    def test_flags_follow_the_keys(self):
        self.assertEqual(self.client.get("/api/config").json(), {"features": {"narration": False}})
        with patch.dict("os.environ", {"ELEVEN_LABS_API_KEY": "k"}):
            self.assertEqual(self.client.get("/api/config").json(), {"features": {"narration": True}})

    def test_developer_routes_do_not_exist_in_production(self):
        for path in ("/api/dev/status", "/api/dev/files", "/api/dev/scenarios"):
            self.assertEqual(self.client.get(path).status_code, 404, path)
        self.assertGreaterEqual(self.client.post("/api/dev/relock", json={"id": "04"}).status_code, 400)


class AccuseTests(Base):
    def test_solved_report_is_explained(self):
        r = self.client.post("/api/accuse", json=WIN).json()
        self.assertEqual((r["verdict"], r["culprit"], r["explanation"], r["rating"]), ("solved", "mw", ["step one", "step two"], "Case solved"))
        self.assertNotIn("theory", r)
        self.assertNotIn("score", r)

    def test_acceptable_evidence_still_solves(self):
        r = self.client.post("/api/accuse", json={**WIN, "evidence": ["04", "05"]}).json()
        self.assertEqual(r["verdict"], "solved")

    def test_wrong_culprit_is_final_and_reveals_the_truth(self):
        r = self.client.post("/api/accuse", json={**WIN, "culprit": "nb"}).json()
        self.assertEqual((r["verdict"], r["culprit"], r["rating"]), ("incorrect", "mw", "Case unsolved"))
        self.assertEqual(r["explanation"], ["step one", "step two"])

    def test_right_culprit_wrong_records_is_partial(self):
        r = self.client.post("/api/accuse", json={**WIN, "evidence": ["01", "05"]}).json()
        self.assertEqual((r["verdict"], r["rating"]), ("partial", "Right suspect, thin case"))

    def test_at_most_three_records_count_and_duplicates_are_ignored(self):
        r = self.client.post("/api/accuse", json={**WIN, "evidence": ["01", "01", "05", "02", "04", "06"]}).json()
        self.assertEqual(r["verdict"], "partial")  # 04 and 06 fall beyond the third distinct record (01, 05, 02)

    def test_empty_report_only_allowed_when_time_ran_out(self):
        self.assertEqual(self.client.post("/api/accuse", json={}).status_code, 400)
        r = self.client.post("/api/accuse", json={"timedOut": True}).json()
        self.assertEqual((r["verdict"], r["rating"]), ("incorrect", "Out of time"))

    def test_invalid_requests_are_rejected(self):
        for body in ({"culprit": "mw", "evidence": "04"}, {"culprit": "x" * 20}):
            self.assertEqual(self.client.post("/api/accuse", json=body).status_code, 422)

    def test_missing_solution_is_a_503(self):
        with patch("server.main.load_case", return_value={"files": {}}):
            self.assertEqual(self.client.post("/api/accuse", json=WIN).status_code, 503)

    def test_reports_are_rate_limited(self):
        statuses = [self.client.post("/api/accuse", json=WIN).status_code for _ in range(14)]
        self.assertEqual(statuses[:12], [200] * 12)
        self.assertEqual(statuses[12:], [429, 429])


class NarrateTests(Base):
    def say(self, text, speaker="mw"):
        return self.client.post("/api/narrate", json={"speaker": speaker, "text": text})

    def test_not_configured_is_a_503(self):
        r = self.say("hello")
        self.assertEqual((r.status_code, r.json()), (503, {"error": "Narration is not configured on this server."}))

    def test_every_character_has_their_own_voice(self):
        voices = narrate_logic.speakers()
        self.assertEqual(set(voices), {"mw", "nb", "aw", "bm", "ow", "lj", "supervisor", "friend"})
        self.assertEqual(len({v["voice"] for v in voices.values()}), 8)
        for entry in voices.values():
            self.assertRegex(entry["voice"], r"^[A-Za-z0-9]{20}$")

    def test_unknown_or_missing_speaker_is_refused_before_anything_else(self):
        for speaker in ("", "narrator", "../etc", "MW"):
            self.assertEqual(self.say("hello", speaker).status_code, 400, speaker)

    def test_each_speaker_gets_their_own_voice_and_audio_is_cached_per_voice(self):
        calls = []

        def handler(request):
            calls.append(request)
            return httpx.Response(200, content=b"\x01\x02\x03")

        self.mock_http(handler)
        voices = narrate_logic.speakers()
        with patch.dict("os.environ", {"ELEVEN_LABS_API_KEY": "k"}):
            first = self.say("Hello   detective.", "mw")
            again = self.say("Hello detective.", "mw")
            other = self.say("Hello detective.", "nb")
        self.assertEqual((first.status_code, first.headers["content-type"], first.content), (200, "audio/mpeg", b"\x01\x02\x03"))
        self.assertEqual(again.content, b"\x01\x02\x03")
        self.assertEqual(len(calls), 2)  # mw cached on the repeat; nb is a different voice, so a new request
        self.assertIn(f"/v1/text-to-speech/{voices['mw']['voice']}", str(calls[0].url))
        self.assertIn(f"/v1/text-to-speech/{voices['nb']['voice']}", str(calls[1].url))
        self.assertEqual(calls[0].headers["xi-api-key"], "k")
        self.assertEqual(json.loads(calls[0].content), {"text": "Hello detective.", "model_id": "eleven_multilingual_v2"})

    def test_voice_can_be_overridden_per_speaker_by_env(self):
        seen = []
        self.mock_http(lambda request: seen.append(str(request.url)) or httpx.Response(200, content=b"a"))
        with patch.dict("os.environ", {"ELEVEN_LABS_API_KEY": "k", "ELEVEN_LABS_VOICE_MW": "OVERRIDEVOICEID0000000"}):
            self.say("hi", "mw")
        self.assertIn("OVERRIDEVOICEID0000000", seen[0])

    def test_validation_and_upstream_errors(self):
        with patch.dict("os.environ", {"ELEVEN_LABS_API_KEY": "k"}):
            self.assertEqual(self.say("  ").status_code, 400)
            self.assertEqual(self.say("x" * 2501).status_code, 413)
            self.mock_http(lambda request: httpx.Response(500, text="boom"))
            self.assertEqual(self.say("fails").status_code, 502)
            self.mock_http(lambda request: (_ for _ in ()).throw(httpx.ConnectError("down")))
            self.assertEqual(self.say("also fails").status_code, 502)

    def test_rate_limited(self):
        self.mock_http(lambda request: httpx.Response(200, content=b"a"))
        with patch.dict("os.environ", {"ELEVEN_LABS_API_KEY": "k"}):
            codes = [self.say(f"line {i}").status_code for i in range(45)]
        self.assertEqual(codes[39], 200)
        self.assertEqual(codes[-1], 429)

    def test_dev_voice_check_copes_with_a_key_that_cannot_read_voices(self):
        import asyncio

        async def run():
            self.mock_http(lambda request: httpx.Response(401, json={"detail": "missing_permissions"}))
            with patch.dict("os.environ", {"ELEVEN_LABS_API_KEY": "k"}):
                return await narrate_logic.describe_voices(app.state.http_transport)

        rows = asyncio.run(run())
        self.assertNotIn("error", rows[0])
        self.assertIn("can still be played", rows[0]["note"])

    def test_dev_voice_check_reports_name_gender_and_accent(self):
        async def run():
            self.mock_http(lambda request: httpx.Response(200, json={"name": "Test Voice", "category": "shared", "labels": {"gender": "female", "accent": "british"}}))
            with patch.dict("os.environ", {"ELEVEN_LABS_API_KEY": "k"}):
                return await narrate_logic.describe_voices(app.state.http_transport)

        import asyncio

        rows = asyncio.run(run())
        self.assertEqual(len(rows), 8)
        self.assertEqual((rows[0]["name"], rows[0]["gender"], rows[0]["accent"]), ("Test Voice", "female", "british"))


if __name__ == "__main__":
    unittest.main()
