# Calendar Date Picker — Design Options

Three visual approaches for the date picker calendar used in history navigation.
Any of these can be added as a user-selectable appearance setting in the future.

---

## Option A — Dot Indicator (IMPLEMENTED)

**What it shows:** A small 5px coloured circle beneath each day number.

**Dot colours:**
- Green (`--protein`, `#4ade80`): food was logged AND total kcal is within ±20% of the day's calorie goal.
- Amber (`--sugar-warn`, `#f59e0b`): food was logged but significantly under or over target (ratio < 0.8 or > 1.2).
- No dot: nothing logged that day.

**Data read:**
- `mt_logs` (array of `{ date, entries[] }`) — sums `entry.kcal` per day.
- `mt_daily_targets` + `mt_settings` via `getTargetsForDate(dateKey)` — for per-day calorie goal.

**Rendering:** Each day cell is a flex column `[day-number, dot]`. The dot is always
rendered (opacity 0 when absent) to keep cell height consistent.

**Pros:**
- Minimal visual noise; easy to scan at a glance.
- Works well in both dark and light themes.
- Doesn't require any additional layout space per cell.

**Cons:**
- No quantitative info — just logged vs. on-target.
- Colour-blind users may struggle to distinguish green vs. amber without an icon fallback.

---

## Option B — Heat Map Fill Opacity

**Concept:** Each day cell has a full background fill whose opacity scales with
how much was logged relative to the calorie goal (0 = transparent, goal = full colour).
No dots; the cell background IS the data.

**Data read:**
- Same as Option A: `mt_logs` + `getTargetsForDate(dateKey)`.
- Compute `ratio = totalKcal / goal`, clamp to `[0, 1.3]` for display.

**Rendering:**
```
background: rgba(108, 99, 255, clamp(ratio * 0.6, 0, 0.7))
```
Days above goal can shift hue toward amber or red (e.g. `rgba(249, 115, 22, ...)` for ratio > 1.2).

**Pros:**
- Communicates magnitude, not just binary logged/not-logged.
- Gives a quick heat-map overview of which weeks had high vs. low intake.

**Cons:**
- Harder to read on low-contrast days (faint opacity).
- Over/under-target are on the same colour axis; adding a second hue for over-target
  requires extra logic.
- Can look busy if most days are logged.

**Future setting key:** `calendarStyle: 'heatmap'`

---

## Option C — Mini Macro Bar

**Concept:** Each day cell shows a tiny 3-segment horizontal bar (protein/carbs/fat)
scaled to the cell width. The bar fills proportionally to how much of each macro
was consumed vs. target.

**Data read:**
- `mt_logs` — sum `entry.protein`, `entry.carbs`, `entry.fat` per day.
- `getTargetsForDate(dateKey)` — for protein/carbs/fat targets.
- Render three stacked or side-by-side fills: green (protein), yellow (carbs), orange (fat).

**Rendering sketch:**
```
<div style="width:100%; height:3px; display:flex; border-radius:2px; overflow:hidden;">
  <div style="flex: <protein_ratio>; background: var(--protein);"></div>
  <div style="flex: <carbs_ratio>;  background: var(--carbs);"></div>
  <div style="flex: <fat_ratio>;    background: var(--fat);"></div>
</div>
```
Each `ratio = min(actual / target, 1)` — so a full-width bar = all macros on target.

**Pros:**
- Most information-dense: shows protein/carbs/fat split at a glance.
- Useful for users who track macros more carefully than calories.

**Cons:**
- Very small cells make 3px bars nearly illegible on low-DPI screens.
- Complex to read without a legend.
- Slow to compute if queried for every visible day on mount.

**Future setting key:** `calendarStyle: 'macrobar'`

---

## Adding as a User-Selectable Setting

1. Add `calendarStyle: 'dot'` to `mt_settings` default.
2. In `renderCal()`, branch on `getSettings().calendarStyle` to render the dot, heatmap fill, or mini bar.
3. Add a segmented control to Settings > Appearance: "Calendar style: Dot / Heat map / Macro bar".
4. `saveSettings()` persists the choice.
