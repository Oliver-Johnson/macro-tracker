# Macrolog — Selectable UI Themes: Implementation Plan (v2026-09-02.1)

## 0. Core architectural decision (READ FIRST)
The existing dark/light/auto system uses classes `theme-dark|theme-light|theme-auto` on `<html>`, managed by `applyTheme()` which REMOVES all three and ADDS one. If the 3 new visual themes reused the `theme-*` namespace they'd be mutually exclusive with light mode and could NOT "layer on top of dark/light."

**Therefore the 3 visual themes are a SEPARATE, ORTHOGONAL axis: classes `style-bold|style-gradient|style-zen` (and "current" = no style class), persisted under `localStorage['mt_style']`.** Both axes coexist on `<html>`, e.g. `<html class="theme-light style-gradient">`. CSS combines them: base rule `html.style-gradient{...}` (dark), light override `html.style-gradient.theme-light{...}`, and auto-light `@media (prefers-color-scheme: light){ html.style-gradient.theme-auto{...} }` (mirrors the existing pattern at index.html:40-49).

## 1. New JS: style axis (add after line 4675, next to applyTheme/setTheme)
```js
// ─── Visual style (current / bold / gradient / zen) — orthogonal to dark/light ───
function applyStyle(style) {
  style = style || 'current';
  document.documentElement.classList.remove('style-bold','style-gradient','style-zen');
  if (style !== 'current') document.documentElement.classList.add('style-' + style);
  ['current','bold','gradient','zen'].forEach(s => {
    const b = document.getElementById('style-btn-' + s);
    if (b) { b.className = s === style ? 'btn btn-primary' : 'btn btn-secondary'; b.style.flex='1'; b.style.fontSize='12px'; }
  });
}
function setStyle(style) { localStorage.setItem('mt_style', style); applyStyle(style); }
applyStyle(localStorage.getItem('mt_style') || 'current');
```

## 2. Theme selector UI (add after the Theme row, between line 1075 `</div>` and line 1077 `<div class="settings-section-title">Navigation Tabs`)
```html
<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border);">
  <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Style</div>
  <div style="display:flex;gap:8px;">
    <button id="style-btn-current"  class="btn btn-primary"   style="flex:1;font-size:12px;" onclick="setStyle('current')">Current</button>
    <button id="style-btn-bold"     class="btn btn-secondary" style="flex:1;font-size:12px;" onclick="setStyle('bold')">Bold</button>
    <button id="style-btn-gradient" class="btn btn-secondary" style="flex:1;font-size:12px;" onclick="setStyle('gradient')">Gradient</button>
    <button id="style-btn-zen"      class="btn btn-secondary" style="flex:1;font-size:12px;" onclick="setStyle('zen')">Zen</button>
  </div>
</div>
```

## 3. Structural HTML additions to the Today hero
### 3a. Add id to the ring row so Bold/Zen can hide it
index.html line 604: `<div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">` → add `id="today-ring-row"`.

### 3b. Add gradient `<defs>` inside the ring SVG (after the two `<circle>`s, i.e. after line 608, before `</svg>` line 609)
```html
<defs>
  <linearGradient id="kcalGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8c6eff"/><stop offset="1" stop-color="#5bd0c0"/>
  </linearGradient>
</defs>
```

### 3c. Add shared big-number block + Bold pills + Zen macro line INSIDE `#dashboard-card`, immediately after `<div class="card" id="dashboard-card" ...>` opening (line 603), before `#today-ring-row`
```html
<!-- Bold/Zen big calorie display (hidden unless style-bold/style-zen) -->
<div class="big-cal" aria-hidden="true">
  <div class="big-cal-kicker">Calories Today</div>
  <div class="big-cal-val" id="big-kcal-val">0</div>
  <div class="big-cal-sub">of <b id="big-kcal-goal">0</b> kcal · <b id="big-kcal-left">0</b> left</div>
</div>
<!-- Bold P/C/F pills (hidden unless style-bold) -->
<div class="bold-pills" aria-hidden="true" id="bold-pills"></div>
<!-- Zen one-line macro summary (hidden unless style-zen) -->
<div class="zen-macroline" aria-hidden="true" id="zen-macroline"></div>
```

### 3d. renderToday() population (add after the kcal-remaining line, ~line 2202). Runs always; CSS controls visibility — no theme branching in JS.
```js
// Shared big-number + bold pills + zen macro line (styled per theme via CSS)
const bcv = document.getElementById('big-kcal-val');
if (bcv) {
  bcv.textContent = Math.round(totals.kcal).toLocaleString();
  document.getElementById('big-kcal-goal').textContent = Math.round(s.kcal).toLocaleString();
  document.getElementById('big-kcal-left').textContent = Math.max(0, Math.round(s.kcal - totals.kcal)).toLocaleString();
  const pill = (cls,lbl,val,goal) => `<div class="bp ${cls}"><div class="bp-lbl">${lbl}</div><div class="bp-num">${r1(val)}g</div><div class="bp-goal">/ ${goal}g</div></div>`;
  document.getElementById('bold-pills').innerHTML =
    pill('p','Protein',totals.protein,s.protein) + pill('c','Carbs',totals.carbs,s.carbs) + pill('f','Fat',totals.fat,s.fat);
  document.getElementById('zen-macroline').innerHTML =
    `Protein <b>${r1(totals.protein)}g</b> <span class="sep">·</span> Carbs <b>${r1(totals.carbs)}g</b> <span class="sep">·</span> Fat <b>${r1(totals.fat)}g</b>`;
}
```

## 4. CSS blocks (add after the `@media prefers-color-scheme` block, ~line 49, or at end of `<style>`)
Defaults hide the new elements:
```css
.big-cal, .bold-pills, .zen-macroline { display:none; }
```

### 4a. GRADIENT (mostly CSS)
```css
html.style-gradient { --accent:#8c6eff; --accent2:#5bd0c0; --kcal:#8c6eff; }
html.style-gradient #app { background:linear-gradient(165deg,#2b2260 0%,#1e2a55 40%,#123f4d 100%); }
html.style-gradient .view, html.style-gradient nav { background:transparent; }
html.style-gradient .card, html.style-gradient .water-card, html.style-gradient .exercise-card {
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14);
  box-shadow:0 8px 30px rgba(0,0,0,.25); border-radius:20px;
}
html.style-gradient #kcal-ring { stroke:url(#kcalGrad); }
html.style-gradient nav { border-top:none; }
/* light variant */
html.style-gradient.theme-light #app { background:linear-gradient(165deg,#e6ddff 0%,#f0e2f5 40%,#ffe4d6 100%); }
html.style-gradient.theme-light .card, html.style-gradient.theme-light .water-card, html.style-gradient.theme-light .exercise-card {
  background:rgba(255,255,255,.5); border-color:rgba(255,255,255,.7); box-shadow:0 8px 30px rgba(150,120,180,.18);
}
@media (prefers-color-scheme: light) {
  html.style-gradient.theme-auto #app { background:linear-gradient(165deg,#e6ddff 0%,#f0e2f5 40%,#ffe4d6 100%); }
  html.style-gradient.theme-auto .card, html.style-gradient.theme-auto .water-card, html.style-gradient.theme-auto .exercise-card {
    background:rgba(255,255,255,.5); border-color:rgba(255,255,255,.7);
  }
}
```

### 4b. ZEN
```css
html.style-zen { --accent:#8ba888; --accent2:#8ba888; --bg:#111112; --bg2:#111112; --bg3:#1a1a1b; --border:#262627; --text:#f2f2f0; --muted:#7a7a78; --kcal:#8ba888; }
html.style-zen #today-ring-row, html.style-zen #macro-bars, html.style-zen .stat-chips,
html.style-zen .log-macros, html.style-zen .btn-icon, html.style-zen .meal-subtotal,
html.style-zen #dashboard-card .btn { display:none !important; }
html.style-zen #dashboard-card { background:none; border:none; padding:0; }
html.style-zen .big-cal { display:block; text-align:center; padding:40px 0 0; }
html.style-zen .big-cal-kicker { display:none; }
html.style-zen .big-cal-val { font-size:88px; font-weight:200; letter-spacing:-3px; line-height:1; color:var(--text); }
html.style-zen .big-cal-sub { font-size:15px; font-weight:300; color:var(--muted); margin-top:16px; }
html.style-zen .big-cal-sub b { font-weight:400; color:var(--text); }
html.style-zen .zen-macroline { display:block; text-align:center; padding:24px 30px 0; font-size:14px; font-weight:300; color:#b8b8b6; border-top:1px solid var(--border); margin:32px 20px 0; padding-top:28px; }
html.style-zen .zen-macroline b { font-weight:500; color:var(--text); }
html.style-zen .zen-macroline .sep { color:#4a4a48; margin:0 6px; }
html.style-zen #today-food-log-card { background:none; border:none; padding:0; margin-top:8px; }
html.style-zen .meal-header { font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); font-weight:400; }
html.style-zen .log-entry { border-bottom:1px solid var(--border); padding:16px 0; }
html.style-zen .log-name { font-weight:300; font-size:15px; }
html.style-zen .log-kcal { font-weight:400; color:var(--muted); }
/* light */
html.style-zen.theme-light { --bg:#ffffff; --bg2:#ffffff; --bg3:#f2f2f0; --border:#eaeae6; --text:#1a1a18; --muted:#8a8a88; --accent:#6f9270; --kcal:#6f9270; }
@media (prefers-color-scheme: light){ html.style-zen.theme-auto { --bg:#ffffff; --bg2:#ffffff; --bg3:#f2f2f0; --border:#eaeae6; --text:#1a1a18; --muted:#8a8a88; --accent:#6f9270; --kcal:#6f9270; } }
```

### 4c. BOLD
```css
html.style-bold { --accent:#c6ff3a; --accent2:#c6ff3a; --bg:#08090c; --bg2:#0f1014; --bg3:#15161b; --border:#16171b; --text:#f5f5f5; --muted:#5a5c63; --kcal:#c6ff3a; }
html.style-bold #today-ring-row, html.style-bold .stat-chips { display:none !important; }
html.style-bold #dashboard-card { background:none; border:none; padding:0; }
html.style-bold .big-cal { display:block; padding:6px 4px 0; }
html.style-bold .big-cal-kicker { font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
html.style-bold .big-cal-val { font-size:96px; font-weight:900; line-height:.9; letter-spacing:-4px; color:var(--accent); }
html.style-bold .big-cal-sub { font-size:18px; font-weight:700; color:var(--muted); margin-top:6px; }
html.style-bold .big-cal-sub b { color:var(--text); }
html.style-bold .bold-pills { display:flex; gap:10px; margin-top:22px; }
html.style-bold .bp { flex:1; border-radius:20px; padding:16px 12px; }
html.style-bold .bp-lbl { font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; opacity:.75; }
html.style-bold .bp-num { font-size:28px; font-weight:900; letter-spacing:-1.5px; margin-top:8px; line-height:1; }
html.style-bold .bp-goal { font-size:12px; font-weight:700; opacity:.7; margin-top:4px; }
html.style-bold .bp.p { background:#ff5c7a; color:#1a0308; }
html.style-bold .bp.c { background:#3a9bff; color:#02101f; }
html.style-bold .bp.f { background:#ffb03a; color:#1f1202; }
/* dense food rows */
html.style-bold #today-food-log-card { background:none; border:none; padding:0; }
html.style-bold .log-entry { padding:13px 0; border-bottom:1px solid var(--border); }
html.style-bold .log-name { font-weight:700; }
html.style-bold .log-kcal { font-size:18px; font-weight:900; color:var(--text); }
/* floating icon-only nav pill */
html.style-bold nav { position:fixed; bottom:calc(20px + var(--safe-bottom)); left:50%; transform:translateX(-50%); width:auto; border-top:none; background:#15161b; border:1px solid #24252c; border-radius:40px; padding:8px; gap:6px; box-shadow:0 12px 40px rgba(0,0,0,.6); font-size:0; }
html.style-bold nav button { padding:0; width:48px; height:48px; border-radius:30px; font-size:0; }
html.style-bold nav button.active { background:var(--accent); color:#08090c; }
html.style-bold #view-today, html.style-bold .view { padding-bottom:calc(96px + var(--safe-bottom)); }
/* light */
html.style-bold.theme-light { --accent:#5fbf00; --bg:#f7f7f4; --bg2:#ffffff; --bg3:#ebebe6; --border:#e6e6e0; --text:#0c0d10; --muted:#9a9c9f; --kcal:#5fbf00; }
html.style-bold.theme-light nav { background:#ffffff; border-color:#e6e6e0; box-shadow:0 12px 40px rgba(120,120,110,.22); }
html.style-bold.theme-light .bp.p, html.style-bold.theme-light .bp.c { color:#fff; }
@media (prefers-color-scheme: light){ html.style-bold.theme-auto { --accent:#5fbf00; --bg:#f7f7f4; --bg2:#ffffff; --bg3:#ebebe6; --border:#e6e6e0; --text:#0c0d10; --muted:#9a9c9f; --kcal:#5fbf00; } }
```

## 5. Optional: fonts
Add one combined link in `<head>` (after line 12):
```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;900&family=Inter:wght@200;300;400;500&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
```
```css
html.style-bold body { font-family:'Archivo',-apple-system,sans-serif; }
html.style-gradient body { font-family:'Manrope',-apple-system,sans-serif; }
html.style-zen body { font-family:'Inter',-apple-system,sans-serif; }
```
Trade-off: external network dependency on offline-first PWA. `display=swap` degrades gracefully. RECOMMEND shipping it.

## 6. Dark/light interaction summary
Two independent axes: `mt_theme` (dark/light/auto) and `mt_style` (current/bold/gradient/zen). Classes never collide. Every style theme ships: base = dark values; `.theme-light` override; `@media prefers light + .theme-auto` override.

## 7. Version bump → 2026-09-02.1
- index.html: `Version 2026-08-31.1` → `Version 2026-09-02.1`
- sw.js line 1: `const CACHE_NAME = 'macro-tracker-2026-09-02.1';`
- sw.js line 2: `const APP_VERSION = '2026-09-02.1';`

## 8. Files to update
1. `index.html` — CSS blocks, big-cal/pills/macroline HTML, ring `<defs>` + `id="today-ring-row"`, Style selector row, applyStyle/setStyle JS, renderToday population, version string, optional font link
2. `sw.js` — CACHE_NAME + APP_VERSION
3. `docs/index.html` — What's New entry
4. `docs/changelog.html` — changelog entry for 2026-09-02.1

## 9. Verification checklist
- Each of 4 styles × 3 modes (dark/light/auto) = 12 combos render without broken layout
- Bold: ring gone, giant number + 3 pills, dense rows, floating nav pill, icons tappable
- Gradient: gradient bg behind glass cards, ring stroke is purple→teal gradient
- Zen: ring/bars/chips hidden, thin big number, single macro line, journal-style entries
- Switching style persists across reload; switching dark/light while a style is active re-themes correctly
- "Current" removes all style-* classes → identical to today's app
