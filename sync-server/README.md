# Macro Sync Server

Flask-based sync server that keeps your Macrolog data on a machine you control and syncs it between your devices.

## Requirements

- Python 3.8+
- `flask`
- `flask-cors`

Install dependencies:

```bash
pip install flask flask-cors
```

## Running

```bash
cd sync-server
python server.py
```

The server runs on `http://localhost:5001` by default.

## What it stores

Everything the app syncs is kept in `~/.claude/garmin-tools/food_log_export.json`: food logs and notes, recipes, custom foods, settings, daily targets, weight, water, exercise and fasting.

- `GET /sync/state` returns `{"rev": ..., "data": ...}`. `rev` is a hash of the file's contents, so it also changes when something edits the file directly. With `?rev=<rev>` it returns `{"unchanged": true}` instead of the data when nothing changed.
- `PUT /sync/state` with `{"baseRev": ..., "data": ...}` replaces the data and returns the new `rev`. If the file changed since `baseRev` it returns 409 and the app merges again. Top-level keys the app doesn't use are kept. Writes are atomic.
- `GET /sync/food-log` returns the same file, for scripts that read it.
- `POST /sync/food-log` is the one-way upload used by app versions before two-way sync. Non-zero fibre, sugar and sodium already on the server are kept. Once a device has used two-way sync it returns 409, so an outdated app can't overwrite other devices' changes.
- `POST /sync/targets` and `GET /sync/targets` store and return the day's targets in `~/.claude/garmin-tools/macro_targets.json`. The app applies them when their `date` is today.
- `GET /health` returns `{"status": "ok"}`.

## Authentication

Set the `SYNC_API_KEY` environment variable to require Bearer-token auth:

```bash
SYNC_API_KEY=your-secret-key python server.py
```

In Macrolog, turn on Developer Mode at the bottom of Settings, then enter your server URL and the same API key in Settings → Sync Server. Do the same on each device you want to keep in sync.

## How the app merges

Each device remembers a fingerprint of every record from its last sync. When it syncs, it fetches the server's copy and merges record by record: a side whose record still matches the fingerprint didn't change it, so the other side's version (or deletion) wins. If both sides changed the same record, the syncing device's edit wins and an edit beats a delete; water added on two devices on the same day is summed, and a day's targets that a device filled in from its settings when it opened (marked `auto`) give way to targets someone set. A sync that would delete more than a fifth of either side (and more than 10 records) waits for the user to confirm, and nothing syncs while the app's tour demo data is showing.

## Tests

```bash
pip install flask flask-cors
python -m unittest sync-server/test_server.py
```

## Exposing via tunnel (optional)

Macrolog is served over HTTPS, so browsers block it from calling a plain `http://` server on another machine. Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or a reverse proxy with a certificate to give the server an HTTPS address:

```bash
cloudflared tunnel --url http://localhost:5001
```
