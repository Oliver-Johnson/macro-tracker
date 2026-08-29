# Macro Sync Server

Flask-based sync server that bridges the Macrolog PWA with local fitness agents.

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

The server runs on `http://localhost:5000` by default.

## Authentication

Set the `SYNC_API_KEY` environment variable to require Bearer-token auth:

```bash
SYNC_API_KEY=your-secret-key python server.py
```

In Macrolog Settings → Sync Server, enter your server URL and the same API key.

## Exposing via tunnel (optional)

Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or similar to expose the server to your PWA if accessing from a different device.
