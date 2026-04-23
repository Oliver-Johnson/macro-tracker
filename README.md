# Macro Tracker PWA

A mobile-first progressive web app for tracking daily macros and calories. Works offline, installable on iPhone/Android.

## Features

- **Barcode scan** — scan product barcodes via camera → Open Food Facts lookup → log with weight
- **Food search** — text search via Open Food Facts
- **Manual entry** — add custom foods to personal DB
- **Daily dashboard** — progress rings/bars for kcal, protein, carbs, fat vs targets
- **Recipe builder** — create recipes from ingredients, log by weight or portion
- **Offline caching** — barcode lookups cached locally after first scan
- **History** — view any past day's log
- **Data export** — JSON export of all data

## Running locally

```bash
# Requires HTTPS or localhost for camera access
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying (required for camera on mobile)

Camera access requires HTTPS. Options:

### GitHub Pages
1. Create a new repo on GitHub
2. Push this folder:
   ```bash
   git remote add origin https://github.com/YOUR_USER/macro-tracker.git
   git push -u origin main
   ```
3. In repo Settings → Pages → Source: main branch / root
4. App will be at `https://YOUR_USER.github.io/macro-tracker/`

### Cloudflare Pages
1. Connect your GitHub repo to Cloudflare Pages
2. No build command needed (static files)
3. Deploy — auto HTTPS

## Default targets

| Macro | Default |
|-------|---------|
| Calories | 2750 kcal |
| Protein | 134g |
| Carbs | 430g |
| Fat | 55g |

Change in Settings tab.

## Storage

All data is stored in `localStorage` — no server, no account needed. Use Settings → Export JSON to back up your data.

## Tech stack

- Pure HTML + CSS + Vanilla JS (no build step)
- ZXing JS for barcode scanning
- Open Food Facts API (free, no API key)
- Service Worker for offline support + PWA install
