import { addStepAfter } from './step-actions.js';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CoachingSequenceSchema, ScenarioSchema } from '@hockey-iq/contracts';

const tab = (page: Page, name: string) =>
  page.getByRole('tab', { name, exact: true });
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const xField = (page: Page) =>
  page.getByRole('spinbutton', { name: 'X (m)', exact: true });
const toolbar = (page: Page) =>
  page.getByRole('toolbar', { name: 'Atelier', exact: true });
async function open(page: Page) {
  await page.goto('/editor-local');
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
async function imported(page: Page, value: unknown) {
  await page.getByLabel('Importer', { exact: true }).setInputFiles({
    name: 'document.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(value)),
  });
}
async function expectMontageHeaderAtTop(page: Page) {
  const title = page.getByRole('heading', { name: 'Montage', exact: true });
  await expect(title).toBeFocused();
  await expect
    .poll(() =>
      page.locator('.sequence-heading').evaluate((el) => {
        const absolute = el.getBoundingClientRect().top + scrollY - 8;
        const limit = Math.max(
          0,
          document.documentElement.scrollHeight - innerHeight,
        );
        return Math.abs(scrollY - Math.max(0, Math.min(absolute, limit)));
      }),
    )
    .toBeLessThanOrEqual(1);
}

test('BKL-011 vertical tools stay left of the rink and aligned timeline at responsive sizes', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  await expect(toolbar(page)).toHaveAttribute('aria-orientation', 'vertical');
  await expect(page.locator('.rink-toolbar .tools')).toHaveCount(0);
  await expect(toolbar(page).getByRole('separator').first()).toHaveAttribute(
    'aria-orientation',
    'horizontal',
  );
  const original = page.viewportSize()!;
  for (const montage of [false, true]) {
    if (montage) await button(page, 'Créer une séquence').click();
    for (const width of isMobile
      ? [320, 390, 430, 820, 1024]
      : [800, 1024, 1280, 1600]) {
      await page.setViewportSize({ width, height: original.height });
      await expect(toolbar(page).locator('button')).toHaveCount(
        montage ? 9 : 10,
      );
      await expect
        .poll(() =>
          page.evaluate((hasTimeline) => {
            const rail = document
              .querySelector('.tools')!
              .getBoundingClientRect();
            const board = document
              .querySelector('.rink-board')!
              .getBoundingClientRect();
            const buttons = Array.from(
              document.querySelectorAll('.tools button'),
            );
            const controls = buttons.map((el) => el.getBoundingClientRect());
            const touch = matchMedia('(pointer: coarse)').matches;
            const line = document
              .querySelector('.timeline-editor')
              ?.getBoundingClientRect();
            return (
              rail.right <= board.left &&
              controls.every(
                (r, i) =>
                  r.right <= board.left &&
                  r.width === 40 &&
                  r.height === (touch ? 40 : 34) &&
                  (!i ||
                    buttons[i]!.previousElementSibling?.tagName !== 'BUTTON' ||
                    Math.abs(
                      r.top - controls[i - 1]!.top - (touch ? 42 : 36),
                    ) <= 1) &&
                  Math.abs(
                    r.left +
                      r.width / 2 -
                      controls[0]!.left -
                      controls[0]!.width / 2,
                  ) <= 1 &&
                  (!i || r.top >= controls[i - 1]!.bottom),
              ) &&
              (!hasTimeline ||
                (!!line &&
                  Math.abs(line.left - board.left) <= 1 &&
                  Math.abs(line.width - board.width) <= 1 &&
                  Math.abs(line.top - board.bottom) <= 1)) &&
              document.documentElement.scrollWidth <= innerWidth
            );
          }, montage),
        )
        .toBe(true);
    }
  }
  await page.setViewportSize(original);
  await tab(page, 'Patinoire').click();
  await page.screenshot({
    path: info.outputPath('workspace.png'),
    fullPage: true,
  });
  await toolbar(page).screenshot({
    path: info.outputPath('vertical-tools.png'),
  });
  await page
    .locator('.inspector-panel')
    .screenshot({ path: info.outputPath('rink-tab.png') });
});

test('BKL-011 vertical keyboard navigation skips disabled commands and retains placement, history and mode guards', async ({
  page,
  isMobile,
}) => {
  await open(page);
  const move = button(page, 'Déplacer'),
    place = button(page, 'Placer'),
    reset = button(page, 'Réinitialiser le scénario');
  await move.focus();
  await page.keyboard.press('ArrowUp');
  await expect(reset).toBeFocused();
  await page.keyboard.press('Home');
  await expect(reset).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(move).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(place).toBeFocused();
  await page.keyboard.press('Space');
  await expect(place).toHaveAttribute('aria-pressed', 'true');
  const board = page.locator('.rink-board');
  await board.scrollIntoViewIfNeeded();
  const rect = (await board.boundingBox())!;
  if (isMobile)
    await page.touchscreen.tap(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );
  else
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(xField(page)).toHaveValue('30.48');
  await move.focus();
  await page.keyboard.press('End');
  await expect(button(page, 'Inverser la vue')).toBeFocused();
  await button(page, 'Annuler').focus();
  await page.keyboard.press('Enter');
  await expect(xField(page)).toHaveValue('40');
  await expect(button(page, 'Rétablir')).toBeFocused();
  await expect
    .poll(() =>
      toolbar(page).evaluate((el) => {
        const viewport = el.getBoundingClientRect();
        const control = document.activeElement!.getBoundingClientRect();
        return control.top >= viewport.top && control.bottom <= viewport.bottom;
      }),
    )
    .toBe(true);
  await page.keyboard.press('Space');
  await expect(xField(page)).toHaveValue('30.48');
  await button(page, 'Avancer d’un pas').click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'paused',
  );
  await expect(place).toBeDisabled();
  await expect(button(page, 'Tracer une cible')).toBeDisabled();
  await expect(button(page, 'Annuler')).toBeDisabled();
  await move.focus();
  await page.keyboard.press('End');
  await expect(button(page, 'Inverser la vue')).toBeFocused();
  await button(page, 'Modifier la situation initiale').click();
  await button(page, 'Créer une séquence').click();
  await expect(button(page, 'Tracer une cible')).toHaveCount(0);
  await addStepAfter(page);
  await button(page, 'Lire la séquence').click();
  await expect(place).toBeDisabled();
  await expect(button(page, 'Annuler')).toBeDisabled();
  await move.focus();
  await page.keyboard.press('End');
  await expect(button(page, 'Inverser la vue')).toBeFocused();
  await button(page, 'Pause de la séquence').click();
  await expect(place).toBeDisabled();
  await button(page, 'Revenir au début').click();
  await expect(place).toBeEnabled();
});

test('BKL-012 Patinoire options change the rendered view and survive tab changes without document or history edits', async ({
  page,
  isMobile,
}) => {
  await open(page);
  const fixture = ScenarioSchema.parse(await exported(page));
  fixture.players[0]!.role = 'F1';
  fixture.players[0]!.objective = {
    kind: 'support',
    targetPoint: { x: 30, y: 10 },
  };
  await imported(page, fixture);
  await expect(page.getByRole('tab')).toHaveText([
    'Équipes',
    'Joueur',
    'Étape',
    'Patinoire',
  ]);
  await expect(page.locator('.rink-panel .rink-options')).toHaveCount(0);
  await expect(page.locator('.rink-options input')).toHaveCount(3);
  await tab(page, 'Joueur').focus();
  await page.keyboard.press('End');
  await expect(tab(page, 'Patinoire')).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('tabpanel', { name: 'Patinoire', exact: true }),
  ).toBeFocused();
  const grid = page.getByRole('checkbox', { name: 'Grille', exact: true });
  const roles = page.getByRole('checkbox', { name: 'Rôles', exact: true });
  const paths = page.getByRole('checkbox', {
    name: 'Trajectoires',
    exact: true,
  });
  await expect(grid).not.toBeChecked();
  await expect(roles).not.toBeChecked();
  await expect(paths).toBeChecked();
  const canvas = page.locator('canvas.pixi-rink');
  let previous = await canvas.screenshot();
  if (isMobile) await grid.tap();
  else await grid.check();
  await expect(grid).toBeChecked();
  await expect
    .poll(async () => Buffer.compare(await canvas.screenshot(), previous))
    .not.toBe(0);
  previous = await canvas.screenshot();
  await roles.focus();
  await roles.press('Space');
  await expect(roles).toBeChecked();
  await expect
    .poll(async () => Buffer.compare(await canvas.screenshot(), previous))
    .not.toBe(0);
  previous = await canvas.screenshot();
  await paths.uncheck();
  await expect
    .poll(async () => Buffer.compare(await canvas.screenshot(), previous))
    .not.toBe(0);
  await tab(page, 'Équipes').click();
  await expect(page.locator('.roster-player small').first()).toHaveText('F1');
  await page.locator('.roster-list button').nth(1).click();
  await tab(page, 'Patinoire').click();
  await expect(roles).toBeChecked();
  await expect(grid).toBeChecked();
  await expect(paths).not.toBeChecked();
  expect(ScenarioSchema.parse(await exported(page))).toEqual(fixture);
  await button(page, 'Annuler').click();
  const undone = ScenarioSchema.parse(await exported(page));
  expect(undone.players[0]!.role).toBeNull();
  expect(undone.players[0]!.objective).toBeNull();
  await button(page, 'Rétablir').click();
  expect(ScenarioSchema.parse(await exported(page))).toEqual(fixture);
  await expect(roles).toBeChecked();
  await expect(grid).toBeChecked();
  await expect(paths).not.toBeChecked();
});

test('BKL-012 display options keep unsaved poses, step selection and preview safeguards intact', async ({
  page,
}) => {
  await open(page);
  await button(page, 'Créer une séquence').click();
  await addStepAfter(page);
  await xField(page).fill('22');
  await tab(page, 'Patinoire').click();
  await page.getByRole('checkbox', { name: 'Rôles', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Grille', exact: true }).check();
  await page
    .getByRole('checkbox', { name: 'Trajectoires', exact: true })
    .uncheck();
  await expect(page.locator('.pending-step')).toBeVisible();
  await expect(button(page, 'Insérer une étape')).toBeDisabled();
  await expect(button(page, 'Lire la séquence')).toBeDisabled();
  await tab(page, 'Étape').click();
  await expect(
    page.getByRole('spinbutton', { name: 'Temps de l’étape (s)', exact: true }),
  ).toHaveValue('2');
  await expect(
    page.getByRole('spinbutton', { name: 'Temps de l’étape (s)', exact: true }),
  ).toBeDisabled();
  await tab(page, 'Joueur').click();
  await expect(xField(page)).toHaveValue('22');
  await button(page, 'Enregistrer l’étape').click();
  const before = CoachingSequenceSchema.parse(await exported(page));
  await page
    .getByRole('slider', { name: 'Curseur de lecture', exact: true })
    .evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '1000';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  await tab(page, 'Patinoire').click();
  await expect(
    page.getByRole('checkbox', { name: 'Grille', exact: true }),
  ).toBeChecked();
  await page.getByRole('checkbox', { name: 'Grille', exact: true }).uncheck();
  await expect(page.getByTestId('timeline-time')).toHaveText('00:01.00');
  await tab(page, 'Joueur').click();
  await expect(xField(page)).toBeDisabled();
  await expect(xField(page)).toHaveValue('31');
  await button(page, 'Revenir au début').click();
  expect(CoachingSequenceSchema.parse(await exported(page))).toEqual(before);
  await button(page, 'Enregistrer').click();
  await page.reload();
  await tab(page, 'Patinoire').click();
  await expect(
    page.getByRole('checkbox', { name: 'Rôles', exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Grille', exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Trajectoires', exact: true }),
  ).toBeChecked();
  expect(CoachingSequenceSchema.parse(await exported(page))).toEqual(before);
});

test('BKL-013/BKL-016 creation frames the whole Montage header after pointer, keyboard and touch activation with viewport limits', async ({
  page,
  isMobile,
}, info) => {
  const original = page.viewportSize()!;
  const methods = isMobile
    ? ['click', 'Enter', 'Space', 'touch']
    : ['click', 'Enter', 'Space'];
  for (const [index, method] of methods.entries()) {
    await page.setViewportSize({
      width: original.width,
      height: [720, 480, 1800, 844][index]!,
    });
    await open(page);
    await xField(page).fill('26');
    await xField(page).press('Tab');
    const before = ScenarioSchema.parse(await exported(page));
    await tab(page, 'Patinoire').click();
    await page.evaluate((y) => window.scrollTo(0, y), [0, 100, 200, 0][index]!);
    const create = button(page, 'Créer une séquence');
    if (method === 'touch') await create.tap();
    else if (method === 'click') await create.click();
    else {
      await create.focus();
      await page.keyboard.press(method);
    }
    await expectMontageHeaderAtTop(page);
    const header = page.locator('.sequence-heading');
    await expect(
      header.getByText('SÉQUENCE PÉDAGOGIQUE', { exact: true }),
    ).toBeInViewport();
    await expect(header.locator('.timeline-count')).toBeInViewport();
    await expect(
      page.getByRole('heading', { name: 'Montage', exact: true }),
    ).toBeInViewport();
    await expect(tab(page, 'Patinoire')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('.timeline-clip')).toHaveCount(1);
    if (index === 0) {
      await page.screenshot({ path: info.outputPath('montage-scroll.png') });
      await page.screenshot({
        path: info.outputPath('montage-workspace.png'),
        fullPage: true,
      });
    }
    if (index === 2) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight - innerHeight,
        ),
      ).toBeLessThan(
        await page
          .locator('.sequence-heading')
          .evaluate((el) => el.getBoundingClientRect().top + scrollY - 8),
      );
    }
    const after = CoachingSequenceSchema.parse(await exported(page));
    expect(after.scenario).toEqual(before);
    expect(after.steps[0]!.pose.players).toEqual(before.players);
    expect(after.steps[0]!.pose.puck).toEqual(before.puck);
  }
});

test('BKL-013 scroll happens on successful creation and does not repeat for history, import, reload or view changes', async ({
  page,
}) => {
  await open(page);
  await button(page, 'Créer une séquence').click();
  await expectMontageHeaderAtTop(page);
  const sequence = CoachingSequenceSchema.parse(await exported(page));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.press('ControlOrMeta+z');
  await expect(button(page, 'Créer une séquence')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+Shift+z');
  const title = page.getByRole('heading', { name: 'Montage', exact: true });
  await expect(title).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await imported(page, sequence.scenario);
  await imported(page, sequence);
  await expect(title).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await button(page, 'Enregistrer').click();
  await page.reload();
  await expect(title).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await tab(page, 'Patinoire').click();
  await page.evaluate(() => window.scrollTo(0, 50));
  // Exercise a render without the browser scrolling a focused control into view.
  await page
    .getByRole('checkbox', { name: 'Grille', exact: true })
    .evaluate((el) => (el as HTMLInputElement).click());
  await expect(
    page.getByRole('checkbox', { name: 'Grille', exact: true }),
  ).toBeChecked();
  expect(await page.evaluate(() => scrollY)).toBe(50);
  await imported(page, sequence.scenario);
  await button(page, 'Avancer d’un pas').click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'paused',
  );
  const create = button(page, 'Créer une séquence');
  await expect(create).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await create.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(title).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await button(page, 'Modifier la situation initiale').click();
  await create.click();
  await expectMontageHeaderAtTop(page);
});
