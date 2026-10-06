# Macrolog — Project Instructions

## Overview
Macrolog (macroslog.co.uk) is a publicly used PWA for tracking daily calories and macronutrients. It is no longer a personal project — real users depend on it.

## Documentation (keep in sync)
- `docs/index.html` — main docs page with What's New section; update on every session
- `docs/changelog.html` — full reverse-chronological changelog; add an entry for every meaningful change
- Both pages are live at macroslog.co.uk/docs/

**Rule: whenever you commit changes to index.html or sw.js, update the What's New section and changelog before pushing.**

## Versioning
- Format: `Version YYYY-MM-DD.N` in index.html (~line 380) and matching `CACHE_NAME`/`APP_VERSION` in sw.js
- Bump the patch number (N) with every commit
- CI checks version consistency between index.html and sw.js — they must match

## Beta channel
- beta.macroslog.co.uk is built from the `beta` branch: `.github/workflows/publish-beta.yml` pushes the built site to the MacrosLog-beta repo, so never edit that repo by hand
- On `beta`, leave the version line alone; the publish stamps `Version <date>.<run>-beta` and applies the beta's CNAME and manifest from `.github/beta/`
- Fixes reach the beta by merging `master` into `beta`; beta features ship by merging `beta` (or cherry-picking) into `master`

## Data Safety
- The app stores all user data in localStorage — there is no server backup
- Never modify tour/demo data injection without verifying the full backup/restore cycle
- `clearTourDemoData()` must only be called when `TOUR_DEMO_KEY` is set
- `injectTourDemoData()` must only be called for new users with no existing data (`hasExistingUserData()`)

## Key files
- `index.html` — entire app (HTML + CSS + JS, single file)
- `sw.js` — service worker; CACHE_NAME and APP_VERSION must match index.html version
- `docs/index.html` — documentation page
- `docs/changelog.html` — changelog page
- `manifest.json` — PWA manifest
- `CNAME` — custom domain (macroslog.co.uk)
