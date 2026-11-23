import { openRinkZoom } from './step-actions.js';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ScenarioSchema } from '@hockey-iq/contracts';
async function open(page: Page) {
  await page.goto('/editor-local');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
}
const xInput = (page: Page) =>
  page.getByRole('spinbutton', { name: 'X (m)', exact: true });
async function downloadScenario(page: Page) {
  const promise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exporter JSON', exact: true })
    .click();
  const download = await promise;
  return ScenarioSchema.parse(
    JSON.parse(await readFile(await download.path(), 'utf8')),
  );
}
async function importText(page: Page, text: string) {
  await page.getByLabel('Importer', { exact: true }).setInputFiles({
    name: 'scenario.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
}
test('renders ten skaters and a puck with accessible alternate controls', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  await expect(page.locator('[data-entity^="player:"]')).toHaveCount(10);
  await expect(page.locator('[data-entity="puck"]')).toHaveCount(1);
  await expect(page.locator('canvas.pixi-rink')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Atelier',
  );
  await page.getByRole('tab', { name: 'Équipes', exact: true }).click();
  await page.getByRole('button', { name: 'Équipe B', exact: true }).click();
  await expect(page.locator('.roster-list li')).toHaveCount(5);
  await page.locator('.roster-list button').first().click();
  await expect(xInput(page)).toHaveValue('47');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('edits coordinates and possession, saves locally, and restores on reload', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Donner la rondelle' }).click();
  await xInput(page).fill('33');
  await xInput(page).press('Tab');
  const y = page.getByRole('spinbutton', { name: 'Y (m)', exact: true });
  await y.fill('9');
  await y.press('Tab');
  await expect(page.getByLabel('Possession de la rondelle')).toHaveValue(
    'home-1',
  );
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Scénario enregistré sur cet appareil.',
  );
  await page.reload();
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await expect(xInput(page)).toHaveValue('33');
  await expect(y).toHaveValue('9');
  await expect(page.getByLabel('Possession de la rondelle')).toHaveValue(
    'home-1',
  );
  const scenario = await downloadScenario(page);
  expect(scenario.puck.pos).toEqual({ x: 33, y: 9 });
});
test('a full pointer drag is one reversible history entry', async ({
  page,
}) => {
  await open(page);
  const marker = page.locator('[data-entity="player:home-4"]');
  await marker.scrollIntoViewIfNeeded();
  const box = (await marker.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 55, start.y + 15, { steps: 8 });
  await page.mouse.up();
  const moved = await xInput(page).inputValue();
  expect(Number(moved)).toBeLessThan(28);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(xInput(page)).toHaveValue('28');
  await expect(
    page.getByRole('button', { name: 'Annuler', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(xInput(page)).toHaveValue(moved);
});
test('Escape cancels a pointer drag without adding an undo step', async ({
  page,
}) => {
  await open(page);
  const marker = page.locator('[data-entity="player:home-4"]');
  await marker.scrollIntoViewIfNeeded();
  const box = (await marker.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 40, box.y + 25, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(xInput(page)).toHaveValue('28');
  await expect(
    page.getByRole('button', { name: 'Annuler', exact: true }),
  ).toBeDisabled();
});
test('orientation, placement, keyboard movement, and target arrows use the same coordinates', async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole('button', { name: 'Inverser la vue', exact: true })
    .click();
  const rink = page.getByRole('group', { name: 'Patinoire interactive' });
  await expect(rink).toHaveAttribute('data-flipped', 'true');
  await page.getByRole('button', { name: 'Placer', exact: true }).click();
  await rink.scrollIntoViewIfNeeded();
  const box = (await rink.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.28, box.y + box.height / 2);
  const placed = Number(await xInput(page).inputValue());
  expect(placed).toBeGreaterThan(30.48);
  await rink.focus();
  await page.keyboard.press('ArrowRight');
  expect(Number(await xInput(page).inputValue())).toBeCloseTo(placed - 0.5, 1);
  await page
    .getByRole('button', { name: 'Tracer une cible', exact: true })
    .click();
  await rink.scrollIntoViewIfNeeded();
  const current = (await rink.boundingBox())!;
  await page.mouse.click(
    current.x + current.width * 0.6,
    current.y + current.height / 2,
  );
  await expect(page.getByText('Cible définie', { exact: true })).toBeVisible();
  const scenario = await downloadScenario(page),
    player = scenario.players.find((p) => p.id === 'home-1')!;
  expect(player.objective!.targetPoint.x).toBeLessThan(player.pos.x);
  await page
    .getByRole('button', { name: 'Retirer la cible', exact: true })
    .click();
  await expect(page.getByText('Aucune cible', { exact: true })).toBeVisible();
});
test('zoom, grid, roles, and orientation only change the view', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await openRinkZoom(page);
  await page.getByRole('button', { name: 'Agrandir', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.rink-board')).toHaveAttribute('data-zoom', '120');
  await page
    .getByRole('button', { name: 'Déplacer la vue', exact: true })
    .click();
  const rink = page.locator('.rink-board');
  await rink.scrollIntoViewIfNeeded();
  const marker = page.locator('[data-entity="player:home-1"]');
  const before = await marker.evaluate((element) =>
    parseFloat((element as HTMLElement).style.left),
  );
  const box = (await rink.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 35, box.y + box.height / 3, {
    steps: 4,
  });
  await page.mouse.up();
  const after = await marker.evaluate((element) =>
    parseFloat((element as HTMLElement).style.left),
  );
  expect(after - before).toBeCloseTo(35, 0);

  await page.getByRole('tab', { name: 'Patinoire', exact: true }).click();
  await page.getByLabel('Grille', { exact: true }).check();
  await page.getByLabel('Rôles', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Inverser la vue', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Cadrer la patinoire', exact: true })
    .click();
  await expect(page.locator('.rink-board')).toHaveAttribute('data-zoom', '100');
  await expect(page.locator('.save-state')).toContainText(
    'Enregistré sur cet appareil',
  );
  await expect(
    page.getByRole('button', { name: 'Annuler', exact: true }),
  ).toBeDisabled();
});
test('exports valid JSON, imports edits losslessly, and can undo an import', async ({
  page,
}) => {
  await open(page);
  const scenario = await downloadScenario(page);
  scenario.title = 'Lecture D-D — exercice local';
  scenario.players[0]!.role = 'F3';
  scenario.players[0]!.vel.x = 2;
  await importText(page, JSON.stringify(scenario));
  await expect(page.getByLabel('Titre du scénario')).toHaveValue(
    scenario.title,
  );
  await expect(page.getByLabel('Rôle initial', { exact: true })).toHaveValue(
    'F3',
  );
  expect(await downloadScenario(page)).toEqual(scenario);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByLabel('Titre du scénario')).toHaveValue(
    'Échec avant · 2-1-2',
  );
});
test('rejects corrupt, incompatible, and oversized files without replacing the scenario', async ({
  page,
}) => {
  await open(page);
  for (const [text, message] of [
    ['{broken', 'scénario valide'],
    ['{"schemaVersion":99}', 'version de scénario'],
    [' '.repeat(256 * 1024 + 1), '256 Ko'],
  ]) {
    await importText(page, text!);
    await expect(page.getByRole('alert')).toContainText(message!);
    await expect(page.getByLabel('Titre du scénario')).toHaveValue(
      'Échec avant · 2-1-2',
    );
    await expect(page.locator('[data-entity^="player:"]')).toHaveCount(10);
    await expect(
      page.getByRole('button', { name: 'Annuler', exact: true }),
    ).toBeDisabled();
  }
});
test('clamps positions and rejects dimensions that would invalidate the roster', async ({
  page,
}) => {
  await open(page);
  await xInput(page).fill('-50');
  await xInput(page).press('Tab');
  expect(Number(await xInput(page).inputValue())).toBeGreaterThanOrEqual(0.7);
  await page.locator('summary').click();
  const length = page.getByRole('spinbutton', { name: 'Longueur (m)' });
  await length.fill('40');
  await length.press('Tab');
  await expect(page.getByRole('alert')).toContainText('Vérifiez les valeurs');
  await expect(length).toHaveValue('60.96');
});
test('touch drag and a two-finger pinch work without altering history during zoom', async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(
    !isMobile || browserName !== 'chromium',
    'Native pinch uses Chromium CDP in the mobile project.',
  );
  await open(page);
  const marker = page.locator('[data-entity="player:home-4"]');
  await marker.scrollIntoViewIfNeeded();
  const box = (await marker.boundingBox())!,
    session = await page.context().newCDPSession(page);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [start],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...start, x: start.x - 40 }],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  expect(Number(await xInput(page).inputValue())).toBeLessThan(28);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(xInput(page)).toHaveValue('28');
  const rink = page.locator('.rink-board');
  await rink.scrollIntoViewIfNeeded();
  const r = (await rink.boundingBox())!;
  const a = { x: r.x + r.width / 2 - 30, y: r.y + r.height / 2, id: 1 },
    b = { ...a, x: a.x + 60, id: 2 };
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [a, b],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { ...a, x: a.x - 35 },
      { ...b, x: b.x + 35 },
    ],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  expect(Number(await rink.getAttribute('data-zoom'))).toBeGreaterThan(150);
  await expect(
    page.getByRole('button', { name: 'Annuler', exact: true }),
  ).toBeDisabled();
  await session.detach();
});

test('an uncommitted coordinate edit stays with the original selection', async ({
  page,
}) => {
  await open(page);
  await xInput(page).fill('22');
  const marker = page.locator('[data-entity="player:home-4"]');
  await marker.scrollIntoViewIfNeeded();
  const box = (await marker.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(xInput(page)).toHaveValue('28');
  const scenario = await downloadScenario(page);
  expect(scenario.players.find((player) => player.id === 'home-1')!.pos.x).toBe(
    22,
  );
  expect(scenario.players.find((player) => player.id === 'home-4')!.pos.x).toBe(
    28,
  );
});
test('a native touch tap selects the nearest visible skater', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch selection is exercised by mobile browsers.');
  await open(page);
  const marker = page.locator('[data-entity="player:home-4"]');
  await marker.scrollIntoViewIfNeeded();
  const box = (await marker.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(xInput(page)).toHaveValue('28');
  await expect(
    page.getByRole('button', { name: 'Annuler', exact: true }),
  ).toBeDisabled();
});

test('blocked browser storage keeps the editor and JSON export usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await open(page);
  await expect(page.getByRole('alert')).toContainText(
    'stockage de cet appareil est indisponible',
  );
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'stockage de cet appareil est indisponible',
  );
  expect((await downloadScenario(page)).players).toHaveLength(10);
});
