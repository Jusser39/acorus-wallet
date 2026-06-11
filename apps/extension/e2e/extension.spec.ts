import { test, expect } from '@playwright/test';
import { chromium, type BrowserContext } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Acorus Wallet Extension', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    const extensionPath = path.join(__dirname, '../dist');
    
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    // Wait for all targets to be loaded to find the service worker
    await context.waitForEvent('serviceworker');
    
    // Find the background worker to get the extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionUrl = background.url();
    // URL looks like: chrome-extension://[extension-id]/background.js
    const match = extensionUrl.match(/chrome-extension:\/\/([^\/]+)/);
    if (!match) {
      throw new Error(`Failed to extract extension ID from ${extensionUrl}`);
    }
    extensionId = match[1];
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Complete onboarding, connect to dApp, and send transaction', async () => {
    test.setTimeout(60000); // 1 minute timeout for the full flow

    const page = await context.newPage();
    
    // Step 1: Open extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForLoadState('networkidle');

    // Onboarding: Create Wallet
    await page.click('button:has-text("Create New Wallet")');
    await page.fill('input[type="password"]:first-of-type', 'AcorusTest123!');
    await page.fill('input[type="password"]:last-of-type', 'AcorusTest123!');
    await page.click('button:has-text("Create Password")');

    // Make sure we landed on Dashboard (Account 1 should be visible)
    await expect(page.locator('text=Account 1')).toBeVisible({ timeout: 10000 });

    // Step 2: Open dummy dApp
    const dappPage = await context.newPage();
    // Assuming the dApp is served locally or we use file://
    const dappPath = path.join(__dirname, '../../web/public/dummy-dapp.html');
    await dappPage.goto(`file://${dappPath}`);

    // Click "Connect Wallet"
    await dappPage.click('#connectBtn');

    // Step 3: Switch back to extension and approve connection
    await page.bringToFront();
    // We need to wait for the popup content to change or re-open the popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.locator('text=Signature Request')).toBeVisible();
    await page.click('button:has-text("Sign")');

    // Verify dApp shows connected
    await dappPage.bringToFront();
    await expect(dappPage.locator('#status')).toHaveText('Connected', { timeout: 10000 });

    // Step 4: Click Send Transaction in dApp
    await dappPage.click('#sendBtn');

    // Step 5: Switch back to extension and approve transaction
    await page.bringToFront();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.locator('text=Transaction Request')).toBeVisible();
    await expect(page.locator('text=Native Value')).toBeVisible(); // Check our new UI decoding
    
    // We would need a real private key with funds to successfully send, but we can check if it attempts
    // So we'll just check if the Reject button works to clear it
    await page.click('button:has-text("Reject")');

    // Verify DApp gets error
    await dappPage.bringToFront();
    await expect(dappPage.locator('#logs')).toContainText('Error:');
  });
});
