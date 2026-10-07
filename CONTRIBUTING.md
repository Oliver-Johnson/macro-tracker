# Contributing

Thanks for looking. Issues and pull requests are both welcome, and so is simply
telling me something looked wrong or didn't add up — that is harder to find out than
it sounds.

## The one thing that will trip you up

**`index.html` is the app and `docs/index.html` is the documentation site. Both are
single self-contained files.**

The app intentionally has no build step — it is a single-file PWA with no
dependencies. This is what makes it work offline and load instantly. If you are
making changes, edit `index.html` directly.

## Running the checks

There is no test suite yet. To try a change, serve the repo root with any static
server (for example `python3 -m http.server`) and open it in a browser. CI checks:

- the version string in `index.html` matches the cache name in `sw.js`
- `.nojekyll` is present, so GitHub Pages serves the site as is
- there are no broken symlinks
- there are no leftover merge conflict markers

Before submitting a PR, check that CI passes.

## What to contribute

- **Bug fixes** — something calculated wrong, a UI element that doesn't work, a PWA
  issue. Include steps to reproduce.
- **UX improvements** — the goal is a fast, reliable macro tracker that works offline.
  Anything that makes it clearer or faster is welcome.
- **Data corrections** — if a food entry has wrong macros, or a unit conversion is off.

## What is out of scope

- Server-side features the app depends on. Everything runs in the browser, with no
  account and no analytics, and that is a deliberate constraint. The self-hosted sync
  server and the bring-your-own-key AI features are opt-in extras behind Developer Mode,
  and the app must keep working fully without them.
- Integrations that need a key or account for core features.
- Framework migrations. The single-file architecture is intentional.

## Style

Match the surrounding code. Comments explain *why*, particularly where something
non-obvious has been done for a specific reason (PWA quirks, iOS Safari workarounds,
etc.).

Keep the file self-contained. The only external scripts are ZXing (barcodes) and
Tesseract.js (label OCR); please don't add more.
