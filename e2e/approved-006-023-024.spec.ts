import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { addStepAfter, openRinkZoom } from './step-actions.js';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const board = (page: Page) => page.locator('.rink-board');
async function open(page: Page) {
  await page.goto('/editor-local');
  await expect(board(page)).toHaveAttribute('data-ready', 'true');
}
async function documentValue(page: Page) {
  const download = page.waitForEvent('download');
  await button(page, 'Exporter JSON').click();
  return JSON.parse(
    await readFile(await (await download).path(), 'utf8'),
  ) as unknown;
}
async function audit(page: Page) {
  const controls = page
    .locator('button,a')
    .filter({ has: page.locator('svg,img,.record-dot,[aria-hidden]') });
  expect(await controls.count()).toBeGreaterThan(0);
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    await expect(control).toHaveAccessibleName(/\S/);
    for (const svg of await control.locator('svg').all())
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
  }
}
test('BKL-023 icon controls have French names and unclipped keyboard tooltips, including dynamic playback and Foundation', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  await audit(page);
  const tooltip = page.getByRole('tooltip');
  const move = button(page, 'Déplacer');
  await move.focus();
  await expect(tooltip).toHaveText('Déplacer');
  await expect(move).toHaveAttribute(
    'aria-describedby',
    (await tooltip.getAttribute('id')) ?? '',
  );
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await expect(move).toBeFocused();
  await button(page, 'Annuler').hover();
  await expect(tooltip).toHaveText('Annuler');
  await button(page, 'Placer').focus();
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveText('Placer');
  await button(page, 'Créer une séquence').click();
  await addStepAfter(page);
  await button(page, 'Revenir au début').click();
  await page
    .getByRole('combobox', { name: 'Vitesse de la séquence', exact: true })
    .selectOption('0.25');
  if (isMobile) await page.setViewportSize({ width: 320, height: 650 });
  const play = button(page, 'Lire la séquence');
  await play.focus();
  await expect(tooltip).toHaveText('Lire la séquence');
  await play.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(tooltip).toHaveText('Pause de la séquence');
  await button(page, 'Pause de la séquence').evaluate((el) =>
    (el as HTMLButtonElement).click(),
  );
  await expect(tooltip).toHaveText('Lire la séquence');
  await button(page, 'Zoom de la timeline').focus();
  await expect(tooltip).toHaveText('Zoom de la timeline');
  await expect
    .poll(() =>
      tooltip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= innerWidth &&
          r.bottom <= innerHeight
        );
      }),
    )
    .toBe(true);
  await page.screenshot({ path: info.outputPath('icon-help.png') });
  await audit(page);
  await page.goto('/fondation');
  await audit(page);
  const retry = button(page, 'Vérifier à nouveau');
  await expect(retry).toBeEnabled();
  await retry.focus();
  await expect(tooltip).toHaveText('Vérifier à nouveau');
  await expect(
    page.getByRole('img', { name: 'HockeyDoo', exact: true }),
  ).toHaveAttribute('alt', 'HockeyDoo');
});
test('BKL-023 hover help is dismissible and hoverable without obstructing commands or stealing focus', async ({
  page,
}) => {
  await open(page);
  const move = button(page, 'Déplacer');
  await move.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toHaveText('Déplacer');
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await button(page, 'Placer').click();
  await expect(button(page, 'Placer')).toHaveAttribute('aria-pressed', 'true');
  await expect(tooltip).toHaveCount(0);
  await openRinkZoom(page);
  await expect(
    page.getByRole('slider', { name: 'Zoom de la patinoire', exact: true }),
  ).toBeFocused();
  await expect(tooltip).toHaveCount(0);
});
test('BKL-024 saves toolbar height and opens horizontal zoom to the right with keyboard, touch, limits and camera synchronization', async ({
  page,
  isMobile,
}, info) => {
  await open(page);
  const original = page.viewportSize()!;
  const before = await documentValue(page);
  const trigger = button(page, 'Zoom de la patinoire');
  const dialog = page.getByRole('dialog', {
    name: 'Zoom de la patinoire',
    exact: true,
  });
  const slider = page.getByRole('slider', {
    name: 'Zoom de la patinoire',
    exact: true,
  });
  await expect(page.locator('.tools button')).toHaveCount(10);
  await expect(page.locator('.tools .rink-zoom-value')).toHaveCount(0);
  await expect(button(page, 'Agrandir')).toHaveCount(0);
  for (const width of isMobile ? [320, 390, 820] : [800, 1024, 1440]) {
    await page.setViewportSize({ width, height: original.height });
    await trigger.focus();
    const rect = await board(page).boundingBox();
    await page.keyboard.press('Enter');
    await expect(slider).toBeFocused();
    await expect(slider).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(await board(page).boundingBox()).toEqual(rect);
    await expect
      .poll(() =>
        dialog.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const t = document
            .querySelector('.rink-zoom-toggle')!
            .getBoundingClientRect();
          return (
            r.left >= t.right &&
            r.right <= innerWidth &&
            r.top >= 0 &&
            r.bottom <= innerHeight &&
            document.documentElement.scrollWidth <= innerWidth
          );
        }),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(dialog).toHaveCount(0);
  }
  await page.setViewportSize(original);
  if (isMobile) await trigger.tap();
  else await trigger.click();
  await expect(slider).toHaveValue('100');
  await expect(button(page, 'Réduire')).toBeDisabled();
  await slider.press('ArrowRight');
  await expect(board(page)).toHaveAttribute('data-zoom', '110');
  await slider.press('End');
  await expect(board(page)).toHaveAttribute('data-zoom', '300');
  await expect(button(page, 'Agrandir')).toBeDisabled();
  await slider.press('Home');
  await expect(board(page)).toHaveAttribute('data-zoom', '100');
  if (isMobile) await button(page, 'Agrandir').tap();
  else await button(page, 'Agrandir').click();
  await expect(page.getByTestId('zoom-value')).toHaveText('120%');
  await expect(slider).toHaveValue('120');
  await button(page, 'Réduire').click();
  await expect(slider).toHaveValue('100');
  await slider.evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '180';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(board(page)).toHaveAttribute('data-zoom', '180');
  await page.screenshot({ path: info.outputPath('rink-zoom.png') });
  const reset = button(page, 'Réinitialiser le zoom à 100 %');
  await reset.focus();
  await expect(page.getByRole('tooltip')).toHaveText(
    'Réinitialiser le zoom à 100 %',
  );
  await page.keyboard.press('Enter');
  await expect(reset).toBeFocused();
  await expect(dialog).toBeVisible();
  await expect(slider).toHaveValue('100');
  await expect(page.getByTestId('zoom-value')).toHaveText('100%');
  await expect(trigger).toHaveAttribute('aria-description', '100 %');
  await expect(board(page)).toHaveAttribute('data-zoom', '100');
  await slider.press('End');
  if (isMobile) await reset.tap();
  else await reset.click();
  await expect(reset).toBeFocused();
  await expect(slider).toHaveValue('100');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await button(page, 'Inverser la vue').click();
  await openRinkZoom(page);
  await slider.press('End');
  await reset.click();
  await expect(board(page)).toHaveAttribute('data-flipped', 'true');
  await expect(board(page)).toHaveAttribute('data-zoom', '100');
  await expect(reset).toBeFocused();
  await expect
    .poll(() =>
      dialog.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const controls = Array.from(
          el.querySelectorAll('button,input,output'),
        ).map((c) => c.getBoundingClientRect());
        return (
          r.right <= innerWidth &&
          controls.every(
            (c) =>
              c.left >= r.left &&
              c.right <= r.right &&
              Math.abs(c.top + c.height / 2 - r.top - r.height / 2) <= 1,
          )
        );
      }),
    )
    .toBe(true);

  await button(page, 'Cadrer la patinoire').click();
  await expect(dialog).toHaveCount(0);
  await openRinkZoom(page);
  const title = page.getByRole('textbox', {
    name: 'Titre du scénario',
    exact: true,
  });
  await title.click();
  await expect(title).toBeFocused();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-description', '100 %');
  await openRinkZoom(page);
  await expect(slider).toHaveValue('100');
  await page.keyboard.press('Escape');
  await board(page).focus();
  await page.keyboard.press('+');
  await openRinkZoom(page);
  await expect(slider).toHaveValue('120');
  expect(await documentValue(page)).toEqual(before);
  await expect(button(page, 'Annuler')).toBeDisabled();
});
test('BKL-024 follows viewport and rail scrolling, closes outside, and keeps authored playback camera stable', async ({
  page,
  isMobile,
}) => {
  await open(page);
  const trigger = button(page, 'Zoom de la patinoire');
  const dialog = page.getByRole('dialog', {
    name: 'Zoom de la patinoire',
    exact: true,
  });
  await trigger.focus();
  await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.keyboard.press('Space');
  await page.setViewportSize({ width: isMobile ? 320 : 1024, height: 480 });
  await expect
    .poll(() =>
      dialog.evaluate((el) => {
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
  await page.locator('.tools').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.evaluate(() => scrollTo(0, 0));
  await expect(dialog).toHaveCount(0);
  await button(page, 'Créer une séquence').click();
  await addStepAfter(page);
  await button(page, 'Revenir au début').click();
  await page
    .getByRole('combobox', { name: 'Vitesse de la séquence', exact: true })
    .selectOption('0.25');
  await button(page, 'Lire la séquence').click();
  await openRinkZoom(page);
  await page
    .getByRole('slider', { name: 'Zoom de la patinoire', exact: true })
    .evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = '160';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  const samples = await board(page).evaluate(async (el) => {
    const values = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame);
      values.push(el.getAttribute('data-zoom'));
    }
    return values;
  });
  expect(samples.every((v) => v === '160')).toBe(true);
  await button(page, 'Réinitialiser le zoom à 100 %').click();
  await expect(
    page.getByRole('dialog', { name: 'Zoom de la patinoire', exact: true }),
  ).toBeVisible();
  await expect(button(page, 'Pause de la séquence')).toBeVisible();
  const resetSamples = await board(page).evaluate(async (el) => {
    const values = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame);
      values.push(el.getAttribute('data-zoom'));
    }
    return values;
  });
  expect(resetSamples.every((v) => v === '100')).toBe(true);

  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await button(page, 'Pause de la séquence').click();
  await button(page, 'Revenir au début').click();
  await expect(board(page)).toHaveAttribute('data-zoom', '100');
});
