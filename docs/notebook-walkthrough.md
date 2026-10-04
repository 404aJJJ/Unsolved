# Follow one notebook save

Open the game, open Notes, write a sentence, and click **Save notes**. Refresh
the game and reopen Notes: the saved sentence comes back from Python and SQLite.
This example uses an explicit Save button so you can see when a request happens.
After editing, wait for **Saved** before refreshing. Older browser-only notes are
kept when the database has never had a notebook saved yet.

## What lives where?

- `web/src/apps/Apps.tsx`: the notebook textarea and Save button.
- `web/src/api/client.ts`: the functions that send HTTP requests.
- `server/main.py`: the Python endpoints and SQL statements.
- `server/private/game.sqlite3`: the database file, created on first use.

SQLite is included with Python as `sqlite3`; no new package needs installing.
The database file is ignored by Git because it contains your local game data.
Images still live in `server/assets`. Only the notebook uses SQLite for now.

## Step 1: the frontend sends text

The Save button calls `save`, which calls `saveNotes(notes)`.
`notes` is the current text from the textarea.

In `client.ts`:

```ts
const res = await fetch(`${BASE}/api/notes`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text }),
  signal: AbortSignal.timeout(10000),
})
```

- `fetch` sends an HTTP request.
- `await` waits for the response without freezing the page.
- `BASE` is your Python server's address, currently `http://localhost:8000`.
- `PUT` means replace the notebook with the text you send.
- `headers` tells Python that the body contains JSON.
- `{ text }` is shorthand for `{ text: text }`, such as `{ text: "Check the times" }`.
- `JSON.stringify` turns that JavaScript object into JSON text for the request.
- The timeout stops waiting after ten seconds if the server doesn't respond.
- `res.ok` checks whether the response has a successful HTTP status.

## Step 2: Python receives it

```python
class NotesRequest(BaseModel):
    text: str = Field(max_length=100000)
```

This describes the expected JSON. It must contain a `text` value that is a string,
up to 100,000 characters. Invalid input is rejected before your endpoint runs.

```python
@app.put("/api/notes")
def update_notes(request: NotesRequest):
```

The decorator connects PUT requests at this URL to this function.
FastAPI turns the incoming JSON into `request`. `request.text` is the sentence.
The function calls `save_notes(request.text)` and returns `{"ok": True}` when the
save succeeds. FastAPI converts that dictionary into a JSON response.
If the database fails, Python returns HTTP 503 instead of pretending it saved.

## Step 3: open the database

```python
DATABASE_PATH = Path(__file__).parent / "private" / "game.sqlite3"
```

Start in the folder containing `main.py`, then go into `private`, then locate
`game.sqlite3`. This is a filesystem path, not an API URL.

`open_database()` makes the parent folder if needed, then calls
`sqlite3.connect(DATABASE_PATH)`. That opens the database; SQLite creates the file
if it doesn't exist. The function executes:

```sql
CREATE TABLE IF NOT EXISTS notebook (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    text TEXT NOT NULL
)
```

`CREATE TABLE` defines the table. `IF NOT EXISTS` lets the function run again
without failing when the table already exists. `id` identifies the row. We use
one row with ID 1 because this starter has one shared notebook. The `CHECK`
enforces that rule. `text` holds the writing, and `NOT NULL` means it must have a
value; an empty string is allowed.

## Step 4: save the sentence

```python
connection.execute("""
    INSERT INTO notebook (id, text) VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET text = excluded.text
""", (text,))
```

`execute` runs SQL. Triple quotes allow a multiline Python string.
`INSERT` creates row 1 on your first save. `ON CONFLICT` updates that same row if
it already exists. `excluded.text` means the new text you tried to insert.

The `?` is a placeholder. `(text,)` supplies its value separately: the comma
makes this a one-item tuple. This keeps quotes and other characters in your notes
as data, rather than treating them as SQL instructions.

`with connection:` commits the change when the block succeeds, or rolls it back
if it fails. `with closing(...)` closes the connection when the work finishes.
They do different jobs: save the transaction, then release the connection.

## Step 5: load the sentence again

Opening Notes calls `getNotes()` in the frontend, which sends a GET request to
the same URL. GET and PUT have different functions even though the URL matches.
Python runs:

```python
row = connection.execute("SELECT text FROM notebook WHERE id = 1").fetchone()
```

`SELECT` reads the text in row 1. `fetchone()` retrieves one result, and `row[0]`
gets its first column. Python returns `{"text": "your sentence"}`. The frontend
reads `.text` from the JSON response and puts it into the textarea.

If no notebook has ever been saved, the response is `{"text": null}`. This lets
the frontend preserve your old browser notes instead of replacing them with an
empty notebook. Saving an empty notebook produces `{"text": ""}` instead.

## Other behavior

Restart case clears the saved notebook too. Notes show Loading, Unsaved changes,
Saving, or Saved, and display an error if Python cannot load or save. Your draft
remains visible after a save failure. The timer, suspect-card notes, and attempts
still use browser storage; unlocked-file IDs still use `progress.json`.
