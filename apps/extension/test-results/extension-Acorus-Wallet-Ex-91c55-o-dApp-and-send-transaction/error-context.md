# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extension.spec.ts >> Acorus Wallet Extension >> Complete onboarding, connect to dApp, and send transaction
- Location: e2e\extension.spec.ts:45:3

# Error details

```
Error: page.goto: net::ERR_FILE_NOT_FOUND at chrome-extension://flonobpbhojcjdkkdmdjpgolmdhpagkf/static/popup.html
Call log:
  - navigating to "chrome-extension://flonobpbhojcjdkkdmdjpgolmdhpagkf/static/popup.html", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { chromium, type BrowserContext } from 'playwright';
  3   | import path from 'path';
  4   | import { fileURLToPath } from 'url';
  5   | 
  6   | const __dirname = path.dirname(fileURLToPath(import.meta.url));
  7   | 
  8   | test.describe('Acorus Wallet Extension', () => {
  9   |   let context: BrowserContext;
  10  |   let extensionId: string;
  11  | 
  12  |   test.beforeAll(async () => {
  13  |     const extensionPath = path.join(__dirname, '../dist');
  14  |     
  15  |     context = await chromium.launchPersistentContext('', {
  16  |       headless: false,
  17  |       args: [
  18  |         `--disable-extensions-except=${extensionPath}`,
  19  |         `--load-extension=${extensionPath}`,
  20  |       ],
  21  |     });
  22  | 
  23  |     // Wait for all targets to be loaded to find the service worker
  24  |     await context.waitForEvent('serviceworker');
  25  |     
  26  |     // Find the background worker to get the extension ID
  27  |     let [background] = context.serviceWorkers();
  28  |     if (!background) {
  29  |       background = await context.waitForEvent('serviceworker');
  30  |     }
  31  | 
  32  |     const extensionUrl = background.url();
  33  |     // URL looks like: chrome-extension://[extension-id]/background.js
  34  |     const match = extensionUrl.match(/chrome-extension:\/\/([^\/]+)/);
  35  |     if (!match) {
  36  |       throw new Error(`Failed to extract extension ID from ${extensionUrl}`);
  37  |     }
  38  |     extensionId = match[1];
  39  |   });
  40  | 
  41  |   test.afterAll(async () => {
  42  |     await context.close();
  43  |   });
  44  | 
  45  |   test('Complete onboarding, connect to dApp, and send transaction', async () => {
  46  |     test.setTimeout(60000); // 1 minute timeout for the full flow
  47  | 
  48  |     const page = await context.newPage();
  49  |     
  50  |     // Step 1: Open extension popup
> 51  |     await page.goto(`chrome-extension://${extensionId}/static/popup.html`);
      |                ^ Error: page.goto: net::ERR_FILE_NOT_FOUND at chrome-extension://flonobpbhojcjdkkdmdjpgolmdhpagkf/static/popup.html
  52  |     await page.waitForLoadState('networkidle');
  53  | 
  54  |     // Onboarding: Create Wallet
  55  |     await page.click('button:has-text("Create New Wallet")');
  56  |     await page.fill('input[type="password"]:first-of-type', 'AcorusTest123!');
  57  |     await page.fill('input[type="password"]:last-of-type', 'AcorusTest123!');
  58  |     await page.click('button:has-text("Create Password")');
  59  | 
  60  |     // Make sure we landed on Dashboard (Account 1 should be visible)
  61  |     await expect(page.locator('text=Account 1')).toBeVisible({ timeout: 10000 });
  62  | 
  63  |     // Step 2: Open dummy dApp
  64  |     const dappPage = await context.newPage();
  65  |     // Assuming the dApp is served locally or we use file://
  66  |     const dappPath = path.join(__dirname, '../../web/public/dummy-dapp.html');
  67  |     await dappPage.goto(`file://${dappPath}`);
  68  | 
  69  |     // Click "Connect Wallet"
  70  |     await dappPage.click('#connectBtn');
  71  | 
  72  |     // Step 3: Switch back to extension and approve connection
  73  |     await page.bringToFront();
  74  |     // We need to wait for the popup content to change or re-open the popup
  75  |     await page.goto(`chrome-extension://${extensionId}/static/popup.html`);
  76  |     await expect(page.locator('text=Signature Request')).toBeVisible();
  77  |     await page.click('button:has-text("Sign")');
  78  | 
  79  |     // Verify dApp shows connected
  80  |     await dappPage.bringToFront();
  81  |     await expect(dappPage.locator('#status')).toHaveText('Connected', { timeout: 10000 });
  82  | 
  83  |     // Step 4: Click Send Transaction in dApp
  84  |     await dappPage.click('#sendBtn');
  85  | 
  86  |     // Step 5: Switch back to extension and approve transaction
  87  |     await page.bringToFront();
  88  |     await page.goto(`chrome-extension://${extensionId}/static/popup.html`);
  89  |     await expect(page.locator('text=Transaction Request')).toBeVisible();
  90  |     await expect(page.locator('text=Native Value')).toBeVisible(); // Check our new UI decoding
  91  |     
  92  |     // We would need a real private key with funds to successfully send, but we can check if it attempts
  93  |     // So we'll just check if the Reject button works to clear it
  94  |     await page.click('button:has-text("Reject")');
  95  | 
  96  |     // Verify DApp gets error
  97  |     await dappPage.bringToFront();
  98  |     await expect(dappPage.locator('#logs')).toContainText('Error:');
  99  |   });
  100 | });
  101 | 
```