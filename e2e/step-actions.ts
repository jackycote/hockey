import type { Page } from '@playwright/test';
export async function addStepAfter(page: Page) {
  await page
    .getByRole('button', { name: 'Insérer une étape', exact: true })
    .click();
  await page
    .getByRole('menuitem', { name: 'Ajouter une étape après', exact: true })
    .click();
}

export async function openRinkZoom(page: Page) {
  const trigger = page.getByRole('button', {
    name: 'Zoom de la patinoire',
    exact: true,
  });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true')
    await trigger.click();
}
