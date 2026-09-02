# Macrolog — Alternative Theme Proposals

## How theming works (confirmed)
- All colours are CSS variables in `:root` (index.html lines 14–31). Themes are class overrides: `html.theme-light { --bg: … }` (line 32).
- Switching is `setTheme('x')` → `applyTheme()` (lines 4661–4675): removes `theme-*` classes, adds `theme-<name>`, persists to `localStorage['mt_theme']`. Buttons live at lines 1071–1073.
- **Every proposal below is achievable purely via a new `html.theme-<name> { … }` block + one button.** No HTML structure changes.
- Themeable vars: `--bg --bg2 --bg3 --border --accent --accent2 --protein --carbs --fat --kcal --text --muted --danger --fibre --sugar-warn`.
- Caveat: `border-radius` (12px cards / 8–10px inputs) and box-shadows are currently hardcoded, not variables. Colour-only themes work today as-is. To vary radius/shadow per theme, add two tokens (`--radius`, `--shadow`) and swap the hardcoded values to use them — a ~10-line, low-risk change. Radius/shadow values below are the design intent if we tokenize; otherwise themes inherit the default 12px/soft look.

## Current theme summary
The default is a **cool, dark, modern-PWA** look: near-black indigo-tinted background (`#0f0f13`) with layered charcoal surfaces, soft 12px-rounded cards, and a violet/indigo accent (`#6c63ff`). Text is a soft off-white (`#e8e8f0`) with muted lavender-grey secondary text (`#7070a0`). Macro data uses a fixed semantic palette — green protein, yellow carbs, orange fat, magenta calories. Overall feel: calm, slightly playful, elevated-but-restrained; the bundled light mode is a clean Apple-style grey/white.

---

## Theme 1 — "Forest"
**Feel:** A warm, organic dark theme built on deep pine and moss greens with a soft amber accent. Calming and wellness-oriented — feels like a nature app rather than a dashboard.
**Suits:** Users who find the default indigo too "techy" and want a grounded, low-strain, natural mood.

```
--bg:        #0e1512
--bg2:       #16201b
--bg3:       #1f2c25
--border:    #2c3a31
--accent:    #4b9e6f
--accent2:   #6fc38d
--text:      #e6efe8
--muted:     #7d9487
--danger:    #e07a5f
--protein:   #5fd08a
--carbs:     #e0b64a
--fat:       #e08a4a
--kcal:      #7fd1b8
--fibre:     #1ABC9C
--sugar-warn:#e0a83c
Radius: 14px (soft)  |  Shadow: soft, low-contrast (0 4px 16px rgba(0,0,0,0.4))
```

---

## Theme 2 — "Graphite"
**Feel:** A cool, clinical, high-contrast neutral-grey theme with a precise steel-blue accent and sharper corners. Flat, dense, and data-forward — maximum legibility with minimal decoration.
**Suits:** Minimalist / power users, people who want strong contrast and a serious "medical dashboard" aesthetic.

```
--bg:        #101114
--bg2:       #191b1f
--bg3:       #23262b
--border:    #34383f
--accent:    #3b82f6
--accent2:   #60a5fa
--text:      #f2f4f7
--muted:     #8b919b
--danger:    #ef4444
--protein:   #4ade80
--carbs:     #eab308
--fat:       #f97316
--kcal:      #38bdf8
--fibre:     #14b8a6
--sugar-warn:#f59e0b
Radius: 8px (sharper)  |  Shadow: minimal/flat (0 1px 3px rgba(0,0,0,0.5))
```

---

## Theme 3 — "Warm Sand" (light)
**Feel:** A soft, warm light theme in cream and oatmeal tones with a terracotta accent and generously rounded cards. Cozy, calm, and easy on the eyes — an antidote to stark white or dark screens.
**Suits:** Daytime users who prefer light mode but find pure-white clinical, and anyone wanting a friendly, low-glare feel.

```
--bg:        #f4efe6
--bg2:       #fffdf8
--bg3:       #ebe3d6
--border:    #ddd2c0
--accent:    #c2683f
--accent2:   #a8552f
--text:      #33291f
--muted:     #8a7d6b
--danger:    #c0492b
--protein:   #4a9e6b
--carbs:     #c99a1f
--fat:       #d97633
--kcal:      #b5568c
--fibre:     #0f9e86
--sugar-warn:#c98a1f
Radius: 16px (very soft)  |  Shadow: warm/soft (0 2px 12px rgba(120,90,50,0.12))
```

---

## Theme 4 — "Aurora"
**Feel:** A bold, vibrant near-black theme with electric cyan-to-magenta accents and subtle glow. High-energy and modern — punchy accents pop against deep ink for a premium, expressive look.
**Suits:** Users who want personality and vibrancy, younger audiences, people who enjoyed the default's playfulness but want more saturation.

```
--bg:        #0a0a12
--bg2:       #12121f
--bg3:       #1b1b2e
--border:    #2a2a45
--accent:    #22d3ee
--accent2:   #a855f7
--text:      #f0f0ff
--muted:     #7a7ab0
--danger:    #fb7185
--protein:   #34d399
--carbs:     #fde047
--fat:       #fb923c
--kcal:      #e879f9
--fibre:     #2dd4bf
--sugar-warn:#fbbf24
Radius: 12px (default)  |  Shadow: glowy accent (0 4px 24px rgba(34,211,238,0.15))
```

---

## Variety matrix
| Theme | Temp | Saturation | Mood | Radius |
|---|---|---|---|---|
| Forest | Warm-cool green | Muted | Organic/calm | Soft 14 |
| Graphite | Cool neutral | Low, high-contrast | Clinical/dense | Sharp 8 |
| Warm Sand | Warm (light) | Soft | Cozy/friendly | Very soft 16 |
| Aurora | Cool | Vibrant | Bold/expressive | Default 12 |

**Recommendation:** Forest + Graphite make the safest, most differentiated pair (one warm-dark, one cool-clinical). Warm Sand is the standout if a light alternative is wanted. Aurora is the pick for boldness.

### Critical files for implementation
- `/workspace/macro-tracker/index.html` (`:root` block ~L14–31; theme buttons ~L1071–1073; `applyTheme`/`setTheme` ~L4661–4675)
- `/workspace/macro-tracker/sw.js` (bump CACHE_NAME/APP_VERSION)
- `/workspace/macro-tracker/docs/index.html` (What's New)
- `/workspace/macro-tracker/docs/changelog.html` (changelog entry)
