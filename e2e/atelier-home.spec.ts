import { expect, test } from '@playwright/test';

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
