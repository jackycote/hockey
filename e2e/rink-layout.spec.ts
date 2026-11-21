import { addStepAfter, openRinkZoom } from './step-actions.js';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CoachingSequenceSchema, ScenarioSchema } from '@hockey-iq/contracts';

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const tab = (page: Page, name: string) =>
  page.getByRole('tab', { name, exact: true });
const xField = (page: Page) =>
  page.getByRole('spinbutton', { name: 'X (m)', exact: true });
async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
}
async function exported(page: Page) {
  const pending = page.waitForEvent('download');
  await button(page, 'Exporter JSON').click();
  return JSON.parse(
    await readFile(await (await pending).path(), 'utf8'),
  ) as unknown;
}
async function expectRinkAlignment(page: Page, hasTimeline: boolean) {
  await expect(page.locator('.rink-topline')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate((montage) => {
        const surface = document
          .querySelector('.rink-surface')!
          .getBoundingClientRect();
        const board = document
          .querySelector('.rink-board')!
          .getBoundingClientRect();
        const timeline = document
          .querySelector('.timeline-editor')
          ?.getBoundingClientRect();
        return (
          Math.abs(surface.top - board.top) <= 1 &&
          (!montage ||
            (!!timeline &&
              Math.abs(board.bottom - timeline.top) <= 1 &&
              Math.abs(board.left - timeline.left) <= 1 &&
              Math.abs(board.width - timeline.width) <= 1)) &&
          document.documentElement.scrollWidth <= innerWidth
        );
      }, hasTimeline),
    )
    .toBe(true);
}

test('BKL-014 gives the removed band height to the viewport and keeps dimensions and mode information available', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  const original = page.viewportSize()!;
  // Viewport and band measurements captured before removing rink-topline.
  const measurements = isMobile
    ? [
        { width: 320, before: 270, recovered: 27 },
        { width: 390, before: 270, recovered: 27 },
        { width: 820, before: 340, recovered: 28 },
      ]
    : [
        { width: 800, before: 340, recovered: 28 },
        { width: 1280, before: 384, recovered: 28 },
        { width: 1600, before: 440, recovered: 28 },
      ];
  for (const { width, before, recovered } of measurements) {
    await page.setViewportSize({ width, height: original.height });
    await expectRinkAlignment(page, false);
    await expect
      .poll(
        async () => (await page.locator('.rink-board').boundingBox())!.height,
      )
      .toBe(before + recovered);
    await expect(xField(page)).toHaveValue('40');
  }
  await page.setViewportSize(original);
  const scenario = ScenarioSchema.parse(await exported(page));
  scenario.rink.length = 64;
  scenario.rink.width = 28;
  await page.getByLabel('Importer', { exact: true }).setInputFiles({
    name: 'rink.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(scenario)),
  });
  await tab(page, 'Patinoire').click();
  await expect(page.locator('.rink-dimensions')).toContainText(
    'Dimensions de la patinoire',
  );
  await expect(page.locator('.rink-dimensions dd')).toHaveText('64 × 28 m');
  await button(page, 'Avancer d’un pas').click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'paused',
  );
  await expectRinkAlignment(page, false);
  await expect(page.locator('.simulation-controls .sim-hint')).toBeVisible();
  await button(page, 'Modifier la situation initiale').click();
  await button(page, 'Créer une séquence').click();
  await expectRinkAlignment(page, true);
  await addStepAfter(page);
  await tab(page, 'Joueur').click();
  await xField(page).fill('20');
  await xField(page).press('Tab');
  await button(page, 'Enregistrer l’étape').click();
  await tab(page, 'Étape').click();
  const label = page.getByRole('textbox', {
    name: 'Nom de l’étape',
    exact: true,
  });
  await label.fill('Soutien');
  await label.press('Tab');
  await expect(page.locator('.step-summary')).toContainText('Soutien');
  await page
    .getByRole('slider', { name: 'Curseur de lecture', exact: true })
    .evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '1000';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  await expectRinkAlignment(page, true);
  await expect(page.locator('.timeline-status')).toContainText('Aperçu à');
  await expect(label).toBeDisabled();
  await tab(page, 'Patinoire').click();
  await expect(page.locator('.rink-dimensions dd')).toHaveText('64 × 28 m');
  await button(page, 'Revenir au début').click();
  await page.screenshot({
    path: info.outputPath('workspace.png'),
    fullPage: true,
  });
  await page
    .locator('.inspector-panel')
    .screenshot({ path: info.outputPath('rink-dimensions.png') });
});

test('BKL-015 footer replaces the visible hint and preserves view controls without changing the document or history', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  const before = ScenarioSchema.parse(await exported(page));
  const footer = page.locator('.rink-panel > .rink-bottomline');
  await expect(footer).toHaveCount(1);
  await expect(page.locator('.rink-surface .rink-bottomline')).toHaveCount(0);
  await expect(page.locator('.tool-hint')).toHaveCount(0);
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'aria-describedby',
    'rink-help',
  );
  await expect(page.locator('#rink-help')).toContainText('Flèches');
  const original = page.viewportSize()!;
  for (const width of isMobile
    ? [320, 390, 430, 820]
    : [800, 1024, 1280, 1600]) {
    await page.setViewportSize({ width, height: original.height });
    await expect
      .poll(() =>
        footer.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const workspace = document
            .querySelector('.rink-workspace')!
            .getBoundingClientRect();
          const panel = document
            .querySelector('.rink-panel')!
            .getBoundingClientRect();
          const legend = el
            .querySelector('.team-legend')!
            .getBoundingClientRect();
          const controls = document
            .querySelector('.tools')!
            .getBoundingClientRect();
          const board = document
            .querySelector('.rink-board')!
            .getBoundingClientRect();
          return (
            rect.top >= workspace.bottom &&
            Math.abs(rect.width - panel.width + 2) <= 1 &&
            legend.left >= rect.left &&
            legend.right <= rect.right &&
            controls.right <= board.left &&
            controls.height <= board.height &&
            !el.querySelector('button') &&
            document.documentElement.scrollWidth <= innerWidth
          );
        }),
      )
      .toBe(true);
  }
  await page.setViewportSize(original);
  const plus = button(page, 'Agrandir'),
    minus = button(page, 'Réduire');
  const percentage = page.locator('.rink-board');
  await openRinkZoom(page);
  if (isMobile) await plus.tap();
  else await plus.click();
  await expect(percentage).toHaveAttribute('data-zoom', '120');
  await minus.focus();
  await page.keyboard.press('Enter');
  await expect(percentage).toHaveAttribute('data-zoom', '100');
  await plus.focus();
  await page.keyboard.press('Space');
  await expect(percentage).toHaveAttribute('data-zoom', '120');
  await button(page, 'Cadrer la patinoire').click();
  await expect(percentage).toHaveAttribute('data-zoom', '100');
  await button(page, 'Inverser la vue').click();
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-flipped',
    'true',
  );
  await expect(xField(page)).toHaveValue('40');
  expect(ScenarioSchema.parse(await exported(page))).toEqual(before);
  await expect(button(page, 'Annuler')).toBeDisabled();
  await button(page, 'Créer une séquence').click();
  await addStepAfter(page);
  const sequence = CoachingSequenceSchema.parse(await exported(page));
  await page
    .getByRole('combobox', { name: 'Vitesse de la séquence', exact: true })
    .selectOption('0.25');
  await button(page, 'Revenir au début').click();
  await button(page, 'Lire la séquence').click();
  await openRinkZoom(page);
  await expect(plus).toBeEnabled();
  await button(page, 'Pause de la séquence').click();
  await openRinkZoom(page);
  await plus.click();
  await expect(percentage).toHaveAttribute('data-zoom', '120');
  await button(page, 'Revenir au début').click();
  expect(CoachingSequenceSchema.parse(await exported(page))).toEqual(sequence);
  await footer.screenshot({ path: info.outputPath('footer.png') });
});
