import { expect, test } from '@playwright/test';
test('French foundation page connects to the real API', async ({ page }) => {
  await page.goto('/fondation');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Chaque bonne décision',
  );
  await expect(page.getByRole('status')).toHaveText('API disponible');
  await page.getByRole('button', { name: 'Vérifier à nouveau' }).click();
  await expect(page.getByRole('status')).toHaveText('API disponible');
  expect(await page.locator('html').getAttribute('lang')).toBe('fr-CA');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('an unreachable API has an honest recoverable state', async ({ page }) => {
  await page.route('**/api/health', (route) => route.abort());
  await page.goto('/fondation');
  await expect(page.getByRole('status')).toHaveText('API indisponible');
  await page.unroute('**/api/health');
  await page.getByRole('button', { name: 'Vérifier à nouveau' }).click();
  await expect(page.getByRole('status')).toHaveText('API disponible');
});
