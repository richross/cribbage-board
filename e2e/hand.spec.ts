import { test, expect } from '@playwright/test';

test('scores the famous 29 hand', async ({ page }) => {
  await page.goto('/#/hand');
  await expect(page.getByRole('heading', { name: 'Score Hand' })).toBeVisible();

  async function pick(suit: RegExp, rank: string) {
    await page.getByRole('radio', { name: suit }).click();
    await page.getByRole('button', { name: new RegExp(`^${rank} of`) }).click();
  }

  await pick(/Spades/, '5');
  await pick(/Clubs/, '5');
  await pick(/Diamonds/, '5');
  await pick(/Hearts/, 'J');
  await pick(/Hearts/, '5');

  await expect(page.getByText('29', { exact: true })).toBeVisible();
  await expect(page.getByText('The perfect hand!')).toBeVisible();
});
