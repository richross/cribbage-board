import { test, expect } from '@playwright/test';

test('navigates from Board to Rules', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();

  await page.getByRole('link', { name: /Rules/ }).click();
  await expect(page.getByRole('heading', { name: 'Rules' })).toBeVisible();
  await expect(page).toHaveURL(/#\/rules$/);
});

test('navigates through all three destinations and sets a document title for each', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();
  await expect(page).toHaveTitle('Board · Cribbage Companion');
  await expect(page.getByRole('link', { name: /Board/ })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('link', { name: /Score Hand/ }).click();
  await expect(page.getByRole('heading', { name: 'Score Hand' })).toBeVisible();
  await expect(page).toHaveURL(/#\/hand$/);
  await expect(page).toHaveTitle('Score Hand · Cribbage Companion');
  await expect(page.getByRole('link', { name: /Score Hand/ })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('link', { name: /Rules/ }).click();
  await expect(page.getByRole('heading', { name: 'Rules' })).toBeVisible();
  await expect(page).toHaveURL(/#\/rules$/);
  await expect(page).toHaveTitle('Rules · Cribbage Companion');
  await expect(page.getByRole('link', { name: /Rules/ })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('link', { name: /^Board/ }).click();
  await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();
  await expect(page).toHaveTitle('Board · Cribbage Companion');
});

test('unknown routes show a 404 with a way back to Board', async ({ page }) => {
  await page.goto('/#/nowhere');
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();

  await page.getByRole('link', { name: /back to board/i }).click();
  await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();
});
