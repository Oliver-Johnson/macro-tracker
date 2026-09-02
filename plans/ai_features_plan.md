# AI Features Implementation Plan — Macrolog

## 1. Codebase facts (verified)

**Single file:** `/workspace/macro-tracker/index.html` (6085 lines) — HTML + CSS + JS inline. `sw.js` = service worker.

**localStorage helper (line 1841):**
- `LS.get(k, def)` / `LS.set(k, v)` — JSON-wrapped. Raw `localStorage.getItem/setItem` also used for sync keys.

**Existing keys:** `mt_logs`, `mt_settings`, `mt_custom_foods`, `mt_recipes`, `mt_daily_targets`, `mt_weight_log`, `mt_water_log`, `mt_exercise_log`, `mt_if_settings`, `mt_if_log`, display prefs, plus `syncServerUrl` / `syncApiKey` (raw strings, NOT JSON-wrapped).

**Food entry shape** (from `addEntryToLog` / weight modal, line ~2904):
```js
{ id, name, weight, meal, kcal, protein, carbs, fat, fibre, sugar, sodium,
  per100kcal, per100protein, per100carbs, per100fat, barcode }
```
`sumEntries` (line 2237) only reads kcal/protein/carbs/fat/fibre/sugar.

**Add-to-log path:** `addEntryToLog(entry)` (line 2931) → `getDayLog(viewingDate).entries.push(entry)` → `saveDayLog`. Entries carry ABSOLUTE macro totals. The weight modal path multiplies per-100g × weight; AI returns whole-meal totals, so AI results should go straight through `addEntryToLog` (like Quick Add), NOT the weight modal.

**Meal selection:** `selectedMeal` global + `defaultMeal()` (by hour, line 2851).

**Log Food view** (line 717): tabs `scan / search / manual / quickadd` via `switchLogTab(tab, btn)` (line 2462). Tab bodies are `#log-<tab>` divs. Add a 5th tab here.

**Developer Mode** (line 1128): checkbox `#pref-admin-mode`, persisted by `saveDisplayPrefs()`; toggles visibility of the Sync card. `renderSettings()` (line 3344) populates fields. Sync helpers at 3455–3476 are the exact pattern to copy for AI config.

**Image picking:** `pickImageFile(useCamera)` (line 4025) returns a `File`. Convert with `FileReader.readAsDataURL` → strip `data:...;base64,` prefix.

**Modals/UI:** `openModal(id)` / `closeModal(id)` (3611), `toast(msg)` (3639). `renderToday()` at 2070; Today sections are pref-toggled (`pref-sec-today-*`) — natural home for the daily summary card.

**Version:** index.html line 1108 `Version 2026-08-29.22`; sw.js line 1–2 `CACHE_NAME`/`APP_VERSION = 2026-08-29.22`. → bump BOTH to **2026-08-29.23**.

---

## 2. New localStorage keys

| Key | Value |
|-----|-------|
| `mt_ai_enabled` | boolean |
| `mt_ai_provider` | `"claude"` \| `"gemini"` \| `"openai"` |
| `mt_ai_key` | string (API key) |
| `mt_ai_model` | string (optional override; default per provider) |
| `mt_ai_daily_summary` | `{ [dateKey]: { text, generatedAt } }` |
| `mt_ai_weekly_summary` | `{ [weekStartKey]: { text, generatedAt } }` |

Helpers: `aiEnabled()`, `getAIProvider()`, `getAIKey()`, `getAIModel()`, `saveAISettings()`.

---

## 3. Feature 1 — AI config in Developer Settings

**UI:** New card in Settings, shown only when Developer Mode is on. Place after the Sync card (~line 948).
- Toggle: "Enable AI features" (`#set-ai-enabled`)
- Select: Provider `#set-ai-provider` (Claude / Gemini / OpenAI)
- Password input: `#set-ai-key`
- Optional text: model override `#set-ai-model`
- Save button → `saveAISettings()`
- Caveat: "Your API key is stored on this device and sent directly to the provider from your browser."

---

## 4. Provider REST abstraction

`aiComplete({ system, userText, imageBase64, imageMime, schema })` → parsed JSON object.

### Claude — `POST https://api.anthropic.com/v1/messages`
Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`, **`anthropic-dangerous-direct-browser-access: true`**.
Default model: `claude-sonnet-4-5`.

### Gemini — `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<KEY>`
Use `responseMimeType: "application/json"` + `responseSchema` for native JSON enforcement.
Default model: `gemini-2.5-flash`.

### OpenAI — `POST https://api.openai.com/v1/chat/completions`
`response_format: { type: "json_object" }`. Default `gpt-4o-mini`. Vision hidden when using OpenAI (text-only).

**Shared JSON schema (meal estimate):**
```json
{
  "name": "string",
  "estimated_weight_g": "number",
  "kcal": "number",
  "protein_g": "number",
  "carbs_g": "number",
  "fat_g": "number",
  "fibre_g": "number",
  "sugar_g": "number",
  "confidence": "low|medium|high",
  "assumptions": "string"
}
```

---

## 5. Feature 2 — Meal description → macros (PRIMARY)

**UI:** New Log Food tab `✨ Describe` (tab key: `'ai'`, body `#log-ai`).
- Textarea `#ai-desc-input`
- Meal pills + "Estimate" button
- Helper: "More detail = more accurate. AI estimates are approximate."
- Results: editable review card (name, weight, kcal, P/C/F/fibre prefilled) + confidence badge + assumptions + **"Add to log"** button.

**System prompt:** "You are a nutrition estimator. Given a meal description, estimate total macros for the WHOLE portion described (not per 100g). Prefer UK food composition values. If quantity is vague, assume a typical single serving and state it in `assumptions`. Never omit fields."

**Entry built as:**
```js
addEntryToLog({ id: uid(), name, weight: estimated_weight_g, meal: selectedMeal,
  kcal, protein: protein_g, carbs: carbs_g, fat: fat_g, fibre: fibre_g,
  sugar: sugar_g||0, sodium: 0, per100kcal: null, per100protein: null,
  per100carbs: null, per100fat: null, barcode: null, source: 'ai' });
```

---

## 6. Feature 3 — Photo → macros (STRETCH)

Reuse `pickImageFile(true/false)` → `File` → base64. Button in `✨ Describe` tab: "📷 Estimate from photo". Downscale via canvas (cap ~1024px, `quality 0.8`) before base64 encode. Same schema + review card + add flow. Hide when provider = OpenAI.

---

## 7. Features 4 & 5 — Daily & weekly summaries

**Daily:** New Today card `🤖 AI Summary` (pref-gated). Shows cached `mt_ai_daily_summary[viewingDate]`. Button-triggered only (never auto-call on load).

Schema:
```json
{ "headline": "string", "wins": ["string"], "improvements": ["string"], "focus_tomorrow": "string" }
```

**Weekly:** On Trends view. Button "AI weekly review" → aggregate last 7 days vs targets.

Schema:
```json
{ "headline": "string", "patterns": ["string"], "recommendations": ["string"], "focus_next_week": "string" }
```

Both cached to avoid re-billing.

---

## 8. Security note

API key lives in localStorage, sent client-side directly to the provider. No backend proxy. Acceptable for personal/self-managed PWA. Recommend users create a restricted/limited-quota key. State plainly in settings card and docs.

---

## 9. Implementation order

1. AI config card + helpers + `saveAISettings`/`renderSettings` wiring
2. `aiComplete` dispatcher (Claude + Gemini; OpenAI optional)
3. Feature 2 — text → macros tab (highest value)
4. Feature 4 — daily summary card on Today
5. Feature 5 — weekly summary on Trends
6. Feature 3 — photo/vision (stretch, reuses everything)
7. Version bump index.html (line 1108) + sw.js to **2026-08-29.23**
8. Docs: What's New + changelog (required before push per CLAUDE.md)

---

## Critical File Locations

- `index.html`: Settings card ~948; Log tabs ~717; `switchLogTab` ~2462; `addEntryToLog` ~2931; `renderToday` ~2070; `renderSettings` ~3344; sync helpers ~3455–3476; `pickImageFile` ~4025; version line ~1108
- `sw.js`: version bump (must match index.html)
- `docs/index.html`: What's New section
- `docs/changelog.html`: changelog entry
