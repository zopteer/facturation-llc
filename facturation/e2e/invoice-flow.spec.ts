import { expect, test } from '@playwright/test';

test('connexion → création facture → envoi → export PDF → payée', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(process.env.E2E_EMAIL!);
  await page.getByPlaceholder('Mot de passe').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Connexion' }).click();
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

  await page.goto('/documents');
  // The document list depends on an async org lookup (useOrg) that resolves after
  // the initial render; clicking "+ Facture" before it settles is a silent no-op
  // (newDoc() bails out early while orgId is still null). Wait for the network to
  // go idle so the org lookup has resolved before interacting with the button.
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '+ Facture' }).click();
  await expect(page.getByRole('heading', { name: /Facture \(brouillon\)/ })).toBeVisible();

  await page.getByPlaceholder('Description du produit').fill('Prestation de test');
  const numbers = page.locator('input[type="number"]');
  await numbers.nth(0).fill('2');       // quantité
  await numbers.nth(1).fill('100');     // prix unitaire
  await expect(page.getByText('Enregistré', { exact: true })).toBeVisible({ timeout: 5000 });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter en PDF' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^Facture-.*\.pdf$/);

  await page.goto('/documents');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Marquer envoyée' }).first().click();
  // "Marquer envoyée" triggers an async update + list reload; without waiting for it
  // to settle, "Marquer payée".first() can resolve against a different, already-sent
  // row before the newly-sent draft's row re-renders with its own "Marquer payée"
  // button. Wait for the network to go idle so the reload has completed.
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Marquer payée' }).first().click();
  // Scope to the document list: the status filter <select> also has a hidden
  // "Payée" <option>, which getByText('Payée') would otherwise match first.
  await expect(page.locator('ul').getByText('Payée', { exact: true }).first()).toBeVisible();
});
