import { addStepAfter } from './step-actions.js';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CoachingSequenceSchema } from '@hockey-iq/contracts';

const tab = (page: Page, name: 'Équipes' | 'Joueur' | 'Étape' | 'Patinoire') =>
  page.getByRole('tab', { name, exact: true });
const xField = (page: Page) =>
  page.getByRole('spinbutton', { name: 'X (m)', exact: true });
const addButton = (page: Page) =>
  page.getByRole('button', { name: 'Insérer une étape', exact: true });
const recordButton = (page: Page) =>
  page.getByRole('button', { name: 'Enregistrer l’étape', exact: true });

async function open(page: Page) {
  await page.goto('/editor-local');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
}
async function create(page: Page) {
  await open(page);
  await page
    .getByRole('button', { name: 'Créer une séquence', exact: true })
    .click();
  await addStepAfter(page);
  await xField(page).fill('20');
  await xField(page).press('Tab');
  await recordButton(page).click();
}
async function exported(page: Page) {
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exporter JSON', exact: true })
    .click();
  const file = await pending;
  return CoachingSequenceSchema.parse(
    JSON.parse(await readFile(await file.path(), 'utf8')),
  );
}
async function seek(page: Page, time: number) {
  await page
    .getByRole('slider', { name: 'Curseur de lecture', exact: true })
    .evaluate((element, value) => {
      const input = element as HTMLInputElement;
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, time);
}

test('BKL-008 inspector tabs support keyboard, empty state, player and puck selection at responsive widths', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  const player = tab(page, 'Joueur');
  const step = tab(page, 'Étape');
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(player).toHaveAttribute('aria-selected', 'true');
  await expect(step).toHaveAttribute('tabindex', '-1');
  await player.focus();
  await page.keyboard.press('ArrowRight');
  await expect(step).toBeFocused();
  await expect(step).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(
    page.getByRole('tabpanel', { name: 'Étape', exact: true }),
  ).toContainText('Créez une séquence');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('tabpanel', { name: 'Étape', exact: true }),
  ).toBeFocused();
  await step.focus();
  await page.keyboard.press('ArrowRight');
  await expect(tab(page, 'Patinoire')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(tab(page, 'Équipes')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(player).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tab(page, 'Équipes')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tab(page, 'Équipes')).toBeFocused();
  await page.keyboard.press('End');
  await expect(tab(page, 'Patinoire')).toBeFocused();
  await player.click();
  await xField(page).fill('27');
  // Clicking a tab must commit the focused field to the same selected entity.
  await step.click();
  await player.click();
  await expect(xField(page)).toHaveValue('27');
  await tab(page, 'Équipes').click();
  await page.locator('.puck-row').click();
  await expect(page.locator('.selection-summary h3')).toHaveText('Rondelle');
  await expect(
    page.getByRole('textbox', { name: 'Numéro ou étiquette', exact: true }),
  ).toHaveCount(0);
  await expect(xField(page)).toBeEnabled();
  await tab(page, 'Équipes').click();
  await page.locator('.roster-list button').nth(1).click();
  await expect(page.locator('.selection-summary h3')).toHaveText('Centre');
  await page
    .getByRole('button', { name: 'Créer une séquence', exact: true })
    .click();
  await step.click();
  await expect(page.locator('.timeline-inspector')).toHaveCount(1);
  await expect(
    page.locator('.timeline-editor .timeline-inspector'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('spinbutton', { name: 'Temps de l’étape (s)', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Supprimer l’étape', exact: true }),
  ).toBeDisabled();
  const original = page.viewportSize()!;
  for (const width of isMobile ? [320, 360, 430] : [800, 1024, 1440]) {
    await page.setViewportSize({ width, height: original.height });
    for (const name of ['Équipes', 'Joueur', 'Étape', 'Patinoire'] as const) {
      await tab(page, name).click();
      await expect(
        page.getByRole('tabpanel', { name, exact: true }),
      ).toBeVisible();
      expect(
        await page.locator('.inspector-panel').evaluate((panel) => {
          const box = panel.getBoundingClientRect();
          return (
            Array.from(panel.querySelectorAll('input,select,button'))
              .filter((el) => el.getClientRects().length)
              .every((el) => {
                const rect = el.getBoundingClientRect();
                return rect.left >= box.left && rect.right <= box.right;
              }) && document.documentElement.scrollWidth <= innerWidth
          );
        }),
      ).toBe(true);
    }
  }
  await page.setViewportSize(original);
  await player.click();
  await page
    .locator('.inspector-panel')
    .screenshot({ path: info.outputPath('player-tab.png') });
  await step.click();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(step).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('tabpanel', { name: 'Étape', exact: true }),
  ).toContainText('Créez une séquence');
  await player.click();
  await page
    .getByRole('button', { name: 'Avancer d’un pas', exact: true })
    .click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'paused',
  );
  await expect(xField(page)).toBeDisabled();
  await step.click();
  await expect(
    page.getByRole('tabpanel', { name: 'Étape', exact: true }),
  ).toContainText('Créez une séquence');
});

test('BKL-008 step tab preserves unsaved poses and edits Observation metadata with history and persistence', async ({
  page,
}, info) => {
  await create(page);
  await xField(page).fill('25');
  await tab(page, 'Étape').click();
  await expect(page.locator('.pending-step')).toBeVisible();
  const time = page.getByRole('spinbutton', {
    name: 'Temps de l’étape (s)',
    exact: true,
  });
  const remove = page.getByRole('button', {
    name: 'Supprimer l’étape',
    exact: true,
  });
  await expect(time).toBeDisabled();
  await expect(remove).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Nom de l’étape', exact: true })
    .fill('Soutien');
  await page
    .getByRole('textbox', { name: 'Nom de l’étape', exact: true })
    .press('Tab');
  await page
    .getByLabel('Type d’étape', { exact: true })
    .selectOption('observation');
  await page
    .getByLabel('Joueur qui observe', { exact: true })
    .selectOption({ index: 1 });
  const target = page.getByLabel('Où regarder', { exact: true });
  await target.selectOption({ index: 2 });
  await expect(page.locator('.rink-observation')).toBeVisible();
  await target.selectOption('point');
  await page.getByLabel('Regard X (m)', { exact: true }).fill('18');
  await page.getByLabel('Regard X (m)', { exact: true }).press('Tab');
  await page.getByLabel('Regard Y (m)', { exact: true }).fill('8');
  await page.getByLabel('Regard Y (m)', { exact: true }).press('Tab');
  await page
    .getByLabel('Question ou consigne', { exact: true })
    .fill('Où se trouve le soutien ?');
  await tab(page, 'Joueur').click();
  await expect(xField(page)).toHaveValue('25');
  await expect(addButton(page)).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Lire la séquence', exact: true }),
  ).toBeDisabled();
  await recordButton(page).click();
  await expect(page.locator('.pending-step')).toHaveCount(0);
  await tab(page, 'Étape').click();
  await expect(time).toBeEnabled();
  await time.fill('3');
  await time.press('Tab');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(time).toHaveValue('2');
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(time).toHaveValue('3');
  await page
    .locator('.inspector-panel')
    .screenshot({ path: info.outputPath('step-tab.png') });
  const before = await exported(page);
  expect(before.steps[1]!.label).toBe('Soutien');
  expect(before.steps[1]!.pose.players[0]!.pos.x).toBe(25);
  expect(before.steps[1]!.observation).toMatchObject({
    lookAt: { kind: 'point', point: { x: 18, y: 8 } },
    prompt: 'Où se trouve le soutien ?',
  });
  expect(before.steps[1]!.observation!.playerId).toBe(
    before.scenario.players[1]!.id,
  );
  await tab(page, 'Joueur').click();
  await tab(page, 'Équipes').click();
  await page.locator('.roster-list button').nth(1).click();
  await expect(page.locator('.selection-summary h3')).toHaveText('Centre');
  await tab(page, 'Étape').click();
  await expect(
    page.getByRole('textbox', { name: 'Nom de l’étape', exact: true }),
  ).toHaveValue('Soutien');
  expect(await exported(page)).toEqual(before);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await tab(page, 'Étape').click();
  await expect(time).toHaveValue('0');
  await expect(remove).toBeDisabled();
  await page
    .getByRole('button', { name: 'Étape 2 : Soutien', exact: true })
    .click();
  await expect(time).toHaveValue('3');
  await expect(
    page.getByLabel('Question ou consigne', { exact: true }),
  ).toHaveValue('Où se trouve le soutien ?');
  expect(await exported(page)).toEqual(before);
  await remove.click();
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(time).toHaveValue('3');
  expect(await exported(page)).toEqual(before);
});

test('BKL-008 step properties identify the selected pose and remain read-only during preview and playback', async ({
  page,
}) => {
  await create(page);
  await tab(page, 'Étape').click();
  await seek(page, 1000);
  const name = page.getByRole('textbox', {
    name: 'Nom de l’étape',
    exact: true,
  });
  await expect(page.locator('.step-summary')).toContainText(
    'Étape sélectionnée · 00:02.00',
  );
  await expect(page.locator('.step-preview-note')).toContainText(
    'Aperçu à 00:01.00',
  );
  await expect(name).toBeDisabled();
  await expect(page.getByLabel('Type d’étape', { exact: true })).toBeDisabled();
  await tab(page, 'Joueur').click();
  await expect(xField(page)).toHaveValue('30');
  await expect(xField(page)).toBeDisabled();
  await tab(page, 'Étape').click();
  await page
    .getByRole('button', { name: 'Insérer une étape ici', exact: true })
    .click();
  await expect(name).toHaveValue('Étape insérée');
  await expect(name).toBeEnabled();
  await expect(page.locator('.step-preview-note')).toHaveCount(0);
  await expect(
    page.getByRole('spinbutton', { name: 'Temps de l’étape (s)', exact: true }),
  ).toHaveValue('1');
  const before = await exported(page);
  await page
    .getByRole('button', { name: 'Revenir au début', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Lire la séquence', exact: true })
    .click();
  await expect(name).toBeDisabled();
  await expect(addButton(page)).toBeDisabled();
  await expect(recordButton(page)).toBeDisabled();
  await page
    .getByRole('button', { name: 'Pause de la séquence', exact: true })
    .click();
  await expect(name).toBeDisabled();
  await page
    .getByRole('button', { name: 'Étape 2 : Étape insérée', exact: true })
    .click();
  await expect(name).toBeEnabled();
  expect(await exported(page)).toEqual(before);
});

test('BKL-009 compact add and record icons retain tooltips, keyboard actions and capture guards', async ({
  page,
  isMobile,
}, info) => {
  await create(page);
  const add = addButton(page),
    record = recordButton(page);
  for (const [button, name] of [
    [add, 'Insérer une étape'],
    [record, 'Enregistrer l’étape'],
  ] as const) {
    await expect(button).toHaveText('');
    await expect(button).toHaveAttribute('data-tooltip', name);
    const box = (await button.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(36);
    expect(box.height).toBeGreaterThanOrEqual(30);
  }
  await expect(add.locator('svg')).toHaveCount(1);
  await expect(record.locator('.record-dot')).toBeVisible();
  await add.focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('menuitem', { name: 'Ajouter une étape après', exact: true })
    .click();
  await expect(page.locator('.timeline-clip')).toHaveCount(3);
  await xField(page).fill('16');
  await xField(page).press('Tab');
  await expect(add).toBeDisabled();
  await expect(record).toBeEnabled();
  await record.focus();
  await page.keyboard.press('Space');
  await expect(add).toBeEnabled();
  if (isMobile) {
    await add.tap();
    await page
      .getByRole('menuitem', { name: 'Ajouter une étape après', exact: true })
      .tap();
    await expect(page.locator('.timeline-clip')).toHaveCount(4);
    await xField(page).fill('12');
    await xField(page).press('Tab');
    await record.tap();
    await expect(page.locator('.pending-step')).toHaveCount(0);
  }
  const before = await exported(page);
  expect(before.steps[2]!.pose.players[0]!.pos.x).toBe(16);
  if (isMobile) expect(before.steps[3]!.pose.players[0]!.pos.x).toBe(12);
  await seek(page, 3000);
  await expect(record).toBeDisabled();
  await page
    .getByRole('button', { name: 'Revenir au début', exact: true })
    .click();
  expect(await exported(page)).toEqual(before);
  await page
    .locator('.timeline-transport')
    .screenshot({ path: info.outputPath('compact-toolbar.png') });
});
