import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.use({
  trace: {
    mode: 'retain-on-failure',
    screenshots: false,
    snapshots: false,
    sources: true,
  },
});
async function scan(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
}
test('team workspace and typed system editor have accessible names, structure and contrast', async ({
  page,
}) => {
  await page.goto('/equipes');
  await page.getByRole('button', { name: 'Coach Démo', exact: true }).click();
  await page.getByRole('button', { name: 'Mes projets', exact: true }).click();
  await scan(page);
  await page
    .getByRole('button', { name: 'Ouvrir le projet', exact: true })
    .first()
    .click();
  await expect(page.locator('.team-rink')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.getByRole('button', { name: 'Systèmes', exact: true }).click();
  await scan(page);
});
test('assigned private player reader has accessible controls and no horizontal overflow', async ({
  page,
}) => {
  await page.goto('/equipes');
  await page.getByRole('button', { name: 'Joueur M11', exact: true }).click();
  await page.getByRole('button', { name: 'Mes leçons', exact: true }).click();
  await page
    .getByRole('button', { name: 'Ouvrir la leçon', exact: true })
    .first()
    .click();
  await expect(page.locator('.lesson-player .team-rink')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await scan(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
