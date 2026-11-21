import { addStepAfter } from './step-actions.js';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CoachingSequenceSchema } from '@hockey-iq/contracts';
async function openSequence(page: Page) {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page
    .getByRole('button', { name: 'Créer une séquence', exact: true })
    .click();
  await addStepAfter(page);
  const x = page.getByRole('spinbutton', { name: 'X (m)', exact: true });
  await x.fill('20');
  await x.press('Tab');
  await expect(
    page.getByText('Positions modifiées', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Enregistrer l’étape', exact: true })
    .click();
}
async function scrub(page: Page, time: number) {
  await page
    .getByRole('slider', { name: 'Curseur de lecture' })
    .evaluate((element, at) => {
      const input = element as HTMLInputElement;
      input.value = String(at);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, time);
}
async function exportSequence(page: Page) {
  const next = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exporter JSON', exact: true })
    .click();
  const file = await next;
  expect(file.suggestedFilename()).toBe('hockey-iq-sequence.json');
  return CoachingSequenceSchema.parse(
    JSON.parse(await readFile(await file.path(), 'utf8')),
  );
}
test('records poses, scrubs between them, inserts a step, and restores the sequence on reload', async ({
  page,
}, info) => {
  await openSequence(page);
  await expect(
    page.getByRole('slider', { name: 'Curseur de lecture' }),
  ).toHaveAttribute('max', '2000');
  await scrub(page, 1000);
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toHaveValue('30');
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.rink-motion-chevron')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Insérer une étape ici' }).click();
  await expect(page.locator('.timeline-clip')).toHaveCount(3);
  await page.getByRole('tab', { name: 'Étape', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Temps de l’étape (s)' }),
  ).toHaveValue('1');
  await page.getByRole('tab', { name: 'Joueur', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toBeEnabled();
  const sequence = await exportSequence(page);
  expect(sequence.steps.map((s) => s.atMs)).toEqual([0, 1000, 2000]);
  expect(sequence.steps[1]!.pose.players[0]!.pos.x).toBe(30);
  expect(sequence.steps[2]!.pose.players[0]!.pos.x).toBe(20);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await expect(page.locator('.timeline-clip')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Étape 2 : Étape insérée', exact: true })
    .click();
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toHaveValue('30');
  await page
    .getByRole('region', { name: 'Montage de la séquence' })
    .screenshot({ path: info.outputPath('timeline.png') });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('pauses at an Observation marker, shows the look cue, and resumes without mutating recorded positions', async ({
  page,
}) => {
  await openSequence(page);
  await scrub(page, 1000);
  await page.getByRole('button', { name: 'Insérer une étape ici' }).click();
  await page.getByRole('tab', { name: 'Étape', exact: true }).click();
  await page
    .getByLabel('Type d’étape', { exact: true })
    .selectOption('observation');
  await page
    .getByLabel('Question ou consigne', { exact: true })
    .fill('Quelle passe est libre ?');
  await page.getByLabel('Question ou consigne', { exact: true }).press('Tab');
  await expect(page.locator('.observation-clip')).toHaveCount(1);
  await expect(page.locator('.rink-observation')).toBeVisible();
  await page
    .getByRole('button', { name: 'Étape 1 : Départ', exact: true })
    .click();
  const before = await exportSequence(page);
  await page
    .getByRole('button', { name: 'Lire la séquence', exact: true })
    .click();
  await expect(page.getByTestId('timeline-time')).toHaveText('00:01.00');
  await expect(
    page.getByRole('button', { name: 'Lire la séquence', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.observation-callout')).toContainText(
    'Quelle passe est libre ?',
  );
  await page
    .getByRole('button', { name: 'Lire la séquence', exact: true })
    .click();
  await expect(page.getByTestId('timeline-time')).toHaveText('00:02.00');
  expect(await exportSequence(page)).toEqual(before);
});
test('retimes with numeric controls, supports clip dragging, deletion, and undo', async ({
  page,
  isMobile,
}) => {
  await openSequence(page);
  await page.getByRole('tab', { name: 'Étape', exact: true }).click();
  const time = page.getByRole('spinbutton', {
    name: 'Temps de l’étape (s)',
    exact: true,
  });
  await time.fill('3');
  await time.press('Tab');
  await expect(
    page.getByRole('slider', { name: 'Curseur de lecture' }),
  ).toHaveAttribute('max', '3000');
  if (!isMobile) {
    const clip = page.getByRole('button', {
      name: 'Étape 2 : Étape 2',
      exact: true,
    });
    await clip.scrollIntoViewIfNeeded();
    const box = (await clip.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 55, box.y + 20, { steps: 5 });
    await page.mouse.up();
    await expect(time).toHaveValue('3.5');
  }
  await page
    .getByRole('button', { name: 'Supprimer l’étape', exact: true })
    .click();
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('.timeline-clip')).toHaveCount(2);
});

test('BKL-001 keeps the timeline directly under the viewport at the same width after resizing', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  async function expectAlignment() {
    await expect
      .poll(async () =>
        page.locator('.rink-board').evaluate((board) => {
          const timeline = board.nextElementSibling;
          if (!timeline?.classList.contains('timeline-editor')) return false;
          const rink = board.getBoundingClientRect(),
            montage = timeline.getBoundingClientRect();
          return (
            Math.abs(rink.left - montage.left) <= 1 &&
            Math.abs(rink.right - montage.right) <= 1 &&
            Math.abs(rink.bottom - montage.top) <= 1
          );
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (page.viewportSize()!.width <= 760) {
      const timeline = (await page.locator('.timeline-editor').boundingBox())!;
      const inspector = (await page.locator('.inspector-panel').boundingBox())!;
      expect(inspector.y).toBeGreaterThanOrEqual(timeline.y + timeline.height);
    }
  }
  await expect(page.locator('.timeline-editor')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Créer une séquence', exact: true })
    .click();
  await addStepAfter(page);
  await expectAlignment();
  const original = page.viewportSize()!;
  for (const width of isMobile ? [360, 430, 820] : [1024, 800, 1440]) {
    await page.setViewportSize({ width, height: original.height });
    await expectAlignment();
  }
  await page.setViewportSize(original);
  await page.getByRole('tab', { name: 'Étape', exact: true }).click();
  const time = page.getByRole('spinbutton', {
    name: 'Temps de l’étape (s)',
    exact: true,
  });
  await time.fill('30');
  await time.press('Tab');
  await expect
    .poll(() =>
      page
        .locator('.timeline-scroll')
        .evaluate((el) => el.scrollWidth > el.clientWidth),
    )
    .toBe(true);
  await expectAlignment();
  await page.locator('.timeline-scroll').evaluate((el) => {
    el.scrollLeft = 300;
  });
  await page
    .getByRole('button', { name: 'Revenir au début', exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator('.timeline-scroll').evaluate((el) => el.scrollLeft),
    )
    .toBe(0);
  await expectAlignment();
  await page
    .locator('.rink-panel')
    .screenshot({ path: info.outputPath('rink-timeline.png') });
});

test('BKL-002 returns from a paused preview, running playback, and the end without changing the saved sequence', async ({
  page,
}) => {
  await openSequence(page);
  await page.getByRole('tab', { name: 'Étape', exact: true }).click();
  await page
    .getByLabel('Type d’étape', { exact: true })
    .selectOption('observation');
  await page
    .getByLabel('Question ou consigne', { exact: true })
    .fill('Où est le soutien ?');
  await page.getByLabel('Question ou consigne', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const before = await exportSequence(page);
  const rewind = page.getByRole('button', {
    name: 'Revenir au début',
    exact: true,
  });
  await expect(rewind).toHaveAttribute('data-tooltip', 'Revenir au début');
  async function expectStart() {
    await page.getByRole('tab', { name: 'Joueur', exact: true }).click();
    await expect(page.getByTestId('timeline-time')).toHaveText('00:00.00');
    await expect(
      page.getByRole('button', { name: 'Étape 1 : Départ', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Lire la séquence', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
    ).toHaveValue('40');
    await expect(
      page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
    ).toBeEnabled();
    expect(await exportSequence(page)).toEqual(before);
  }
  await scrub(page, 1000);
  await rewind.click();
  await expectStart();
  // Rewinding is transport-only: it does not add an undo entry ahead of the last document edit.
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(
    page.getByLabel('Question ou consigne', { exact: true }),
  ).toHaveValue('');
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await rewind.click();
  await expectStart();
  await page
    .getByRole('button', { name: 'Lire la séquence', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Pause de la séquence', exact: true }),
  ).toBeVisible();
  await expect(rewind).toBeEnabled();
  await rewind.click();
  await expectStart();
  await page
    .getByRole('button', { name: 'Lire la séquence', exact: true })
    .click();
  await expect(page.getByTestId('timeline-time')).toHaveText('00:02.00');
  await rewind.focus();
  await page.keyboard.press('Space');
  await expectStart();
  // A focused transport button must activate normally rather than trigger the timeline's Space shortcut.
  await expect(
    page.getByRole('button', { name: 'Pause de la séquence', exact: true }),
  ).toHaveCount(0);
});

test('BKL-002 preserves unrecorded positions until they are recorded or restored', async ({
  page,
}) => {
  await openSequence(page);
  const x = page.getByRole('spinbutton', { name: 'X (m)', exact: true });
  await x.fill('22');
  await x.press('Tab');
  const rewind = page.getByRole('button', {
    name: 'Revenir au début',
    exact: true,
  });
  await rewind.click();
  await expect(page.locator('.timeline-error')).toContainText(
    'Enregistrez les positions',
  );
  await expect(x).toHaveValue('22');
  await expect(
    page.getByRole('button', { name: 'Étape 2 : Étape 2', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('timeline-time')).toHaveText('00:02.00');
  await page
    .getByRole('button', { name: 'Enregistrer l’étape', exact: true })
    .click();
  await rewind.click();
  await expect(page.getByTestId('timeline-time')).toHaveText('00:00.00');
  expect((await exportSequence(page)).steps[1]!.pose.players[0]!.pos.x).toBe(
    22,
  );
  await page
    .getByRole('button', { name: 'Étape 2 : Étape 2', exact: true })
    .click();
  await x.fill('25');
  await x.press('Tab');
  await rewind.click();
  await expect(x).toHaveValue('25');
  await page
    .getByRole('button', {
      name: 'Rétablir les positions enregistrées',
      exact: true,
    })
    .click();
  await rewind.click();
  await expect(page.getByTestId('timeline-time')).toHaveText('00:00.00');
  expect((await exportSequence(page)).steps[1]!.pose.players[0]!.pos.x).toBe(
    22,
  );
});

test('BKL-002 handles a sequence with only its initial pose and supports Enter activation', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page
    .getByRole('button', { name: 'Créer une séquence', exact: true })
    .click();
  const before = await exportSequence(page);
  const rewind = page.getByRole('button', {
    name: 'Revenir au début',
    exact: true,
  });
  await rewind.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('timeline-time')).toHaveText('00:00.00');
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Lire la séquence', exact: true }),
  ).toBeDisabled();
  expect(await exportSequence(page)).toEqual(before);
});

test('BKL-004 places a single full-width header above the workspace and keeps actions on the navigation row', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const header = page.getByRole('region', {
    name: 'En-tête de la séquence',
    exact: true,
  });
  async function expectHeaderAlignment() {
    await expect(header).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Montage', exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByText('SÉQUENCE PÉDAGOGIQUE', { exact: true }),
    ).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const header = document
            .querySelector('.sequence-heading')!
            .getBoundingClientRect();
          const layout = document
            .querySelector('.editor-layout')!
            .getBoundingClientRect();
          const panels = ['.rink-panel', '.inspector-panel'].map((s) =>
            document.querySelector(s)!.getBoundingClientRect(),
          );
          return (
            Math.abs(header.left - layout.left) <= 1 &&
            Math.abs(header.right - layout.right) <= 1 &&
            panels.every((p) => p.top >= header.bottom)
          );
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(header).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Créer une séquence', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.timeline-editor')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Créer une séquence', exact: true })
    .click();
  await expectHeaderAlignment();
  await expect(header.locator('.timeline-count')).toContainText(
    '1 / 120 étapes',
  );
  await addStepAfter(page);
  await expect(header.locator('.timeline-count')).toContainText(
    '2 / 120 étapes',
  );
  await expect(header.locator('.timeline-count')).toContainText('00:02.00');
  const original = page.viewportSize()!;
  for (const width of [
    original.width,
    ...(isMobile ? [360, 430, 820] : [1440, 1024, 800]),
  ]) {
    await page.setViewportSize({ width, height: original.height });
    await expectHeaderAlignment();
    await expect(
      page.locator('.timeline-editor .timeline-heading'),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.locator('.timeline-command-row').evaluate((row) => {
          const buttons = Array.from(row.querySelectorAll('button'));
          const centers = buttons.map((b) => {
            const r = b.getBoundingClientRect();
            return r.top + r.height / 2;
          });
          return (
            buttons.length === 8 &&
            Math.max(...centers) - Math.min(...centers) <= 1
          );
        }),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.locator('.rink-board').evaluate((board) => {
          const montage = board.nextElementSibling!;
          const a = board.getBoundingClientRect(),
            b = montage.getBoundingClientRect();
          return (
            montage.classList.contains('timeline-editor') &&
            Math.abs(a.bottom - b.top) <= 1 &&
            Math.abs(a.left - b.left) <= 1 &&
            Math.abs(a.right - b.right) <= 1
          );
        }),
      )
      .toBe(true);
    if (width <= 430)
      await expect
        .poll(() =>
          page
            .locator('.timeline-command-scroll')
            .evaluate((el) => el.scrollWidth > el.clientWidth),
        )
        .toBe(true);
  }
  await page.setViewportSize(original);
  await header.screenshot({ path: info.outputPath('sequence-heading.png') });
  await page
    .locator('.timeline-transport')
    .screenshot({ path: info.outputPath('sequence-commands.png') });
  await page.screenshot({
    path: info.outputPath('workspace.png'),
    fullPage: true,
  });
});

test('BKL-004 keeps the moved actions reachable by keyboard and preserves capture, navigation, and reload', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const header = page.getByRole('region', {
    name: 'En-tête de la séquence',
    exact: true,
  });
  const create = page.getByRole('button', {
    name: 'Créer une séquence',
    exact: true,
  });
  await create.focus();
  await page.keyboard.press('Enter');
  const add = page.getByRole('button', {
    name: 'Insérer une étape',
    exact: true,
  });
  const record = page.getByRole('button', {
    name: 'Enregistrer l’étape',
    exact: true,
  });
  await page
    .getByRole('group', { name: 'Commandes des étapes', exact: true })
    .focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Revenir au début', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(add).toBeFocused();
  await page.keyboard.press('Enter');
  await page
    .getByRole('menuitem', { name: 'Ajouter une étape après', exact: true })
    .click();
  const x = page.getByRole('spinbutton', { name: 'X (m)', exact: true });
  await x.fill('20');
  await x.press('Tab');
  await expect(add).toBeDisabled();
  await expect(record).toBeEnabled();
  await record.focus();
  await expect
    .poll(() =>
      record.evaluate((button) => {
        const scroll = button
          .closest('.timeline-command-scroll')!
          .getBoundingClientRect();
        const box = button.getBoundingClientRect();
        return box.left >= scroll.left - 1 && box.right <= scroll.right + 1;
      }),
    )
    .toBe(true);
  await page.keyboard.press('Space');
  await expect(page.locator('.pending-step')).toHaveCount(0);
  await expect(add).toBeEnabled();
  await addStepAfter(page);
  await expect(header.locator('.timeline-count')).toContainText(
    '3 / 120 étapes',
  );
  await expect(header.locator('.timeline-count')).toContainText('00:04.00');
  await page
    .getByRole('button', { name: 'Étape précédente', exact: true })
    .click();
  await expect(page.getByTestId('timeline-time')).toHaveText('00:02.00');
  await expect(x).toHaveValue('20');
  await page
    .getByRole('button', { name: 'Revenir au début', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Lire la séquence', exact: true })
    .click();
  await expect(record).toBeDisabled();
  await expect(add).toBeDisabled();
  await page
    .getByRole('button', { name: 'Pause de la séquence', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Revenir au début', exact: true })
    .click();
  const sequence = await exportSequence(page);
  expect(sequence.steps).toHaveLength(3);
  expect(sequence.steps[1]!.pose.players[0]!.pos.x).toBe(20);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await expect(header.locator('.timeline-count')).toContainText(
    '3 / 120 étapes',
  );
  await expect(header.locator('.timeline-count')).toContainText('00:04.00');
  await expect(page.locator('.timeline-clip')).toHaveCount(3);
  await page.screenshot({
    path: info.outputPath('workspace-with-steps.png'),
    fullPage: true,
  });
});

test('BKL-005 shows a compact left-aligned create action and replaces it with Montage without losing the pose', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const create = page.getByRole('button', {
    name: 'Créer une séquence',
    exact: true,
  });
  const original = page.viewportSize()!;
  for (const width of [
    original.width,
    ...(isMobile ? [360, 430] : [1440, 1024, 800]),
  ]) {
    await page.setViewportSize({ width, height: original.height });
    await expect(create).toBeVisible();
    await expect(page.locator('.sequence-heading')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Montage', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText('SÉQUENCE PÉDAGOGIQUE', { exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        create.evaluate((button) => {
          const action = button.getBoundingClientRect();
          const row = button
            .closest('.sequence-create')!
            .getBoundingClientRect();
          const rink = document
            .querySelector('.rink-panel')!
            .getBoundingClientRect();
          return (
            Math.abs(action.left - rink.left) <= 1 &&
            row.bottom <= rink.top &&
            row.height <= action.height + 1
          );
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize(original);
  await page
    .getByRole('button', { name: 'Donner la rondelle', exact: true })
    .click();
  const x = page.getByRole('spinbutton', { name: 'X (m)', exact: true });
  await x.fill('27');
  await x.press('Tab');
  const y = page.getByRole('spinbutton', { name: 'Y (m)', exact: true });
  await y.fill('9');
  await y.press('Tab');
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exporter JSON', exact: true })
    .click();
  const download = await downloadPromise;
  const before = JSON.parse(await readFile(await download.path(), 'utf8'));
  await page.screenshot({
    path: info.outputPath('before-creation.png'),
    fullPage: true,
  });
  await create.click();
  await expect(create).toHaveCount(0);
  await expect(page.locator('.sequence-create')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Montage', exact: true }),
  ).toHaveCount(1);
  await expect(page.locator('.sequence-heading')).toHaveCount(1);
  await expect(page.locator('.timeline-count')).toContainText('1 / 120 étapes');
  await expect(page.locator('.timeline-count')).toContainText('00:00.00');
  await expect(x).toHaveValue('27');
  await expect(y).toHaveValue('9');
  const captured = await exportSequence(page);
  expect(captured.steps[0]!.pose.players).toEqual(before.players);
  expect(captured.steps[0]!.pose.puck).toEqual(before.puck);
  expect(captured.scenario).toEqual(before);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const header = document
          .querySelector('.sequence-heading')!
          .getBoundingClientRect();
        const layout = document
          .querySelector('.editor-layout')!
          .getBoundingClientRect();
        return (
          Math.abs(header.left - layout.left) <= 1 &&
          Math.abs(header.right - layout.right) <= 1 &&
          header.bottom <= layout.top
        );
      }),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath('after-creation.png'),
    fullPage: true,
  });
});

test('BKL-005 restores the right header state across simulation, keyboard creation, reload, import and undo', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const create = page.getByRole('button', {
    name: 'Créer une séquence',
    exact: true,
  });
  await page
    .getByRole('button', { name: 'Avancer d’un pas', exact: true })
    .click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'paused',
  );
  await expect(create).toBeDisabled();
  await expect(page.locator('.sequence-heading')).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'Modifier la situation initiale',
      exact: true,
    })
    .click();
  await expect(create).toBeEnabled();
  await create.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.sequence-heading')).toHaveCount(1);
  await addStepAfter(page);
  const x = page.getByRole('spinbutton', { name: 'X (m)', exact: true });
  await x.fill('20');
  await x.press('Tab');
  await page
    .getByRole('button', { name: 'Enregistrer l’étape', exact: true })
    .click();
  const sequence = await exportSequence(page);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await expect(create).toHaveCount(0);
  await expect(page.locator('.sequence-heading')).toHaveCount(1);
  await expect(page.locator('.timeline-count')).toContainText('2 / 120 étapes');
  await expect(page.locator('.timeline-count')).toContainText('00:02.00');
  await page.getByLabel('Importer', { exact: true }).setInputFiles({
    name: 'scenario.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sequence.scenario)),
  });
  await expect(create).toBeVisible();
  await expect(page.locator('.sequence-heading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('.timeline-count')).toContainText('2 / 120 étapes');
  await expect(create).toHaveCount(0);
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(create).toBeVisible();
  await create.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.timeline-count')).toContainText('1 / 120 étapes');
  await expect(create).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(create).toBeVisible();
  await page.getByLabel('Importer', { exact: true }).setInputFiles({
    name: 'sequence.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sequence)),
  });
  await expect(create).toHaveCount(0);
  await expect(page.locator('.timeline-count')).toContainText('2 / 120 étapes');
  await page
    .getByRole('button', { name: 'Réinitialiser le scénario', exact: true })
    .click();
  await expect(create).toBeVisible();
  await expect(page.locator('.sequence-heading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('.timeline-count')).toContainText('2 / 120 étapes');
  expect(await exportSequence(page)).toEqual(sequence);
});

test('BKL-007 keeps commands, time and speed on a single line with bounded horizontal scrolling', async ({
  page,
  isMobile,
}, info) => {
  await openSequence(page);
  const original = page.viewportSize()!;
  for (const width of [
    original.width,
    ...(isMobile ? [320, 360, 430] : [1440, 1024, 800]),
  ]) {
    await page.setViewportSize({ width, height: original.height });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const toolbar = document
            .querySelector('.timeline-transport')!
            .getBoundingClientRect();
          const commands = document
            .querySelector('.timeline-command-scroll')!
            .getBoundingClientRect();
          const timing = document
            .querySelector('.timeline-playback')!
            .getBoundingClientRect();
          const centers = Array.from(
            document.querySelectorAll('.timeline-command-row button'),
          ).map((b) => {
            const r = b.getBoundingClientRect();
            return r.top + r.height / 2;
          });
          const mid = timing.top + timing.height / 2;
          return (
            centers.length === 8 &&
            centers.every((y) => Math.abs(y - mid) <= 1) &&
            commands.right <= timing.left &&
            timing.right <= toolbar.right &&
            toolbar.right - timing.right <= 10
          );
        }),
      )
      .toBe(true);
    const timingBefore = await page.locator('.timeline-playback').boundingBox();
    await page.locator('.timeline-command-scroll').evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const timingAfter = await page.locator('.timeline-playback').boundingBox();
    expect(timingAfter).toEqual(timingBefore);
    await expect(page.locator('.timeline-total')).toBeVisible();
    await expect(
      page.getByRole('combobox', {
        name: 'Vitesse de la séquence',
        exact: true,
      }),
    ).toBeVisible();
    const record = page.getByRole('button', {
      name: 'Enregistrer l’étape',
      exact: true,
    });
    await page
      .getByRole('group', { name: 'Commandes des étapes', exact: true })
      .focus();
    await record.focus();
    await expect
      .poll(() =>
        record.evaluate((button) => {
          const clip = button
              .closest('.timeline-command-scroll')!
              .getBoundingClientRect(),
            rect = button.getBoundingClientRect();
          return rect.left >= clip.left - 1 && rect.right <= clip.right + 1;
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize(original);
  const insert = page.getByRole('button', {
    name: 'Insérer une étape ici',
    exact: true,
  });
  await expect(insert).toHaveText('');
  await expect(insert).toHaveAttribute('data-tooltip', 'Insérer une étape ici');
  await expect(insert).toBeDisabled();
  await scrub(page, 1000);
  await expect(insert).toBeEnabled();
  await insert.click();
  await expect(page.locator('.timeline-clip')).toHaveCount(3);
  expect((await exportSequence(page)).steps.map((s) => s.atMs)).toEqual([
    0, 1000, 2000,
  ]);
  await page
    .getByRole('combobox', { name: 'Vitesse de la séquence', exact: true })
    .selectOption('0.5');
  await expect(
    page.getByRole('combobox', { name: 'Vitesse de la séquence', exact: true }),
  ).toHaveValue('0.5');
  await page.locator('.timeline-command-scroll').evaluate((el) => {
    el.scrollLeft = 0;
  });
  await page
    .locator('.timeline-transport')
    .screenshot({ path: info.outputPath('toolbar.png') });
});

test('BKL-007 vertical zoom supports keyboard, pointer, touch and dismissal without changing the sequence', async ({
  page,
  isMobile,
}, info) => {
  await openSequence(page);
  const before = await exportSequence(page);
  const button = page.getByRole('button', {
    name: 'Zoom de la timeline',
    exact: true,
  });
  const slider = page.getByRole('slider', {
    name: 'Zoom de la timeline',
    exact: true,
  });
  const dialog = page.getByRole('dialog', {
    name: 'Zoom de la timeline',
    exact: true,
  });
  await expect(slider).toHaveCount(0);
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(slider).toBeFocused();
  await expect(slider).toHaveAttribute('aria-orientation', 'vertical');
  await expect(slider).toHaveValue('90');
  const clip = page.locator('.timeline-clip').first();
  const originalWidth = (await clip.boundingBox())!.width;
  await page.keyboard.press('ArrowUp');
  await expect(slider).toHaveValue('100');
  expect((await clip.boundingBox())!.width).toBeGreaterThan(originalWidth);
  await page.keyboard.press('ArrowDown');
  await expect(slider).toHaveValue('90');
  await page.keyboard.press('Home');
  await expect(slider).toHaveValue('30');
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('200');
  const box = (await slider.boundingBox())!;
  expect(box.height).toBeGreaterThan(box.width * 3);
  await page.mouse.click(box.x + box.width / 2, box.y + 8);
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeGreaterThanOrEqual(170);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 8);
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeLessThanOrEqual(60);
  if (isMobile) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + 8);
    await expect
      .poll(async () => Number(await slider.inputValue()))
      .toBeGreaterThanOrEqual(170);
  }
  await page.screenshot({ path: info.outputPath('zoom-dropdown.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  await page.keyboard.press('Space');
  await expect(slider).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await expect(dialog).toBeVisible();
  const title = page.getByRole('textbox', {
    name: 'Titre du scénario',
    exact: true,
  });
  await title.click();
  await expect(dialog).toHaveCount(0);
  await expect(title).toBeFocused();
  expect(await exportSequence(page)).toEqual(before);
});

test('BKL-007 zoom popup follows its anchor and stays visible across resize and scroll', async ({
  page,
  isMobile,
}) => {
  await openSequence(page);
  const button = page.getByRole('button', {
    name: 'Zoom de la timeline',
    exact: true,
  });
  const dialog = page.getByRole('dialog', {
    name: 'Zoom de la timeline',
    exact: true,
  });
  await button.click();
  async function expectAnchored() {
    await expect(dialog).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const popup = document
            .querySelector('.timeline-zoom-popover')!
            .getBoundingClientRect();
          const trigger = document
            .querySelector('.timeline-zoom-toggle')!
            .getBoundingClientRect();
          return (
            popup.left >= 0 &&
            popup.top >= 0 &&
            popup.right <= innerWidth &&
            popup.bottom <= innerHeight &&
            (Math.abs(popup.top - trigger.bottom - 8) <= 2 ||
              Math.abs(popup.bottom - trigger.top + 8) <= 2)
          );
        }),
      )
      .toBe(true);
  }
  await expectAnchored();
  await page.setViewportSize({
    width: isMobile ? 430 : 1440,
    height: page.viewportSize()!.height,
  });
  await expectAnchored();
  await page.evaluate(() => window.scrollBy(0, 40));
  await expectAnchored();
  await page.locator('.timeline-command-scroll').evaluate((el) => {
    el.scrollLeft = Math.max(0, el.scrollLeft - 8);
  });
  await expectAnchored();
  await page
    .getByRole('slider', { name: 'Zoom de la timeline', exact: true })
    .press('Escape');
  await expect(dialog).toHaveCount(0);
});
