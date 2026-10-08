// Smoke tests for Macrolog. They drive the real UI on every device in
// playwright.config.js and only need a static server (no camera, no network).
const fs = require('fs');
const path = require('path');
const { test: base, expect } = require('playwright/test');

// Targets for the "returning user" state. 2000 kcal makes "remaining" easy to check.
const TARGETS = { kcal: 2000, protein: 150, carbs: 200, fat: 70, fibre: 30, sugarLimit: 60 };
const SNACK = { name: 'Smoke test snack', kcal: 321, protein: 12, carbs: 34, fat: 5.6 };

// Bottom nav label -> view id and the title shown at the top of that view.
const VIEWS = [
  { nav: 'Today', view: 'today', title: 'Today' },
  { nav: 'Log Food', view: 'log', title: 'Log Food' },
  { nav: 'Recipes', view: 'recipes', title: 'Recipes' },
  { nav: 'Settings', view: 'settings', title: 'Settings' },
  { nav: 'Trends', view: 'trends', title: 'Trends' },
  { nav: 'Fasting', view: 'fasting', title: 'Intermittent Fasting' },
];

const test = base.extend({
  // Abort every request that is not to the local test server (CDNs, Open Food
  // Facts, USDA, AI providers) so runs behave the same locally and in CI.
  // WebKit also routes blob: URLs (no hostname), so only http(s) is checked.
  context: async ({ context }, use) => {
    await context.route(
      url => url.protocol.startsWith('http') && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost',
      route => route.abort(),
    );
    await use(context);
  },
  // Every test fails if the page throws an uncaught error at any point.
  pageErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await use(errors);
    expect(errors, 'uncaught errors on the page').toEqual([]);
  }, { auto: true }],
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// A user who has finished the tour and has targets. Seeds storage once per tab
// (sessionStorage survives reloads), so a test can clear localStorage and reload
// to get a genuinely fresh user.
async function seedReturningUser(page) {
  await page.addInitScript(targets => {
    if (!location.protocol.startsWith('http') || sessionStorage.getItem('mt_test_seeded')) return;
    sessionStorage.setItem('mt_test_seeded', '1');
    localStorage.setItem('mt_tour_complete', '1');
    localStorage.setItem('mt_settings', JSON.stringify(targets));
  }, TARGETS);
}

function navButton(page, label) {
  return page.locator('nav').getByRole('button', { name: label, exact: true });
}

async function openView(page, label) {
  const v = VIEWS.find(x => x.nav === label);
  await navButton(page, label).click();
  await expect(page.locator(`#view-${v.view}`)).toHaveClass(/\bactive\b/);
}

async function expectNoHorizontalOverflow(page) {
  const m = await page.evaluate(() => {
    const view = document.querySelector('.view.active');
    return {
      page: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      // Views scroll internally (html/body are overflow:hidden), so a too-wide
      // child shows up here rather than on the document.
      view: view ? view.scrollWidth : 0,
      viewWidth: view ? view.clientWidth : 0,
    };
  });
  expect(m.page, 'page is wider than the viewport').toBeLessThanOrEqual(m.viewport);
  expect(m.view, 'active view scrolls sideways').toBeLessThanOrEqual(m.viewWidth);
}

async function expectInsideViewport(page, locator, what) {
  const box = await locator.boundingBox();
  expect(box, `${what} is not rendered`).not.toBeNull();
  const vp = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const slack = 1; // sub-pixel rounding
  expect(box.x, `${what} starts left of the viewport`).toBeGreaterThanOrEqual(-slack);
  expect(box.y, `${what} starts above the viewport`).toBeGreaterThanOrEqual(-slack);
  expect(box.x + box.width, `${what} runs off the right edge`).toBeLessThanOrEqual(vp.w + slack);
  expect(box.y + box.height, `${what} runs off the bottom edge`).toBeLessThanOrEqual(vp.h + slack);
}

// Scrolls the button's sheet as far as a user could, then reports what is on
// top at the button's centre: null if it is the button itself, otherwise a
// description of whatever covers it.
async function whatCovers(button) {
  return button.evaluate(btn => {
    for (let el = btn.parentElement; el && el !== document.body; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
    }
    const b = btn.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    const hit = document.elementFromPoint(x, y);
    let coveredBy = null;
    if (!hit) coveredBy = 'nothing (centre is off-screen)';
    else if (hit !== btn && !btn.contains(hit)) {
      coveredBy = hit.closest('nav')
        ? `the bottom nav ("${hit.closest('nav button')?.textContent.trim() ?? 'nav'}" button)`
        : `<${hit.tagName.toLowerCase()}${hit.id ? '#' + hit.id : ''}> "${hit.textContent.trim().slice(0, 30)}"`;
    }
    return { coveredBy, centre: [Math.round(x), Math.round(y)] };
  });
}

// The button must be the topmost element at its own centre. Catches buttons
// sitting behind the bottom nav (z-index 8001), like the scan-result Log button
// fixed on 7 Sep.
async function expectNotCovered(button, what) {
  await expect(button, `${what} is not visible`).toBeVisible();
  const r = await whatCovers(button);
  expect(r.coveredBy, `${what} at ${r.centre} is covered by ${r.coveredBy}`).toBeNull();
}

async function quickAdd(page, food) {
  await openView(page, 'Log Food');
  await page.locator('#view-log .tabs').getByRole('button', { name: /Quick/ }).click();
  await expect(page.locator('#log-quickadd')).toBeVisible();
  await page.fill('#qa-name', food.name);
  await page.fill('#qa-kcal', String(food.kcal));
  await page.fill('#qa-protein', String(food.protein));
  await page.fill('#qa-carbs', String(food.carbs));
  await page.fill('#qa-fat', String(food.fat));
  await page.locator('#qa-meal-pills').getByRole('button', { name: 'Snacks' }).click();
  await page.locator('#log-quickadd').getByRole('button', { name: 'Add to Log' }).click();
  await expect(page.locator('#toast')).toHaveText(`Added ${food.name}`);
}

async function expectLoggedToday(page, food) {
  const entry = page.locator('#food-log-list .log-entry').filter({ hasText: food.name });
  await expect(entry).toBeVisible();
  await expect(entry.locator('.log-kcal')).toHaveText(String(food.kcal));
  await expect(page.locator('#food-log-list .meal-header')).toHaveText(['Snacks']);
  await expect(page.locator('#kcal-val')).toHaveText(String(food.kcal));
  await expect(page.locator('#kcal-remaining')).toHaveText(String(TARGETS.kcal - food.kcal));
}

async function openDataSection(page) {
  await openView(page, 'Settings');
  await page.locator('#data-header').click();
  await expect(page.locator('#data-body')).toBeVisible();
}

// ─── Brand-new user ──────────────────────────────────────────────────────────

test('fresh load shows the welcome screen with nothing broken', async ({ page }) => {
  await page.goto('/');

  const welcome = page.locator('#tour-welcome-backdrop');
  await expect(welcome).toHaveClass(/\bopen\b/);
  await expect(welcome.getByText('Macro Tracker')).toBeVisible();
  for (const label of ['Start Tour', 'Skip Tutorial']) {
    const btn = welcome.getByRole('button', { name: label });
    await expect(btn).toBeVisible();
    await expectInsideViewport(page, btn, `"${label}" button`);
  }

  await expectNoHorizontalOverflow(page);
  await expectInsideViewport(page, page.locator('nav'), 'bottom nav');
  for (const btn of await page.locator('nav button').all()) {
    await expectInsideViewport(page, btn, `nav button "${(await btn.textContent()).trim()}"`);
  }
});

// Guards the CLAUDE.md data-safety rules: demo data only ever lives for the
// length of the tour, and a user's own data is never touched by it.
test('tour demo data is cleared afterwards and never replaces real data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Tour' }).click();
  await expect(page.locator('#tour-overlay')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#food-log-list')).toContainText('Porridge with Berries');
  await page.getByRole('button', { name: 'Exit Tour' }).click();
  await expect(page.locator('#tour-overlay')).not.toHaveClass(/\bactive\b/);
  await expect(page.locator('#food-log-list')).not.toContainText('Porridge with Berries');
  expect(await page.evaluate(() => ({
    logs: localStorage.getItem('mt_logs'),
    weights: localStorage.getItem('mt_weight_log'),
    water: localStorage.getItem('mt_water_log'),
    demoFlag: localStorage.getItem('mt_tour_demo_active'),
  }))).toEqual({ logs: null, weights: null, water: null, demoFlag: null });

  // The tour hands over to the targets wizard; close it.
  const wizard = page.locator('#onboarding-backdrop');
  await expect(wizard).toHaveClass(/\bopen\b/);
  await wizard.locator('.ob-close-btn').click();

  // Now a real user: log something, retake the tour, and the entry must survive.
  await quickAdd(page, SNACK);
  await openView(page, 'Settings');
  await page.getByRole('button', { name: /Take the tour again/ }).click();
  await expect(page.locator('#tour-overlay')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#food-log-list')).toContainText(SNACK.name);
  await expect(page.locator('#food-log-list')).not.toContainText('Porridge with Berries');
  await page.getByRole('button', { name: 'Exit Tour' }).click();
  await openView(page, 'Today');
  await expect(page.locator('#food-log-list .log-entry')).toHaveCount(1);
  await expect(page.locator('#food-log-list')).toContainText(SNACK.name);
});

test('a new user is offered the targets wizard once', async ({ page }) => {
  await page.goto('/');
  await page.locator('#tour-welcome-backdrop').getByRole('button', { name: 'Skip Tutorial' }).click();
  const wizard = page.locator('#onboarding-backdrop');
  await expect(wizard).toHaveClass(/\bopen\b/);
  await expectInsideViewport(page, wizard.locator('.ob-close-btn'), 'wizard close button');
  await wizard.locator('.ob-close-btn').click();
  await expect(wizard).not.toHaveClass(/\bopen\b/);
  await page.reload();
  await expect(page.locator('#view-today')).toHaveClass(/\bactive\b/);
  await expect(wizard).not.toHaveClass(/\bopen\b/);
});

// Someone who finished the tour on an earlier version today, with nothing logged or saved,
// is offered the wizard as the app opens. Opening it there once threw and stopped the app loading.
test('the targets wizard can be offered as the app opens', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('mt_test_seeded')) return;
    sessionStorage.setItem('mt_test_seeded', '1');
    localStorage.setItem('mt_tour_complete', '1');
  });
  await page.goto('/');
  await expect(page.locator('#onboarding-backdrop')).toHaveClass(/\bopen\b/);
});

// ─── Returning user (tour done, targets set) ─────────────────────────────────

test.describe('returning user', () => {
  test.beforeEach(async ({ page }) => {
    await seedReturningUser(page);
    await page.goto('/');
    await expect(page.locator('#tour-welcome-backdrop')).not.toHaveClass(/\bopen\b/);
    await expect(page.locator('#onboarding-backdrop')).not.toHaveClass(/\bopen\b/);
  });

  test('every nav tab opens its view without overflow', async ({ page }) => {
    for (const v of VIEWS) {
      await test.step(v.nav, async () => {
        await openView(page, v.nav);
        const view = page.locator(`#view-${v.view}`);
        await expect(view).toBeVisible();
        await expect(view.locator('.section-title').first()).toHaveText(v.title);
        await expect(navButton(page, v.nav)).toHaveClass(/\bactive\b/);
        await expect(page.locator('.view.active')).toHaveCount(1);
        await expectNoHorizontalOverflow(page);
        await expectInsideViewport(page, page.locator('nav'), 'bottom nav');
      });
    }
    // The Log Food sub-tabs that work without a camera.
    await openView(page, 'Log Food');
    for (const [tab, panel] of [[/Search/, '#log-search'], [/Manual/, '#log-manual'], [/Quick/, '#log-quickadd']]) {
      await page.locator('#view-log .tabs').getByRole('button', { name: tab }).click();
      await expect(page.locator(panel)).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  // Computers rarely have a camera to hand, so Log Food opens on Search there; phones and tablets keep Scan.
  test('Log Food opens on Search on desktop and on Scan elsewhere', async ({ page, isMobile }) => {
    const desktop = !isMobile && page.viewportSize().width >= 1024;
    await openView(page, 'Log Food');
    const active = page.locator('#view-log .tab.active');
    if (desktop) {
      await expect(active).toHaveText(/Search/);
      await expect(page.locator('#log-search')).toBeVisible();
      await expect(page.locator('#search-input')).toBeFocused();
    } else {
      await expect(active).toHaveText(/Scan/);
      await expect(page.locator('#log-scan')).toBeVisible();
    }
  });

  test('desktop Log Food, Settings and Fasting use two columns', async ({ page, isMobile }) => {
    test.skip(isMobile || page.viewportSize().width < 1024, 'desktop layout only');
    const besides = async (left, right, what) => {
      const l = await page.locator(left).boundingBox();
      const r = await page.locator(right).boundingBox();
      expect(r.x, `${what}: right column starts left of the main column's edge`).toBeGreaterThanOrEqual(l.x + l.width);
      expect(Math.abs(r.y - l.y), `${what}: columns don't start level`).toBeLessThan(2);
    };
    await openView(page, 'Log Food');
    await besides('#log-search > .field', '#frequent-foods', 'Log Food search');
    await openView(page, 'Settings');
    await besides('.settings-main', '.settings-side', 'Settings');
    await openView(page, 'Fasting');
    await besides('#if-status-card', '#if-protocol-card', 'Fasting');
  });

  test('Enter adds a food to a recipe', async ({ page }) => {
    await openView(page, 'Recipes');
    await page.locator('#view-recipes').getByRole('button', { name: '+ New' }).click();
    const sheet = page.locator('#ingredient-modal');
    await page.locator('#recipe-edit-modal').getByRole('button', { name: '+ Search' }).click();
    await page.fill('#ing-search', 'banana');
    await page.press('#ing-search', 'Enter'); // searches; the generic foods need no network
    await expect(sheet).toHaveClass(/\bopen\b/);
    await page.locator('#ing-search-results .result-item').first().click();
    await page.fill('#ing-weight-final', '120');
    await page.press('#ing-weight-final', 'Enter');
    await expect(sheet).not.toHaveClass(/\bopen\b/);
    await expect(page.locator('#recipe-ingredients-list .ingredient-row')).toHaveCount(1);
    await expect(page.locator('#recipe-ingredients-list .ingredient-row input').first()).toHaveValue('120');

    await page.locator('#recipe-edit-modal').getByRole('button', { name: '+ Manual' }).click();
    await page.fill('#ing-name', 'Smoke tomatoes');
    await page.fill('#ing-weight', '400');
    await page.press('#ing-weight', 'Enter');
    await expect(sheet).not.toHaveClass(/\bopen\b/);
    await expect(page.locator('#recipe-ingredients-list .ingredient-row')).toHaveCount(2);
    await expect(page.locator('#recipe-ingredients-list')).toContainText('Smoke tomatoes');
  });

  test('quick add logs an entry that shows on Today and survives a reload', async ({ page }) => {
    await expect(page.locator('#kcal-val')).toHaveText('0');
    await quickAdd(page, SNACK);
    await openView(page, 'Today');
    await expectLoggedToday(page, SNACK);

    await page.reload();
    await expectLoggedToday(page, SNACK);
  });

  // Each sheet is opened the way a user would, then its main button must be
  // on screen, not under the nav, and must work when tapped.
  const SHEETS = [
    {
      name: 'Edit Targets',
      sheet: '#edit-targets-modal',
      action: 'Save',
      open: async page => page.locator('#view-today').getByRole('button', { name: /Targets/ }).click(),
    },
    {
      name: 'Log Exercise',
      sheet: '#exercise-modal',
      action: 'Add Exercise',
      open: async page => {
        await page.locator('#exercise-card').getByRole('button', { name: '+ Add' }).click();
        await page.fill('#ex-name', 'Walk');
        await page.fill('#ex-duration', '30');
        await page.fill('#ex-kcal', '120');
      },
    },
    {
      // The food result sheet (same one barcode scans and search results open).
      name: 'Log Food sheet',
      sheet: '#weight-modal',
      action: 'Add to Log',
      open: async page => {
        await openView(page, 'Log Food');
        await page.locator('#view-log .tabs').getByRole('button', { name: /Manual/ }).click();
        await page.fill('#manual-name', 'Smoke sheet food');
        await page.fill('#manual-kcal', '150');
        await page.locator('#log-manual').getByRole('button', { name: 'Log Only' }).click();
      },
    },
    {
      // An inline padding on this sheet once put "Jump to Today" behind the
      // bottom nav, so tapping it opened Settings (fixed in v2026-10-06.2).
      name: 'History calendar',
      sheet: '#date-modal',
      action: 'Jump to Today',
      open: async page => page.locator('#view-today').getByRole('button', { name: /History/ }).click(),
    },
    {
      name: 'Targets wizard (last step)',
      sheet: '#onboarding-backdrop',
      action: 'Set Targets',
      open: async page => {
        await openView(page, 'Settings');
        await page.getByRole('button', { name: 'Recalculate targets (TDEE)' }).click();
        await page.fill('#ob-weight', '80');
        await page.fill('#ob-height', '178');
        await page.fill('#ob-age', '30');
        for (const step of [1, 2, 3]) {
          const next = page.locator(`#ob-step-${step}`).getByRole('button', { name: 'Next' });
          await expectNotCovered(next, `wizard step ${step} "Next"`);
          await next.click();
        }
      },
    },
  ];

  for (const s of SHEETS) {
    test(`${s.name}: "${s.action}" button is reachable`, async ({ page }, testInfo) => {
      // Set knownBug to a description to mark a scenario that fails today.
      test.fail(!!s.knownBug, `Known bug: ${s.knownBug}`);
      await s.open(page);
      const sheet = page.locator(s.sheet);
      await expect(sheet).toHaveClass(/\bopen\b/);
      const button = sheet.getByRole('button', { name: s.action, exact: true });
      await expect(button).toBeVisible();
      const r = await whatCovers(button);
      const shot = testInfo.outputPath('sheet.png');
      await page.screenshot({ path: shot });
      await testInfo.attach('sheet', { path: shot, contentType: 'image/png' });
      expect(r.coveredBy, `"${s.action}" at ${r.centre} is covered by ${r.coveredBy}`).toBeNull();
      await button.click();
      await expect(sheet).not.toHaveClass(/\bopen\b/);
    });
  }

  // Desktops rarely have a camera, so a barcode can be read from a photo instead. The
  // reader (ZXing) normally comes from unpkg, which these tests block, so it is served from
  // node_modules when installed (CI installs it alongside Playwright).
  test('a barcode photo or typed barcode logs a product without a camera', async ({ page }) => {
    let zxing;
    try { zxing = fs.readFileSync(require.resolve('@zxing/library/umd/index.min.js')); }
    catch (e) { test.skip(true, 'npm install --no-save @zxing/library@0.23.0 to run this test'); }
    await page.route(/unpkg\.com\/@zxing\/library/, route =>
      route.fulfill({ body: zxing, contentType: 'application/javascript' }));
    // Open Food Facts is blocked too, so the lookup falls back to the barcode cache.
    const code = '5000112637922';
    await page.evaluate(code => localStorage.setItem('mt_barcode_cache', JSON.stringify({
      [code]: { name: 'Smoke test beans', kcal: 80, protein: 5, carbs: 12, fat: 0.5, defaultWeight: 200, barcode: code },
    })), code);
    await page.reload();
    await openView(page, 'Log Food');

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /Barcode from Image/ }).click(),
    ]);
    await chooser.setFiles(path.join(__dirname, 'fixtures', 'barcode-photo.jpg'));
    // Report the scan status if the sheet doesn't open, so a failure says why
    const sheet = page.locator('#weight-modal');
    await expect.poll(async () => (await sheet.getAttribute('class')).includes('open')
      ? 'open' : page.locator('#scan-status').textContent(), { timeout: 20_000 }).toBe('open');
    await expect(page.locator('#weight-modal-title')).toHaveText('Smoke test beans');
    await sheet.getByRole('button', { name: 'Add to Log', exact: true }).click();
    const logs = await page.evaluate(() => localStorage.getItem('mt_logs'));
    expect(logs).toContain(code);

    // The number printed under a barcode can be typed into Search instead.
    await page.locator('#view-log .tabs').getByRole('button', { name: /Search/ }).click();
    await page.fill('#search-input', code);
    await page.press('#search-input', 'Enter');
    await expect(page.locator('#search-results .result-item').first()).toContainText('Smoke test beans');
  });

  test('export then import on a wiped device restores the log', async ({ page }, testInfo) => {
    await quickAdd(page, SNACK);

    // Export from Settings → Data.
    await openDataSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export JSON' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^macro-tracker-\d{4}-\d{2}-\d{2}\.json$/);
    const backupPath = testInfo.outputPath('backup.json');
    await download.saveAs(backupPath);
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const entries = backup.logs.flatMap(d => d.entries);
    expect(entries).toContainEqual(expect.objectContaining({
      name: SNACK.name, kcal: SNACK.kcal, protein: SNACK.protein, carbs: SNACK.carbs, fat: SNACK.fat, meal: 'Snacks',
    }));
    expect(backup.settings).toMatchObject({ kcal: TARGETS.kcal });

    // Wipe everything: the app should treat us as a brand-new user.
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#tour-welcome-backdrop').getByRole('button', { name: 'Skip Tutorial' }).click();
    // A brand-new user is offered the targets wizard; close it to restore a backup instead
    await expect(page.locator('#onboarding-backdrop')).toHaveClass(/\bopen\b/);
    await page.locator('#onboarding-backdrop .ob-close-btn').click();
    await expect(page.locator('#food-log-list')).toContainText('No foods logged yet');

    // Import through Settings → Data → Import JSON.
    await openDataSection(page);
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Import JSON' }).click(),
    ]);
    let confirmText = '';
    page.once('dialog', dialog => { confirmText = dialog.message(); dialog.accept(); });
    const reloaded = page.waitForEvent('load');
    await chooser.setFiles(backupPath);
    await reloaded;
    expect(confirmText).toContain('overwrite');

    await expect(page.locator('#view-today')).toHaveClass(/\bactive\b/);
    await expectLoggedToday(page, SNACK);
  });
});
