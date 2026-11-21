import { expect, test, type Page } from '@playwright/test';
import golden from '../packages/simulation-core/test/fixtures/motion-v0.1.0.json' with { type: 'json' };
const currentTick = async (page: Page) =>
  Number(await page.getByTestId('simulation-tick').textContent());
async function openReference(page: Page) {
  await page.goto('/');
  await expect(page.locator('.rink-board')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.getByLabel('Importer', { exact: true }).setInputFiles({
    name: 'reference.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(golden.scenario)),
  });
  await expect(page.getByLabel('Titre du scénario')).toHaveValue(
    golden.scenario.title,
  );
}
async function step(page: Page, expected: number) {
  await page
    .getByRole('button', { name: 'Avancer d’un pas', exact: true })
    .click();
  await expect(page.getByTestId('simulation-tick')).toHaveText(
    String(expected),
  );
}
async function assertHash(page: Page, tick: number) {
  await expect(page.getByTestId('simulation-hash')).toHaveAttribute(
    'data-hash',
    (golden.hashes as Record<string, string>)[String(tick)]!,
  );
}
test('real Worker matches the Node golden trace through a seeded pass and a reset', async ({
  page,
}) => {
  await openReference(page);
  await page.getByRole('tab', { name: 'Équipes', exact: true }).click();
  await page.locator('.puck-row').click();
  await page
    .getByRole('button', { name: 'Préparer un déplacement', exact: true })
    .click();
  await expect(page.locator('[data-entity="player:a-0"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await step(page, 1);
  await assertHash(page, 1);
  for (let tick = 2; tick <= 14; tick++) await step(page, tick);
  await page
    .getByLabel('Destinataire de la passe', { exact: true })
    .selectOption('a-4');
  await page
    .getByRole('button', { name: 'Préparer la passe', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText(
    'Passe prête au prochain pas',
  );
  await expect(page.getByTestId('simulation-tick')).toHaveText('14');
  await step(page, 15);
  await assertHash(page, 15);
  for (let tick = 16; tick <= 30; tick++) await step(page, tick);
  await assertHash(page, 30);
  await page
    .getByRole('button', { name: 'Réinitialiser la simulation', exact: true })
    .click();
  await expect(page.getByTestId('simulation-tick')).toHaveText('0');
  await assertHash(page, 0);
  await step(page, 1);
  await assertHash(page, 1);
});
test('plays movement, pauses exactly, steps, and preserves the editable starting scenario', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openReference(page);
  const marker = page.locator('[data-entity="player:a-0"]'),
    before = await marker.getAttribute('style');
  await page
    .getByRole('button', { name: 'Démarrer la simulation', exact: true })
    .click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'running',
  );
  await expect.poll(() => currentTick(page)).toBeGreaterThan(5);
  await expect(marker).not.toHaveAttribute('style', before!);
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', {
      name: 'Réinitialiser le scénario',
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'paused',
  );
  const paused = await currentTick(page);
  await page.waitForTimeout(160);
  expect(await currentTick(page)).toBe(paused);
  await step(page, paused + 1);
  await page
    .getByRole('button', {
      name: 'Modifier la situation initiale',
      exact: true,
    })
    .click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'editing',
  );
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toHaveValue('20');
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
test('a hidden document pauses the Worker instead of accumulating a catch-up jump', async ({
  page,
}) => {
  await openReference(page);
  await page
    .getByRole('button', { name: 'Démarrer la simulation', exact: true })
    .click();
  await expect.poll(() => currentTick(page)).toBeGreaterThan(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'paused',
  );
  const paused = await currentTick(page);
  await page.waitForTimeout(160);
  expect(await currentTick(page)).toBe(paused);
});
test('a Worker loading failure keeps the editor usable and can be retried', async ({
  page,
}) => {
  await page.route('**/simulation.worker-*.js', (route) => route.abort());
  await openReference(page);
  await page
    .getByRole('button', { name: 'Avancer d’un pas', exact: true })
    .click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'error',
    { timeout: 12000 },
  );
  await expect(page.getByRole('alert')).toContainText(
    'simulation n’a pas pu continuer',
  );
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toBeEnabled();
  await page.unroute('**/simulation.worker-*.js');
  await step(page, 1);
  await assertHash(page, 1);
});

test('an engine transport failure after progress returns to a consistent editable setup', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let failOnce = true;
    window.Worker = class extends NativeWorker {
      override postMessage(
        message: unknown,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        if (
          failOnce &&
          typeof message === 'object' &&
          message !== null &&
          'type' in message &&
          message.type === 'pause'
        ) {
          failOnce = false;
          this.dispatchEvent(
            new ErrorEvent('error', {
              cancelable: true,
              message: 'Test transport failure',
            }),
          );
          return;
        }
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
  await openReference(page);
  await page
    .getByRole('button', { name: 'Démarrer la simulation', exact: true })
    .click();
  await expect.poll(() => currentTick(page)).toBeGreaterThan(2);
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await expect(page.getByTestId('simulation-mode')).toHaveAttribute(
    'data-mode',
    'error',
  );
  await expect(page.getByTestId('simulation-tick')).toHaveText('0');
  await expect(
    page.getByRole('spinbutton', { name: 'X (m)', exact: true }),
  ).toHaveValue('20');
  await expect(page.getByTestId('simulation-hash')).toHaveCount(0);
  await step(page, 1);
  await assertHash(page, 1);
});
