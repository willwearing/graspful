import { test, expect } from '@playwright/test';

test('homepage example explains an incorrect answer and supports retry', async ({ page }) => {
  await page.goto('/');
  const preview = page.getByRole('complementary', { name: 'Example SQL lesson' });
  await expect(preview).toBeVisible();
  await preview.getByRole('radio', { name: 'WHERE' }).check();
  await preview.getByRole('button', { name: 'Check answer' }).click();
  await expect(preview.getByRole('status')).toContainText('WHERE filters rows');
  await preview.getByRole('button', { name: 'Try again' }).click();
  await preview.getByRole('radio', { name: 'SELECT' }).check();
  await preview.getByRole('button', { name: 'Check answer' }).click();
  await expect(preview.getByRole('status')).toContainText('Correct. SELECT chooses the columns.');
  await expect(preview.getByText(/does not save progress/)).toBeVisible();
});

test('mobile homepage has a readable lesson and no page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: 'Example SQL lesson' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/graspful-marketing-home-mobile.png', fullPage: true });
});

test('FirefighterPrep mobile hero fits its subject headline', async ({ page, context }) => {
  await context.addCookies([{ name: 'dev-brand-override', value: 'firefighter', domain: 'localhost', path: '/' }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toContainText('Firefighter I');
  const bounds = await heading.boundingBox();
  expect(bounds!.height).toBeLessThan(220);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/graspful-marketing-firefighter-mobile.png', fullPage: true });
});
