import { test, expect } from '@playwright/test';

test.describe('Game World', () => {
  test('renders game canvas', async ({ page }) => {
    await page.goto('/game-test');

    // Wait for canvas to appear (PixiJS may create multiple canvases)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Verify canvas has correct dimensions
    const box = await canvas.boundingBox();
    expect(box?.width).toBe(800);
    expect(box?.height).toBe(600);
  });

  test('displays player name', async ({ page }) => {
    await page.goto('/game-test');

    // Wait for the game to load
    await page.waitForSelector('canvas', { timeout: 5000 });

    // Check for player name in UI
    await expect(page.locator('text=TestPlayer')).toBeVisible();
  });

  test('player moves with WASD keys', async ({ page }) => {
    await page.goto('/game-test');

    // Wait for canvas
    await page.waitForSelector('canvas', { timeout: 5000 });

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/game-initial.png' });

    // Press D key to move right
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');

    // Take screenshot after moving
    await page.screenshot({ path: 'screenshots/game-after-move.png' });
  });

  test('takes screenshot of game world', async ({ page }) => {
    await page.goto('/game-test');

    // Wait for canvas
    await page.waitForSelector('canvas', { timeout: 5000 });

    // Wait a bit for rendering to complete
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/game-world.png' });
  });
});
