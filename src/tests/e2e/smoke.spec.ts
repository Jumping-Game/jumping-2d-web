import { test, expect } from '@playwright/test';

test('game loads and score increases', async ({ page }) => {
  await page.goto('/');

  // Wait for the game to load
  await page.waitForSelector('#app canvas', { state: 'visible' });

  // Wait for the score to be greater than 1000
  await expect(async () => {
    const scoreText = await page.locator('text=/Score: \\d+/').innerText();
    const score = parseInt(scoreText.replace('Score: ', ''));
    expect(score).toBeGreaterThan(1000);
  }).toPass({
    timeout: 30000, // Wait up to 30 seconds
  });
});