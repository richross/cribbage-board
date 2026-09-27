import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('start 2 players, score, reload persists, undo, reach 121 shows result', async ({ page }) => {
  await page.getByRole('button', { name: '2 Players' }).click();
  await expect(page.getByText('2P · Hand 1')).toBeVisible();

  const player1Total = page.getByTestId('total-P1');

  await page.getByRole('button', { name: 'Add 4 to Player 1' }).click();
  await expect(player1Total).toHaveText('4');

  await page.reload();
  await expect(page.getByText('2P · Hand 1')).toBeVisible();
  await expect(page.getByTestId('total-P1')).toHaveText('4');

  const undoButton = page.getByRole('button', { name: /^Undo/ });
  await expect(undoButton).toBeEnabled();
  await undoButton.click();
  await expect(page.getByTestId('total-P1')).toHaveText('0');

  // Reach 121 for Player 1 using the number pad.
  const scores = [29, 29, 29, 29, 5];
  for (const amount of scores) {
    await page.getByRole('button', { name: 'Enter a score for Player 1' }).click();
    for (const digit of String(amount)) {
      await page.getByRole('button', { name: `Digit ${digit}` }).click();
    }
    await page.getByRole('button', { name: `Add ${amount}`, exact: true }).click();
  }

  await expect(page.locator('p', { hasText: /wins 121/ })).toBeVisible();
  await expect(page.getByRole('status').getByRole('button', { name: 'New game' })).toBeVisible();
});
