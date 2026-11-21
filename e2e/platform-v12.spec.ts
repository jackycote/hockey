import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
// Continuous WebGL readbacks from DOM trace snapshots stall desktop SwiftShader.
// Keep action/network/source traces and explicit PNG evidence without sampling the live canvas.
test.use({
  trace: {
    mode: 'retain-on-failure',
    screenshots: false,
    snapshots: false,
    sources: true,
  },
});
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
async function login(page: Page, name: string) {
  await page.goto('/equipes');
  await button(page, name).click();
  await expect(button(page, 'Déconnexion')).toBeVisible();
}
async function chooseTeam(page: Page, name: string) {
  await page
    .getByRole('combobox', { name: 'Équipe active', exact: true })
    .selectOption({ label: name + ' · Entraîneur' });
  await expect(
    page.getByRole('heading', { name: 'Mes projets tactiques', exact: true }),
  ).toBeVisible();
}
test('v1.2 coach creates a project, edits a scenario, records an intervention, publishes and assigns; player reads privately on mobile', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(90000);
  const name = 'Équipe essai ' + randomUUID().slice(0, 8),
    projectName = 'Sortie pédagogique',
    systemName = 'Centre bas personnalisé',
    scenarioName = 'Récupération derrière le filet',
    recordName = 'Démonstration du centre',
    lessonName = 'Lire la sortie · ' + randomUUID().slice(0, 5);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'Coach Démo');
  await button(page, 'Mon équipe').click();
  await page
    .getByRole('textbox', { name: 'Nom de l’équipe', exact: true })
    .fill(name);
  await button(page, 'Créer l’équipe').click();
  await page
    .getByRole('textbox', { name: 'Nom du nouveau projet', exact: true })
    .fill(projectName);
  await button(page, 'Créer un projet').click();
  await page
    .getByRole('textbox', { name: 'Nom du système', exact: true })
    .fill(systemName);
  await page
    .getByRole('combobox', { name: 'Condition 1', exact: true })
    .selectOption('pass_lane');
  await page
    .getByRole('textbox', { name: 'Explication de la décision', exact: true })
    .fill('Lire la ligne libre avant de renverser.');
  await button(page, 'Vérifier les règles').click();
  await expect(page.locator('.platform-validation')).toContainText(
    'Système valide',
  );
  await button(page, 'Enregistrer le système').click();
  await expect(page.locator('.platform-notice')).toContainText(
    'Système enregistré',
  );
  await button(page, 'Scénarios').click();
  await page
    .getByRole('textbox', { name: 'Nom du scénario', exact: true })
    .fill(scenarioName);
  const workbench = page.getByRole('region', {
    name: 'Atelier du projet',
    exact: true,
  });
  await expect(workbench.locator('.team-rink')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const x = workbench.getByRole('spinbutton', { name: 'X (m)', exact: true });
  await x.fill('14');
  await x.press('Tab');
  await button(page, 'Enregistrer le scénario').click();
  await expect(page.locator('.platform-notice')).toContainText(
    'Scénario enregistré',
  );
  await button(page, 'Tester ce scénario').click();
  await expect(button(page, 'Lire le test')).toBeEnabled();
  await button(page, 'Avancer le test d’un pas').click();
  await expect(page.locator('.platform-decisions')).toContainText(
    'Lire la ligne libre avant de renverser.',
  );
  await button(page, 'Lire le test').click();
  await expect
    .poll(async () =>
      Number(
        (
          await page.locator('.platform-transport output').textContent()
        )?.replace(' s', ''),
      ),
    )
    .toBeGreaterThanOrEqual(0.3);
  await button(page, 'Pause du test').click();

  await x.fill('17');
  await x.press('Tab');
  await expect(
    page.getByText(
      'Intervention prête; avancer ou reprendre pour l’appliquer.',
      { exact: true },
    ),
  ).toBeVisible();
  await button(page, 'Avancer le test d’un pas').click();
  await expect(
    page.getByText(
      'Intervention prête; avancer ou reprendre pour l’appliquer.',
      { exact: true },
    ),
  ).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Consigne', exact: true })
    .fill('Regarder le centre avant de passer.');
  await page
    .getByRole('combobox', { name: 'Type d’annotation', exact: true })
    .selectOption('pause');
  await page
    .getByRole('spinbutton', { name: 'À (secondes)', exact: true })
    .fill('0.1');
  await button(page, 'Ajouter l’annotation').click();
  await page
    .getByRole('textbox', { name: 'Consigne', exact: true })
    .fill('Présenter une ligne de passe.');
  await page
    .getByRole('combobox', { name: 'Type d’annotation', exact: true })
    .selectOption('arrow');
  await button(page, 'Ajouter l’annotation').click();
  await page
    .getByRole('textbox', { name: 'Consigne', exact: true })
    .fill('Suivre l’ailier.');
  await page
    .getByRole('combobox', { name: 'Type d’annotation', exact: true })
    .selectOption('focus');
  await button(page, 'Ajouter l’annotation').click();

  await page
    .getByRole('textbox', { name: 'Nom de la séquence', exact: true })
    .fill(recordName);
  await button(page, 'Enregistrer la séquence').click();
  await expect(page.locator('.platform-notice')).toContainText(
    'Séquence figée',
  );
  await page
    .getByRole('textbox', { name: 'Nom de la leçon', exact: true })
    .fill(lessonName);
  await page
    .getByRole('textbox', { name: 'Description de la leçon', exact: true })
    .fill('Trouver une solution de soutien.');
  await page.getByRole('checkbox', { name: recordName, exact: true }).check();
  await button(page, 'Enregistrer la leçon').click();
  await button(page, 'Publier la leçon').click();
  await expect(page.locator('.platform-notice')).toContainText(
    'Version immuable',
  );
  await button(page, 'Affecter la leçon').click();
  await expect(page.locator('.platform-notice')).toContainText(
    'Leçon affectée',
  );
  await button(page, 'Mon équipe').click();
  await button(page, 'Créer une invitation').click();
  const invitation = (await page
    .locator('.platform-invitation code')
    .textContent())!;
  await button(page, 'Déconnexion').click();
  await button(page, 'Joueur M11').click();
  await button(page, 'Mon équipe').click();
  await page
    .getByRole('textbox', { name: 'Code d’invitation', exact: true })
    .fill(invitation);
  await button(page, 'Rejoindre l’équipe').click();
  await page
    .getByRole('combobox', { name: 'Équipe active', exact: true })
    .selectOption({ label: name + ' · Joueur' });
  await expect(button(page, 'Mes projets')).toHaveCount(0);
  const lessonRow = page.locator('.platform-resource-row').filter({
    has: page.getByRole('heading', { name: lessonName, exact: true }),
  });
  await lessonRow
    .getByRole('button', { name: 'Ouvrir la leçon', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Lecteur de leçon', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.lesson-player .team-rink')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await button(page, 'Tout lire la démonstration').click();
  await expect
    .poll(() => page.locator('.lesson-player output').last().textContent())
    .toContain('0.1');
  await expect(
    page.locator('.lesson-player .team-zone-overlay line'),
  ).toBeVisible();
  await button(page, 'Marquer comme terminé').click();
  await expect(button(page, 'Leçon terminée')).toBeDisabled();
  const forbidden = await page.request.get('/api/v1/teams/demo-m13/projects');
  expect(forbidden.status()).toBe(404);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('player-lesson.png'),
    fullPage: true,
  });
  if (isMobile)
    await expect(
      page.getByRole('button', { name: 'Leçon terminée', exact: true }),
    ).toBeVisible();
});
test('v1.2 team switching, Free quota and catalogue assignment preserve tenant boundaries', async ({
  page,
}, info) => {
  await login(page, 'Coach Démo');
  await chooseTeam(page, 'M11 Démo');
  await expect(
    page.getByText('Sorties de zone M11', { exact: true }),
  ).toBeVisible();
  await expect(button(page, 'Créer un projet')).toBeDisabled();
  await button(page, 'Catalogue').click();
  await page
    .locator('.platform-project-list article')
    .first()
    .getByRole('button', { name: 'Affecter à l’équipe', exact: true })
    .click();
  await expect(page.locator('.platform-notice')).toContainText(
    'aucun projet ajouté',
  );
  await expect(
    button(page, 'Créer un projet depuis ce modèle').first(),
  ).toBeDisabled();
  await button(page, 'Essayer le modèle').first().click();
  const demo = page.getByRole('region', {
    name: 'Simulation du catalogue',
    exact: true,
  });
  const player = demo.locator('.demonstration-player');
  await expect(player).toBeVisible();
  const target = await demo
    .locator('.demonstration-timeline button[data-tick]')
    .nth(1)
    .getAttribute('data-tick');
  await demo
    .getByRole('button', {
      name: 'Lire le modèle jusqu’à l’étape suivante',
      exact: true,
    })
    .click();
  await expect(player).toHaveAttribute('data-tick', target!);
  await expect(player).toHaveAttribute('data-playing', 'false');
  await chooseTeam(page, 'M13 Démo');
  await expect(
    page.getByText('Sorties de zone M11', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Sorties de zone M13', { exact: true }),
  ).toBeVisible();
  await expect(button(page, 'Créer un projet')).toBeEnabled();
  await page.screenshot({
    path: info.outputPath('coach-projects.png'),
    fullPage: true,
  });
  await button(page, 'Catalogue').click();
  await button(page, 'Créer un projet depuis ce modèle').first().click();
  await expect(
    page.getByRole('region', { name: 'Atelier du projet', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.platform-notice')).toContainText(
    'nouveau projet privé',
  );
});
