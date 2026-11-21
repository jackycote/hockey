import { expect, test } from '@playwright/test';

test('principal navigation is visible, styled and fits the home page', async ({
  page,
}) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  const teamLink = nav.getByRole('link', { name: 'Espace équipe' });
  const atelierLink = nav.getByRole('link', { name: 'Atelier', exact: true });
  const foundationLink = nav.getByRole('link', { name: 'Fondations' });
  const links = [teamLink, atelierLink, foundationLink];

  await expect(nav).toBeVisible();
  for (const link of links) await expect(link).toBeVisible();
  await expect(teamLink).toHaveAttribute('href', '/equipes');
  await expect(atelierLink).toHaveAttribute('href', '/');
  await expect(atelierLink).toHaveAttribute('aria-current', 'page');
  await expect(foundationLink).toHaveAttribute('href', '/fondation');
  await expect(atelierLink).toHaveCSS('font-weight', '700');
  await expect(atelierLink).toHaveCSS('text-decoration-line', 'none');

  await page.setViewportSize({ width: 320, height: 800 });
  for (const link of links) {
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('principal links open their existing destinations', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await nav.getByRole('link', { name: 'Espace équipe' }).click();
  await expect(page).toHaveURL('/equipes');
  await expect(
    page.getByRole('heading', {
      name: 'Préparer ensemble. Comprendre le jeu.',
    }),
  ).toBeVisible();

  await page.goto('/');
  await nav.getByRole('link', { name: 'Fondations' }).click();
  await expect(page).toHaveURL('/fondation');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Chaque bonne décision commence par une lecture du jeu.',
  );
});

test('principal navigation supports keyboard focus and activation', async ({
  page,
  browserName,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'HockeyDoo — accueil' }).focus();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const teamLink = page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Espace équipe' });
  await expect(teamLink).toBeFocused();
  await expect(teamLink).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/equipes');
});

test('shows home menu on first visit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Check for Atelier home branding
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toContainText('Préparez votre stratégie');

  // Check for three primary action buttons using CSS selector
  const createBtn = page.locator('.action-button.create');
  await expect(createBtn).toBeVisible();

  // Verify button contains the expected text
  await expect(createBtn).toContainText('Créer une séquence');

  expect(errors).toEqual([]);
});

test('creates a sequence and enters editor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Click Create Sequence button
  await page.locator('.action-button.create').click();

  // Should navigate to editor
  await page.waitForURL('/editor-local');
  await expect(page).toHaveURL('/editor-local');

  // Editor should be visible with rink
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );

  // Check for 10 players and puck in editor
  await expect(page.locator('[data-entity^="player:"]')).toHaveCount(10);
  await expect(page.locator('[data-entity="puck"]')).toHaveCount(1);

  expect(errors).toEqual([]);
});

test('shows Home button in editor and returns to home menu', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Create a sequence
  await page.locator('.action-button.create').click();
  await page.waitForURL('/editor-local');

  // Check for Home button in navigation
  const homeButton = page.locator('button.nav-home');
  await expect(homeButton).toBeVisible();
  await expect(homeButton).toContainText('Atelier');

  // Click Home button
  await homeButton.click();

  // Should return to home menu
  await page.waitForURL('/');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Préparez votre stratégie',
  );

  expect(errors).toEqual([]);
});

test('home menu buttons are disabled except create', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Create button should be enabled
  await expect(page.locator('.action-button.create')).not.toBeDisabled();

  // Load buttons should be disabled (not yet implemented in Phase 3)
  await expect(page.locator('.action-button.load-sequence')).toBeDisabled();
  await expect(page.locator('.action-button.load-tactic')).toBeDisabled();

  expect(errors).toEqual([]);
});
