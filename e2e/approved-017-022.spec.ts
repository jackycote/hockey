import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CoachingSequenceSchema } from '@hockey-iq/contracts';
import { addStepAfter, openRinkZoom } from './step-actions.js';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const item = (page: Page, name: string) =>
  page.getByRole('menuitem', { name, exact: true });
async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
}
async function documentValue(page: Page) {
  const download = page.waitForEvent('download');
  await button(page, 'Exporter JSON').click();
  return CoachingSequenceSchema.parse(
    JSON.parse(await readFile(await (await download).path(), 'utf8')),
  );
}
async function seek(page: Page, at: number) {
  await page
    .getByRole('slider', { name: 'Curseur de lecture', exact: true })
    .evaluate((element, value) => {
      const input = element as HTMLInputElement;
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, at);
}
test('BKL-018 menu supports keyboard, cursor insertion and adding after the selected pose with history and persistence', async ({
  page,
  isMobile,
}) => {
  await open(page);
  await button(page, 'Créer une séquence').click();
  const trigger = button(page, 'Insérer une étape');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(item(page, 'Insérer une étape')).toBeDisabled();
  await expect(item(page, 'Ajouter une étape après')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await addStepAfter(page);
  const x = page.getByRole('spinbutton', { name: 'X (m)', exact: true });
  await x.fill('20');
  await x.press('Tab');
  await button(page, 'Enregistrer l’étape').click();
  await addStepAfter(page);
  const original = await documentValue(page);
  await button(page, 'Revenir au début').click();
  await addStepAfter(page);
  const added = await documentValue(page);
  expect(added.steps.map((s) => s.atMs)).toEqual([0, 2000, 4000, 6000]);
  expect(added.steps[1]!.pose).toEqual(original.steps[0]!.pose);
  expect(added.steps[2]).toEqual({ ...original.steps[1], atMs: 4000 });
  await button(page, 'Annuler').click();
  expect(await documentValue(page)).toEqual(original);
  await button(page, 'Rétablir').click();
  expect(await documentValue(page)).toEqual(added);
  await seek(page, 3000);
  await trigger.click();
  await expect(item(page, 'Ajouter une étape après')).toBeDisabled();
  await expect(item(page, 'Insérer une étape')).toBeFocused();
  await page.keyboard.press('Enter');
  const inserted = await documentValue(page);
  expect(inserted.steps.map((s) => s.atMs)).toEqual([
    0, 2000, 3000, 4000, 6000,
  ]);
  expect(inserted.steps[2]!.pose.players[0]!.pos.x).toBe(30);
  expect(inserted.steps[3]).toEqual(added.steps[2]);
  await button(page, 'Enregistrer').click();
  await page.reload();
  expect(await documentValue(page)).toEqual(inserted);
  if (isMobile) await page.setViewportSize({ width: 320, height: 620 });
  await seek(page, 2500);
  await trigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect
    .poll(() =>
      page.getByRole('menu').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.right <= innerWidth &&
          r.top >= 0 &&
          r.bottom <= innerHeight
        );
      }),
    )
    .toBe(true);
  await page.keyboard.press('Home');
  await expect(item(page, 'Insérer une étape')).toBeFocused();
  await page.keyboard.press('End');
  await expect(item(page, 'Insérer une étape')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('heading', { name: 'Montage', exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
});
test('BKL-017 preserves zoom and pan across authored and physical animation frames and honors explicit fit and dimensions', async ({
  page,
}) => {
  await open(page);
  await button(page, 'Créer une séquence').click();
  await addStepAfter(page);
  await page.getByRole('spinbutton', { name: 'X (m)', exact: true }).fill('20');
  await page
    .getByRole('spinbutton', { name: 'X (m)', exact: true })
    .press('Tab');
  await button(page, 'Enregistrer l’étape').click();
  await page
    .getByRole('combobox', { name: 'Vitesse de la séquence', exact: true })
    .selectOption('0.25');
  await button(page, 'Revenir au début').click();
  await openRinkZoom(page);
  await button(page, 'Agrandir').click();
  await page.keyboard.press('Escape');
  await button(page, 'Déplacer la vue').click();
  const board = page.locator('.rink-board');
  await board.scrollIntoViewIfNeeded();
  const marker = page.locator('[data-entity="player:home-4"]');
  const left = () =>
    marker.evaluate((el) => parseFloat((el as HTMLElement).style.left));
  const initial = await left();
  const rect = (await board.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width / 2 + 18,
    rect.y + rect.height / 2,
    { steps: 4 },
  );
  await page.mouse.up();
  expect((await left()) - initial).toBeCloseTo(18, 0);
  const offset = await left();
  await button(page, 'Lire la séquence').click();
  const samples = await board.evaluate(async (el) => {
    const values = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame);
      values.push([
        el.getAttribute('data-zoom'),
        parseFloat(
          (el.querySelector('[data-entity="player:home-4"]') as HTMLElement)
            .style.left,
        ),
      ]);
    }
    return values;
  });
  expect(
    samples.every(
      ([zoom, x]) => zoom === '120' && Math.abs(Number(x) - offset) < 0.1,
    ),
  ).toBe(true);
  await button(page, 'Pause de la séquence').click();
  await button(page, 'Lire la séquence').click();
  await expect(board).toHaveAttribute('data-zoom', '120');
  await button(page, 'Pause de la séquence').click();
  await button(page, 'Cadrer la patinoire').click();
  await expect(board).toHaveAttribute('data-zoom', '100');
  await button(page, 'Revenir au début').click();
  await button(page, 'Réinitialiser le scénario').click();
  await button(page, 'Démarrer la simulation').click();
  const fittedPhysical = await left();
  await openRinkZoom(page);
  await button(page, 'Agrandir').click();
  await page.keyboard.press('Escape');
  await button(page, 'Déplacer la vue').click();
  await board.scrollIntoViewIfNeeded();
  const physicalRect = (await board.boundingBox())!;
  const beforePan = await left();
  await page.mouse.move(
    physicalRect.x + physicalRect.width / 2,
    physicalRect.y + physicalRect.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    physicalRect.x + physicalRect.width / 2 + 18,
    physicalRect.y + physicalRect.height / 2,
    { steps: 4 },
  );
  await page.mouse.up();
  const physicalOffset = await left();
  expect(physicalOffset - beforePan).toBeCloseTo(18, 0);
  const physical = await board.evaluate(async (el) => {
    const values = [];
    for (let i = 0; i < 10; i++) {
      await new Promise(requestAnimationFrame);
      values.push([
        el.getAttribute('data-zoom'),
        parseFloat(
          (el.querySelector('[data-entity="player:home-4"]') as HTMLElement)
            .style.left,
        ),
      ]);
    }
    return values;
  });
  expect(
    physical.every(
      ([zoom, x]) =>
        zoom === '120' && Math.abs(Number(x) - physicalOffset) < 0.1,
    ),
  ).toBe(true);
  await openRinkZoom(page);
  await button(page, 'Réinitialiser le zoom à 100 %').click();
  await expect(board).toHaveAttribute('data-zoom', '100');
  await expect(button(page, 'Mettre en pause')).toBeVisible();
  expect(await left()).toBeCloseTo(fittedPhysical, 1);
  await expect(
    page.getByRole('dialog', { name: 'Zoom de la patinoire', exact: true }),
  ).toBeVisible();
  await button(page, 'Mettre en pause').click();
  await button(page, 'Modifier la situation initiale').click();
  await openRinkZoom(page);
  await button(page, 'Agrandir').click();
  await page.keyboard.press('Escape');
  await page.locator('.scenario-settings summary').click();
  await page
    .getByRole('spinbutton', { name: 'Longueur (m)', exact: true })
    .fill('64');
  await page
    .getByRole('spinbutton', { name: 'Longueur (m)', exact: true })
    .press('Tab');
  await expect(board).toHaveAttribute('data-zoom', '100');
});
test('BKL-019–022 brand, width, toolbar bounds and reset remain accessible', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  await expect(page).toHaveTitle('HockeyDoo — Atelier tactique');
  const logo = page.getByRole('img', { name: 'HockeyDoo', exact: true });
  expect(
    await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth),
  ).toBe(2007);
  await expect(
    page.getByRole('link', { name: 'HockeyDoo — accueil', exact: true }),
  ).toHaveAttribute('href', '/');
  const rail = page.getByRole('toolbar', { name: 'Atelier', exact: true });
  await expect(rail.locator('button').first()).toHaveAccessibleName(
    'Réinitialiser le scénario',
  );
  await expect(page.locator('.rink-toolbar')).toHaveCount(0);
  await expect(page.locator('.rink-bottomline button')).toHaveCount(0);
  if (!isMobile)
    expect((await page.locator('.inspector-panel').boundingBox())!.width).toBe(
      368,
    );
  await button(page, 'Déplacer').focus();
  await page.keyboard.press('End');
  await expect(button(page, 'Inverser la vue')).toBeFocused();
  expect(
    await rail.evaluate((el) =>
      el.scrollHeight > el.clientHeight ? el.scrollTop > 0 : el.scrollTop === 0,
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      rail.evaluate((el) => {
        const rail = el.getBoundingClientRect(),
          focused = document.activeElement!.getBoundingClientRect();
        return focused.top >= rail.top && focused.bottom <= rail.bottom;
      }),
    )
    .toBe(true);
  await page.keyboard.press('Home');
  await expect(button(page, 'Réinitialiser le scénario')).toBeFocused();
  await page.getByRole('spinbutton', { name: 'X (m)', exact: true }).fill('22');
  await page
    .getByRole('spinbutton', { name: 'X (m)', exact: true })
    .press('Tab');
  await button(page, 'Réinitialiser le scénario').click();
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toHaveValue('40');
  await button(page, 'Annuler').click();
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toHaveValue('22');
  await button(page, 'Créer une séquence').click();
  await page.screenshot({
    path: info.outputPath('hockeydoo-workspace.png'),
    fullPage: true,
  });
  await page.goto('/fondation');
  if (isMobile) await page.setViewportSize({ width: 320, height: 620 });
  await expect(logo).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await logo.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width / r.height;
    }),
  ).toBeCloseTo(2007 / 783, 2);
  expect(
    await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth),
  ).toBe(2007);
  await page.screenshot({
    path: info.outputPath('hockeydoo-foundation.png'),
    fullPage: true,
  });
});
