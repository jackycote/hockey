import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.use({
  trace: {
    mode: 'retain-on-failure',
    screenshots: false,
    snapshots: false,
    sources: true,
  },
});
async function openModel(page: Page) {
  await page.goto('/equipes');
  await page.getByRole('button', { name: 'Coach Démo', exact: true }).click();
  await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
  const row = page.locator('.platform-project-list article').filter({
    has: page.getByRole('heading', {
      name: 'Renversement D à D',
      exact: true,
    }),
  });
  await row
    .getByRole('button', { name: 'Essayer le modèle', exact: true })
    .click();
  const region = page.getByRole('region', {
    name: 'Simulation du catalogue',
    exact: true,
  });
  await expect(region.locator('.demonstration-player')).toBeVisible({
    timeout: 15000,
  });
  await expect(region.locator('.team-rink')).toHaveAttribute(
    'data-ready',
    'true',
  );
  return region;
}
test('BKL-037 catalogue timeline animates to each teaching step and preserves continuous playback and source data', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const demo = await openModel(page),
    player = demo.locator('.demonstration-player'),
    markers = demo.locator('.demonstration-timeline button[data-tick]');
  const source = await (
    await page.request.get('/api/v1/catalog/catalog-D_TO_D_REVERSE')
  ).json();
  const ticks = await markers.evaluateAll((elements) =>
    elements.map((el) => Number(el.getAttribute('data-tick'))),
  );
  expect(ticks.length).toBeGreaterThan(3);
  expect(ticks).toEqual([...new Set(ticks)].sort((a, b) => a - b));
  expect(ticks.at(-1)).toBe(360);
  const step = demo.getByRole('button', {
    name: 'Lire le modèle jusqu’à l’étape suivante',
    exact: true,
  });
  await demo
    .getByRole('combobox', { name: 'Vitesse', exact: true })
    .selectOption('0.5');
  if (isMobile) await step.tap();
  else await step.click();
  await expect(player).toHaveAttribute('data-playing', 'true');
  await expect
    .poll(async () => Number(await player.getAttribute('data-tick')))
    .toBeGreaterThan(0);
  expect(Number(await player.getAttribute('data-tick'))).toBeLessThan(
    ticks[1]!,
  );
  await expect(player).toHaveAttribute('data-tick', String(ticks[1]));
  await expect(player).toHaveAttribute('data-playing', 'false');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await player.getAttribute('data-tick')).toBe(String(ticks[1]));
  await expect(
    demo.getByRole('complementary', {
      name: 'Description de l’étape',
      exact: true,
    }),
  ).toContainText('Renversement D à D');
  await demo
    .getByRole('combobox', { name: 'Vitesse', exact: true })
    .selectOption('2');
  await step.click();
  await expect(player).toHaveAttribute('data-tick', String(ticks[2]));
  await expect(player).toHaveAttribute('data-playing', 'false');
  await demo
    .getByRole('button', { name: 'Revenir au début du modèle', exact: true })
    .click();
  await expect(player).toHaveAttribute('data-tick', '0');
  await demo
    .getByRole('button', { name: 'Tout lire le modèle', exact: true })
    .click();
  await expect
    .poll(async () => Number(await player.getAttribute('data-tick')))
    .toBeGreaterThan(ticks[2]!);
  await expect(player).toHaveAttribute('data-playing', 'true');
  const beforeSwitch = Number(await player.getAttribute('data-tick'));
  await step.click();
  await expect(player).toHaveAttribute('data-mode', 'step');
  await expect(player).toHaveAttribute('data-playing', 'false');
  const stoppedAt = Number(await player.getAttribute('data-tick'));
  expect(stoppedAt).toBeGreaterThan(beforeSwitch);
  expect(ticks).toContain(stoppedAt);

  const middle = ticks[1]! / 2;
  await demo
    .getByRole('slider', { name: 'Position de la démonstration', exact: true })
    .evaluate((el, t) => {
      (el as HTMLInputElement).value = String(t);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, middle);
  await expect(player).toHaveAttribute('data-tick', String(middle));
  await step.click();
  await expect(player).toHaveAttribute('data-tick', String(ticks[1]));
  await markers.last().focus();
  await markers.last().press('Enter');
  await expect(player).toHaveAttribute('data-tick', '360');
  await expect(step).toBeDisabled();
  await expect(
    demo.getByRole('button', { name: 'Tout lire le modèle', exact: true }),
  ).toBeEnabled();
  if (isMobile) await markers.first().tap();
  else await markers.first().click();
  await expect(player).toHaveAttribute('data-tick', '0');
  const measurements = await demo.evaluate((el) => {
    const rink = el.querySelector('.team-rink-wrap')!.getBoundingClientRect(),
      editor = el
        .querySelector('.demonstration-editor')!
        .getBoundingClientRect(),
      bubble = el
        .querySelector('.demonstration-bubble')!
        .getBoundingClientRect(),
      ice = el.querySelector('.team-rink')!.getBoundingClientRect();
    return {
      difference: Math.abs(rink.width - editor.width),
      after: editor.top >= rink.bottom,
      left: bubble.right <= ice.left + 2,
      above: bubble.bottom <= ice.top + 2,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(measurements.difference).toBeLessThanOrEqual(2);
  expect(measurements.after).toBe(true);
  expect(measurements.overflow).toBe(false);
  expect(measurements.left || measurements.above).toBe(true);
  expect(
    (
      await (
        await page.request.get('/api/v1/catalog/catalog-D_TO_D_REVERSE')
      ).json()
    ).checksum,
  ).toBe(source.checksum);
  expect(errors).toEqual([]);
  const a11y = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await demo.screenshot({ path: info.outputPath('demonstration-steps.png') });
});
test('BKL-037 assigned lesson shares the teaching timeline, accurate step stops, speed and reset controls', async ({
  page,
}) => {
  await page.goto('/equipes');
  await page.getByRole('button', { name: 'Joueur M11', exact: true }).click();
  await page.getByRole('button', { name: 'Mes leçons', exact: true }).click();
  await page
    .getByRole('button', { name: 'Ouvrir la leçon', exact: true })
    .first()
    .click();
  const lesson = page.getByRole('region', {
      name: 'Lecteur de leçon',
      exact: true,
    }),
    player = lesson.locator('.demonstration-player');
  await expect(player).toBeVisible();
  const ticks = await lesson
    .locator('.demonstration-timeline button[data-tick]')
    .evaluateAll((es) => es.map((el) => Number(el.getAttribute('data-tick'))));
  expect(ticks.length).toBeGreaterThan(1);
  await lesson
    .getByRole('combobox', { name: 'Vitesse', exact: true })
    .selectOption('2');
  await lesson
    .getByRole('button', {
      name: 'Lire la démonstration jusqu’à l’étape suivante',
      exact: true,
    })
    .click();
  await expect(player).toHaveAttribute('data-tick', String(ticks[1]));
  await expect(player).toHaveAttribute('data-playing', 'false');
  await lesson
    .getByRole('button', {
      name: 'Revenir au début de la démonstration',
      exact: true,
    })
    .click();
  await expect(player).toHaveAttribute('data-tick', '0');
  await expect(
    lesson.getByRole('button', {
      name: 'Tout lire la démonstration',
      exact: true,
    }),
  ).toBeEnabled();
});
