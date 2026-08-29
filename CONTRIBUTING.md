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

There is no test suite to run locally. CI validates:

- `index.html` and `docs/index.html` are valid HTML (via `htmlhint`)
- `manifest.json` is valid JSON
- the version string in `index.html` matches the cache name in `sw.js`

Before submitting a PR, verify those things pass by checking the CI output.

## What to contribute

- **Bug fixes** — something calculated wrong, a UI element that doesn't work, a PWA
  issue. Include steps to reproduce.
- **UX improvements** — the goal is a fast, reliable macro tracker that works offline.
  Anything that makes it clearer or faster is welcome.
- **Data corrections** — if a food entry has wrong macros, or a unit conversion is off.

## What is out of scope

- Server-side features. Everything runs in the browser. There is no server, no account
  and no analytics — that is a deliberate constraint.
- Third-party API integrations that require keys or accounts.
- Framework migrations. The single-file architecture is intentional.

## Style

Match the surrounding code. Comments explain *why*, particularly where something
non-obvious has been done for a specific reason (PWA quirks, iOS Safari workarounds,
etc.).

Keep the file self-contained. Do not add external script or style dependencies.
