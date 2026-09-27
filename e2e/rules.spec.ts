import { test, expect } from '@playwright/test';

test('search "his heels" from the index, click the result, and see the section with marked text', async ({ page }) => {
  await page.goto('/#/rules');
  await expect(page.getByRole('heading', { name: 'Rules', level: 1 })).toBeVisible();

  await page.getByPlaceholder(/Search rules/).fill('his heels');
  const result = page.getByRole('button', { name: /Starter/ }).first();
  await expect(result).toBeVisible();
  await result.click();

  await expect(page.getByRole('heading', { level: 1, name: /Starter/ })).toBeVisible();
  await expect(page).toHaveURL(/#\/rules\/starter\?h=.*q=/);
  await expect(page.locator('mark').first()).toBeVisible();
});

test('deep link to a section and subheading loads directly', async ({ page }) => {
  await page.goto('/#/rules/pegging?h=the-go');
  await expect(page.getByRole('heading', { level: 1, name: 'Pegging' })).toBeVisible();
  const heading = page.locator('#the-go');
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
});

test('unknown section shows a friendly not-found page linking back to the index', async ({ page }) => {
  await page.goto('/#/rules/not-a-real-section');
  await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  await page.getByRole('link', { name: /Back to Rules/i }).click();
  await expect(page.getByRole('heading', { name: 'Rules', level: 1 })).toBeVisible();
});

test('prev/next links move between adjacent sections', async ({ page }) => {
  await page.goto('/#/rules/deal');
  await expect(page.getByRole('heading', { level: 1, name: 'The Deal' })).toBeVisible();
  await page.getByRole('link', { name: /Next/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'The Crib' })).toBeVisible();
  await page.getByRole('link', { name: /Previous/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'The Deal' })).toBeVisible();
});

test('rules still render after the first load when offline', async ({ page, context }) => {
  // Under full-suite parallel runs the shared preview server / SW install can
  // take noticeably longer than the default 30s test timeout, so give this
  // test more headroom rather than a flaky failure under CPU contention.
  test.setTimeout(60_000);

  await page.goto('/#/rules/pegging');
  await expect(page.getByRole('heading', { level: 1, name: 'Pegging' })).toBeVisible();

  // Wait for the service worker to finish installing and precaching before
  // going offline, rather than a fixed timeout.
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Pegging' })).toBeVisible();
  await context.setOffline(false);
});
