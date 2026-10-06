# Macrolog

A free, mobile-first progressive web app (PWA) for tracking daily calories and macronutrients. No account, no ads, no app store: install it straight from the browser.

**Live app:** https://macroslog.co.uk/
**Beta channel:** https://beta.macroslog.co.uk/ (new features land here first)
**Docs:** https://macroslog.co.uk/docs/

---

## Features

| Feature | Detail |
|---|---|
| Barcode scanning | Camera scan, Open Food Facts lookup, log by weight |
| Food search | Open Food Facts and USDA FoodData Central |
| Nutrition label scanning | Photograph a label and the values are read with on-device OCR |
| Custom foods and quick add | Save your own foods, or log raw macros |
| Recipes | Build from ingredients, log by weight or portion |
| Today dashboard | Calories ring, protein, carbs, fat and fibre against your targets, plus a sugar limit |
| Water, exercise, weight and notes | Daily cards on the Today page |
| History and trends | Calendar of past days, trend charts and a macro history view |
| Fasting | Intermittent fasting timer with presets |
| Setup wizard | Suggests targets from your stats, activity, goal and diet type |
| Appearance | Dark, light or auto, plus which tabs and Today sections to show |
| Offline | The service worker caches the app and food lookups |
| Your data | JSON export and import, CSV exports of food and weight logs |

### Developer features (opt-in)

Turn on **Settings → Data → Developer Mode** to show:

- **Sync server:** a small self-hosted Flask server (`sync-server/`) that keeps a copy of your log. See [the developer docs](https://macroslog.co.uk/docs/developer.html).
- **AI features:** describe a meal in words to log it, plus daily and weekly summaries, using your own Claude, Gemini or OpenAI key. The key stays on your device and requests go straight to the provider.

---

## Installing as a PWA

On **iOS (Safari):** Share → Add to Home Screen.
On **Android (Chrome):** browser menu → Install app.

The app launches full screen with no browser chrome.

---

## Targets

On first launch the setup wizard suggests targets. Until then the defaults are 2500 kcal, 60 g protein, 310 g carbs, 85 g fat, 30 g fibre and a 60 g sugar limit. Change them any time from the Today page or Settings.

---

## Storage

All data lives in the browser's `localStorage`. There is no server copy unless you run your own sync server, so use **Settings → Data → Export JSON** to back up or move your data.

---

## Tech stack

- Plain HTML, CSS and JavaScript in a single `index.html`: no npm dependencies, no build step
- Service worker (`sw.js`) for offline use and installation
- [Open Food Facts](https://world.openfoodfacts.org/) and [USDA FoodData Central](https://fdc.nal.usda.gov/) for food data, no API key needed
- [ZXing](https://github.com/zxing-js/library) for barcode decoding and [Tesseract.js](https://github.com/naptha/tesseract.js) for label OCR, both from CDNs
- Hosted on GitHub Pages

See [CONTRIBUTING.md](CONTRIBUTING.md) to get involved.

---

## License

Macrolog is free software under the [GNU General Public License v3.0 or later](LICENSE).

Food data from Open Food Facts is available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). USDA FoodData Central data is in the public domain.
