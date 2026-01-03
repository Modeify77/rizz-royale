import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Rizz/i);
});

test('can take screenshot of initial state', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'screenshots/initial-state.png' });
});
