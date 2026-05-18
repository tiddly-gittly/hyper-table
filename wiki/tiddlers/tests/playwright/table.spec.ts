import { test, expect, Page } from '@playwright/test';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate to a tiddler and wait until the VTable canvas inside it renders.
 * The vtable renders inside a <canvas> element injected by @visactor/vtable.
 */
async function gotoTiddler(page: Page, title: string) {
  await page.goto(`/#${encodeURIComponent(title)}`);
  // wait for the table canvas to appear (vtable renders to canvas)
  await page.waitForSelector('canvas', { timeout: 15_000 });
}

/**
 * Inject a TraitTag schema tiddler into the running wiki so we can simulate
 * the exact scenario that caused the bug (field absent from schema properties).
 */
async function injectTraitTagSchema(page: Page) {
  await page.evaluate(() => {
    const schema = JSON.stringify({
      type: 'object',
      'lingo-base': '$:/test/e2e/lingo/',
      properties: {
        // Only 'status' — other fields like title/tags/created are absent
        status: {
          type: 'string',
          title: 'Status',
          enum: ['active', 'done', 'cancelled'],
          options: { enum_titles: ['StatusActive', 'StatusDone', 'StatusCancelled'] },
        },
      },
    });
    window.$tw.wiki.addTiddler(new window.$tw.Tiddler({
      title: '$:/test/e2e/TraitTagSchema',
      tags: ['$:/SuperTag/TraitTag'],
      schema,
    }));
  });
}

async function removeTraitTagSchema(page: Page) {
  await page.evaluate(() => {
    window.$tw.wiki.deleteTiddler('$:/test/e2e/TraitTagSchema');
  });
}

/** Assert no JS errors occurred on the page. */
async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  // collect errors for a short window
  await page.waitForTimeout(500);
  // Filter out known unrelated network errors (e.g. favicon)
  const tableErrors = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
  expect(tableErrors).toEqual([]);
}

// ── tests ────────────────────────────────────────────────────────────────────

test.describe('hyper-table: basic rendering', () => {
  test('SimpleTable example renders a canvas', async ({ page }) => {
    await gotoTiddler(page, 'examples/SimpleTable');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('BasicTableWithFilter example renders a canvas', async ({ page }) => {
    await gotoTiddler(page, 'examples/BasicTableWithFilter');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('BasicTableJSONConfig example renders a canvas', async ({ page }) => {
    await gotoTiddler(page, 'examples/BasicTableJSONConfig');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('PivotTable example renders a canvas', async ({ page }) => {
    await gotoTiddler(page, 'examples/PivotTable');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});

test.describe('hyper-table: search bar', () => {
  test('search bar renders with input and result counter', async ({ page }) => {
    await gotoTiddler(page, 'examples/BasicTableWithFilter');
    // The search bar renders .tc-hyper-table-search-input
    const searchInput = page.locator('.tc-hyper-table-search-input').first();
    await expect(searchInput).toBeVisible();
    // Counter element shows "0/0" initially
    const counter = page.locator('.tc-hyper-table-search-result-count').first();
    await expect(counter).toBeVisible();
    await expect(counter).toHaveText('0/0');
    // Typing in the search input updates the counter
    await searchInput.fill('caption');
    await page.waitForTimeout(500);
    const counterText = await counter.textContent();
    // After search, counter should be N/M (at least one result expected)
    expect(counterText).toMatch(/^\d+\/\d+$/);
  });

  test('pressing Enter for the first search does not throw queryResult error', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await gotoTiddler(page, 'examples/BasicTableWithFilter');

    const searchInput = page.locator('.tc-hyper-table-search-input').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('caption');
    await searchInput.press('Enter');

    await page.waitForTimeout(500);

    const runtimeErrors = [...pageErrors, ...consoleErrors].join('\n');
    expect(runtimeErrors).not.toContain("Cannot read properties of undefined (reading 'length')");
  });

  test('pressing Enter with a new query performs a new search instead of cycling old results', async ({ page }) => {
    await gotoTiddler(page, 'examples/BasicTableWithFilter');

    const searchInput = page.locator('.tc-hyper-table-search-input').first();
    const counter = page.locator('.tc-hyper-table-search-result-count').first();
    await expect(searchInput).toBeVisible();

    // First search: search for "caption"
    await searchInput.fill('caption');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    const firstCounterText = await counter.textContent();
    // Should have results for "caption"
    expect(firstCounterText).toMatch(/^\d+\/\d+$/);
    const [firstN, firstM] = firstCounterText!.split('/').map(Number);
    expect(firstM).toBeGreaterThan(0);

    // Now change the query to a different term and press Enter
    // This should perform a NEW search, not just cycle to next result of "caption"
    await searchInput.fill('title');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    const secondCounterText = await counter.textContent();
    expect(secondCounterText).toMatch(/^\d+\/\d+$/);
    const [secondN, secondM] = secondCounterText!.split('/').map(Number);

    // The total results count should be different if the search actually updated
    // (or at minimum, index should reset to 1, not continue from previous)
    // If the bug exists, it would show (firstN+1)/firstM instead of a fresh search
    expect(secondN).toBe(1); // Fresh search should start at index 1
  });
});

test.describe('hyper-table: TraitTag schema compatibility (regression)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await injectTraitTagSchema(page);
  });

  test.afterEach(async ({ page }) => {
    await removeTraitTagSchema(page);
  });

  test('table renders without error when tiddler fields are absent from schema', async ({ page }) => {
    // Inject test tiddlers that have fields NOT in the schema (title, tags, created, etc.)
    await page.evaluate(() => {
      window.$tw.wiki.addTiddler(new window.$tw.Tiddler({ title: 'E2ETestRecord1', tags: ['E2ETestTag'], status: 'active', priority: 'high' }));
      window.$tw.wiki.addTiddler(new window.$tw.Tiddler({ title: 'E2ETestRecord2', tags: ['E2ETestTag'], status: 'done' }));
    });

    // Navigate to BasicTableWithFilter which uses a filter-based table
    await gotoTiddler(page, 'examples/BasicTableWithFilter');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Verify no JS errors
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForTimeout(1000);
    const relevant = errors.filter(e => e.includes('Cannot read properties') || e.includes('enum') || e.includes('hyper-table'));
    expect(relevant).toEqual([]);

    await page.evaluate(() => {
      window.$tw.wiki.deleteTiddler('E2ETestRecord1');
      window.$tw.wiki.deleteTiddler('E2ETestRecord2');
    });
  });

  test('table renders without crash when filter returns tiddlers with no schema-defined fields', async ({ page }) => {
    // Tiddlers whose fields are entirely outside the schema
    await page.evaluate(() => {
      window.$tw.wiki.addTiddler(new window.$tw.Tiddler({ title: 'E2ENoSchemaRecord', foo: 'bar', baz: '42' }));
    });

    await gotoTiddler(page, 'examples/BasicTableWithFilter');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    await page.evaluate(() => {
      window.$tw.wiki.deleteTiddler('E2ENoSchemaRecord');
    });
  });
});

test.describe('hyper-table: palette / theme switching', () => {
  test('table re-renders after switching to dark palette without error', async ({ page }) => {
    await gotoTiddler(page, 'examples/BasicTableWithFilter');
    await expect(page.locator('canvas').first()).toBeVisible();

    // Switch to a dark palette
    await page.evaluate(() => {
      window.$tw.wiki.addTiddler(new window.$tw.Tiddler({ title: '$:/palette', text: '$:/palettes/Vanilla' }));
      window.$tw.wiki.addTiddler(new window.$tw.Tiddler({ title: '$:/palettes/Vanilla', 'color-scheme': 'dark' }));
    });
    // Table should still be visible after palette change
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5_000 });
  });
});
