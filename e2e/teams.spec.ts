import { addStepAfter } from './step-actions.js';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CoachingSequenceSchema, ScenarioSchema } from '@hockey-iq/contracts';

const tab = (page: Page, name: 'Équipes' | 'Joueur' | 'Étape' | 'Patinoire') =>
  page.getByRole('tab', { name, exact: true });
const xField = (page: Page) =>
  page.getByRole('spinbutton', { name: 'X (m)', exact: true });
async function open(page: Page) {
  await page.goto('/editor-local');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
}
async function exported(page: Page) {
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exporter JSON', exact: true })
    .click();
  const file = await pending;
  return JSON.parse(await readFile(await file.path(), 'utf8')) as unknown;
}
async function choose(page: Page, team: string, index: number) {
  await tab(page, 'Équipes').click();
  await page.getByRole('button', { name: team, exact: true }).click();
  await expect(tab(page, 'Équipes')).toHaveAttribute('aria-selected', 'true');
  await page.locator('.roster-list button').nth(index).click();
  await expect(tab(page, 'Joueur')).toHaveAttribute('aria-selected', 'true');
}

test('BKL-010 uses the freed left column for the rink and timeline beside a 368px inspector', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  await expect(page.locator('.editor-layout > *')).toHaveCount(2);
  await expect(page.locator('.editor-layout > .roster-panel')).toHaveCount(0);
  await expect(page.locator('.inspector-panel .roster-panel')).toHaveCount(1);
  await expect(page.getByRole('tab')).toHaveText([
    'Équipes',
    'Joueur',
    'Étape',
    'Patinoire',
  ]);
  await expect(tab(page, 'Joueur')).toHaveAttribute('aria-selected', 'true');
  await tab(page, 'Équipes').click();
  const original = page.viewportSize()!;
  const widths = isMobile
    ? [320, 390, 430, 820, 1024]
    : [1280, 1600, 1150, 1024, 1000, 800];
  for (const montage of [false, true]) {
    if (montage) {
      await page
        .getByRole('button', { name: 'Créer une séquence', exact: true })
        .click();
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: original.height });
      await expect
        .poll(() =>
          page.evaluate((hasTimeline) => {
            const layout = document.querySelector('.editor-layout')!;
            const area = layout.getBoundingClientRect();
            const rink = layout
              .querySelector('.rink-panel')!
              .getBoundingClientRect();
            const panel = layout
              .querySelector('.inspector-panel')!
              .getBoundingClientRect();
            const surface = document.querySelector('.rink-surface')!;
            const board = document
              .querySelector('.rink-board')!
              .getBoundingClientRect();
            const inset = getComputedStyle(surface);
            const expectedWidth =
              surface.clientWidth -
              parseFloat(inset.paddingLeft) -
              parseFloat(inset.paddingRight);
            const gap = parseFloat(getComputedStyle(layout).columnGap);
            const close = (a: number, b: number) => Math.abs(a - b) <= 1;
            const outsideControls = Array.from(
              document.querySelectorAll(
                '.inspector-panel input,.inspector-panel select,.inspector-panel button',
              ),
            )
              .filter((el) => el.getClientRects().length)
              .filter((el) => {
                const box = el.getBoundingClientRect();
                return box.left < panel.left || box.right > panel.right;
              })
              .map(
                (el) => el.getAttribute('aria-label') ?? el.textContent?.trim(),
              );
            const placement =
              innerWidth > 1000
                ? close(panel.width, 368) &&
                  close(panel.right, area.right) &&
                  close(panel.left - rink.right, gap) &&
                  close(rink.width, area.width - gap - panel.width) &&
                  close(panel.top, rink.top)
                : close(rink.width, area.width) &&
                  close(panel.width, area.width) &&
                  panel.top >= rink.bottom;
            const header = document
              .querySelector(
                hasTimeline ? '.sequence-heading' : '.sequence-create',
              )!
              .getBoundingClientRect();
            const timeline = document
              .querySelector('.timeline-editor')
              ?.getBoundingClientRect();
            return {
              fillsLeft: close(rink.left, area.left),
              boardWidth: close(board.width, expectedWidth),
              placement,
              outsideControls,
              header:
                header.bottom <= area.top &&
                close(header.left, area.left) &&
                close(header.right, area.right),
              timeline:
                !hasTimeline ||
                (!!timeline &&
                  close(timeline.width, board.width) &&
                  close(timeline.left, board.left) &&
                  close(timeline.top, board.bottom)),
              noOverflow: document.documentElement.scrollWidth <= innerWidth,
            };
          }, montage),
        )
        .toEqual({
          fillsLeft: true,
          boardWidth: true,
          placement: true,
          outsideControls: [],
          header: true,
          timeline: true,
          noOverflow: true,
        });
    }
  }
  await page.setViewportSize(original);
  await page.screenshot({
    path: info.outputPath('workspace.png'),
    fullPage: true,
  });
  await page
    .locator('.inspector-panel')
    .screenshot({ path: info.outputPath('teams-tab.png') });
  await tab(page, 'Joueur').click();
  await expect(xField(page)).toHaveValue('40');
  await page
    .locator('.inspector-panel')
    .screenshot({ path: info.outputPath('player-tab.png') });
  await tab(page, 'Étape').click();
  await page
    .locator('.inspector-panel')
    .screenshot({ path: info.outputPath('step-tab.png') });
});

test('BKL-010 teams roster selects every skater and puck without changing the document or forcing tabs from the rink', async ({
  page,
  isMobile,
}) => {
  await open(page);
  const before = ScenarioSchema.parse(await exported(page));
  for (const team of before.teams) {
    await tab(page, 'Équipes').click();
    await page.getByRole('button', { name: team.label, exact: true }).click();
    await expect(tab(page, 'Équipes')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.roster-caption')).toContainText(
      team.attackDirection === 'positive_x' ? '→' : '←',
    );
    const players = before.players.filter((p) => p.teamId === team.id);
    await expect(page.locator('.roster-list button')).toHaveCount(5);
    await expect(page.locator('.roster-puck')).toHaveCount(
      players.some((p) => p.id === before.puck.holderId) ? 1 : 0,
    );
    for (let index = 0; index < players.length; index++) {
      await tab(page, 'Équipes').click();
      const button = page.locator('.roster-list button').nth(index);
      if (isMobile && index === 0) await button.tap();
      else await button.click();
      await expect(tab(page, 'Joueur')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(tab(page, 'Joueur')).toBeFocused();
      await expect(page.getByRole('tabpanel')).toHaveCount(1);
      await expect(page.locator('.selection-number')).toHaveText(
        players[index]!.label,
      );
      await expect(xField(page)).toHaveValue(String(players[index]!.pos.x));
    }
  }
  await tab(page, 'Équipes').click();
  await page.locator('.puck-row').click();
  await expect(tab(page, 'Joueur')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.selection-summary h3')).toHaveText('Rondelle');
  await tab(page, 'Patinoire').click();
  await page.getByRole('checkbox', { name: 'Rôles', exact: true }).check();
  await tab(page, 'Équipes').click();
  await expect(page.locator('.roster-player small')).toHaveText(
    before.players
      .filter((p) => p.teamId === before.teams[1]!.id)
      .map((p) => p.role ?? '—'),
  );
  const marker = page.locator('[data-entity="player:home-4"]');
  await marker.scrollIntoViewIfNeeded();
  if (isMobile) await marker.tap();
  else await marker.click();
  await expect(tab(page, 'Équipes')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.team-tabs button').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.roster-list button').nth(3)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await tab(page, 'Joueur').click();
  await expect(xField(page)).toHaveValue('28');
  expect(ScenarioSchema.parse(await exported(page))).toEqual(before);
  await expect(
    page.getByRole('button', { name: 'Annuler', exact: true }),
  ).toBeDisabled();
});

test('BKL-010 team and tab changes preserve edits to both teams through capture, history, preview and reload', async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole('button', { name: 'Créer une séquence', exact: true })
    .click();
  await addStepAfter(page);
  await xField(page).fill('25');
  await choose(page, 'Équipe B', 1);
  await expect(page.locator('.pending-step')).toBeVisible();
  await xField(page).fill('18');
  await xField(page).press('Tab');
  await page.getByLabel('Rôle initial', { exact: true }).selectOption('F2');
  await page
    .getByRole('button', { name: 'Donner la rondelle', exact: true })
    .click();
  await tab(page, 'Équipes').click();
  await expect(
    page.locator('.roster-list button').nth(1).locator('.roster-puck'),
  ).toBeVisible();
  await choose(page, 'Équipe A', 0);
  await expect(xField(page)).toHaveValue('25');
  await expect(
    page.getByRole('button', { name: 'Insérer une étape', exact: true }),
  ).toBeDisabled();
  await tab(page, 'Étape').click();
  await expect(
    page.getByRole('spinbutton', { name: 'Temps de l’étape (s)', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Supprimer l’étape', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Enregistrer l’étape', exact: true })
    .click();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('.pending-step')).toBeVisible();
  await choose(page, 'Équipe B', 1);
  await expect(xField(page)).toHaveValue('18');
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(page.locator('.pending-step')).toHaveCount(0);
  const before = CoachingSequenceSchema.parse(await exported(page));
  expect(
    before.steps[0]!.pose.players.find((p) => p.id === 'home-1')!.pos.x,
  ).toBe(40);
  expect(
    before.steps[1]!.pose.players.find((p) => p.id === 'home-1')!.pos.x,
  ).toBe(25);
  expect(
    before.steps[1]!.pose.players.find((p) => p.id === 'away-2'),
  ).toMatchObject({ pos: { x: 18 }, role: 'F2' });
  expect(before.steps[1]!.pose.puck.holderId).toBe('away-2');
  await page
    .getByRole('slider', { name: 'Curseur de lecture', exact: true })
    .evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '1000';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  await tab(page, 'Équipes').click();
  await expect(page.locator('.roster-puck')).toHaveCount(0);
  await expect(page.locator('.puck-row small')).toHaveText('Rondelle libre');
  await page.locator('.roster-list button').nth(1).click();
  await expect(xField(page)).toBeDisabled();
  await tab(page, 'Étape').click();
  await expect(
    page.getByRole('textbox', { name: 'Nom de l’étape', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Revenir au début', exact: true })
    .click();
  expect(CoachingSequenceSchema.parse(await exported(page))).toEqual(before);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await expect(tab(page, 'Joueur')).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('button', { name: 'Étape suivante enregistrée', exact: true })
    .click();
  await choose(page, 'Équipe A', 0);
  await expect(xField(page)).toHaveValue('25');
  await choose(page, 'Équipe B', 1);
  await expect(xField(page)).toHaveValue('18');
  await expect(page.getByLabel('Rôle initial', { exact: true })).toHaveValue(
    'F2',
  );
  expect(CoachingSequenceSchema.parse(await exported(page))).toEqual(before);
});
