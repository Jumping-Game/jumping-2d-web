declare global {
  interface Window {
    __skyhopper?: { score: number; tick: number };
  }
}

import { test, expect } from '@playwright/test';

test('game loads and reaches altitude', async ({ page }) => {
  await page.goto('/');

  const startButton = page.getByRole('button', { name: /start game/i });
  await startButton.click();
  await page.locator('canvas').first().click();

  const drive = (async () => {
    const directions: Array<'ArrowLeft' | 'ArrowRight'> = [
      'ArrowRight',
      'ArrowLeft',
    ];
    const startTime = Date.now();
    let index = 0;
    while (Date.now() - startTime < 15000) {
      const key = directions[index % directions.length];
      await page.keyboard.down(key);
      await page.waitForTimeout(1500);
      await page.keyboard.up(key);
      index += 1;
      const score = await page.evaluate(() => window.__skyhopper?.score ?? 0);
      if (score > 320) {
        break;
      }
    }
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowRight');
  })();

  await expect
    .poll(
      async () => {
        return page.evaluate(() => window.__skyhopper?.score ?? 0);
      },
      { timeout: 30000 }
    )
    .toBeGreaterThan(300);

  await drive;
});

export {};
