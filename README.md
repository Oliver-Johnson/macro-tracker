# Macro Tracker

A mobile-first progressive web app (PWA) for tracking daily calories and macronutrients. No account, no backend, no app store — install it directly from the browser.

**Live app:** https://oliver-johnson.github.io/macro-tracker/
**Docs:** https://oliver-johnson.github.io/macro-tracker/docs/

---

## Features

| Feature | Detail |
|---|---|
| Barcode scanning | Camera scan → Open Food Facts lookup → log with weight |
| Food search | Text search across millions of Open Food Facts products |
| Manual entry | Add custom foods to a personal local database |
| Recipe builder | Compose recipes from ingredients, log by weight or portion |
| Daily dashboard | Progress rings for kcal, protein, carbs, fat, and fibre vs targets |
| History | Browse any past day's food log |
| Offline support | Service worker caches the app and barcode lookups for offline use |
| Data export | Full JSON export of all logged data |

---

## Deploying (GitHub Pages)

Camera access requires HTTPS. GitHub Pages provides this for free.

1. Fork this repo.
2. In repo Settings → Pages → Source: `main` branch, root folder.
3. Your app will be live at `https://YOUR_USERNAME.github.io/macro-tracker/`.
4. If the repo name differs from `macro-tracker`, update `start_url` and `scope` in `manifest.json` to match.

### Running locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

> Note: barcode scanning (camera) requires HTTPS and won't work over plain HTTP on mobile.

---

## Installing as a PWA

On **iOS (Safari):** Share → Add to Home Screen.
On **Android (Chrome):** browser menu → Install app.

The app launches in full-screen standalone mode with no browser chrome.

---

## Default targets

| Macro | Default |
|---|---|
| Calories | 2750 kcal |
| Protein | 134 g |
| Carbs | 430 g |
| Fat | 55 g |

Adjust in the Settings tab. Changes are stored locally.

---

## Storage

All data lives in `localStorage` — no server, no account. Use **Settings → Export JSON** to back up or migrate your data.

---

## Tech stack

- Pure HTML + CSS + Vanilla JS — zero npm dependencies, no build step
- Service Worker for offline caching and PWA installation
- Web App Manifest for installability
- [Open Food Facts API](https://world.openfoodfacts.org/) — free, no API key required
- [ZXing JS](https://github.com/zxing-js/library) via unpkg for barcode decoding
- Hosted on GitHub Pages

---

## License

Data from Open Food Facts is available under [CC BY-SA](https://creativecommons.org/licenses/by-sa/3.0/).
