# Macro Sync Server

Flask-based sync server that keeps a copy of your Macrolog data on a machine you control.

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

- `POST /sync/food-log` saves the app's logs, recipes, custom foods and settings to `~/.claude/garmin-tools/food_log_export.json`, replacing the previous copy. Non-zero fibre, sugar and sodium values already on the server are kept.
- `GET /sync/food-log` returns that file. The app uses it to fill in missing fibre, sugar and sodium values.
- `POST /sync/targets` and `GET /sync/targets` store and return the day's targets in `~/.claude/garmin-tools/macro_targets.json`. The app applies them when their `date` is today.
- `GET /health` returns `{"status": "ok"}`.

## Authentication

Set the `SYNC_API_KEY` environment variable to require Bearer-token auth:

```bash
SYNC_API_KEY=your-secret-key python server.py
```

In Macrolog, turn on Developer Mode at the bottom of Settings, then enter your server URL and the same API key in Settings → Sync Server.

## Exposing via tunnel (optional)

Macrolog is served over HTTPS, so browsers block it from calling a plain `http://` server on another machine. Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or a reverse proxy with a certificate to give the server an HTTPS address:

```bash
cloudflared tunnel --url http://localhost:5001
```
