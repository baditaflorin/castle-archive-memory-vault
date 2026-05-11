import { expect, test } from '@playwright/test';

test('homepage renders and prompts for identity', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Castle Archive/i);
  await expect(page.getByRole('heading', { name: /Castle Archive/i })).toBeVisible();
});

test('can create an identity and reach the vault', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/Display name/i).fill('Smoke Pilgrim');
  await page
    .getByLabel(/^Passphrase/i)
    .first()
    .fill('castle-passphrase-1');
  await page.getByLabel(/Confirm passphrase/i).fill('castle-passphrase-1');
  await page.getByRole('button', { name: /Create identity/i }).click();
  await expect(page.getByRole('heading', { name: /Today.s reflection/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: /Lock/i })).toBeVisible();
});
