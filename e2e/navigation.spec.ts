import { test, expect } from '@playwright/test';

test('navigates from Board to Rules', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();

  await page.getByRole('link', { name: 'Rules' }).click();
  await expect(page.getByRole('heading', { name: 'Rules' })).toBeVisible();
  await expect(page).toHaveURL(/#\/rules$/);
});
