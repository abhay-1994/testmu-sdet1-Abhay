import { test, expect } from './fixtures';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';

const VALID_USERNAME = 'Admin';
const VALID_PASSWORD = 'admin123';

test.describe('Login', () => {
  test('valid credentials log the user in and land on the dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);

    await expect(page).toHaveURL(/dashboard\/index/);
    await dashboard.waitForLoaded();
    await expect(dashboard.breadcrumb).toHaveText('Dashboard');
  });

  test('invalid credentials show an error and keep the user on the login page', async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, 'not-the-real-password');

    await expect(login.errorAlert).toHaveText('Invalid credentials');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('submitting an empty form shows required-field validation', async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.submitEmpty();

    await expect(login.requiredFieldErrors.first()).toBeVisible();
    const messages = await login.requiredFieldErrors.allTextContents();
    expect(messages.some((m) => m.toLowerCase().includes('required'))).toBe(true);
  });

  test('an expired/cleared session redirects protected routes back to login', async ({ page, context }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await expect(page).toHaveURL(/dashboard\/index/);

    // Simulate session expiry by dropping the session cookie, the same signal the app
    // uses when a real session times out server-side.
    await context.clearCookies();
    await page.goto('/web/index.php/dashboard/index');

    await expect(page).toHaveURL(/auth\/login/);
  });

  // Intentionally-wrong assertion — kept in the suite on purpose to produce a real,
  // reproducible failure for Task 3 (AI Failure Explainer). Claude is sent this test's
  // real error message + live page state and returns a plain-English root cause and fix;
  // see the "ai-failure-analysis.md" attachment on this test in the HTML report, and
  // sample-output/ai-failure-report.json for a saved copy. Safe to delete once you've
  // seen the integration work — it does not test real product behavior.
  test('[AI-DEMO] invalid credentials shows an unrelated error message', async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, 'not-the-real-password');

    await expect(login.errorAlert).toHaveText('Account locked, contact your administrator');
  });
});
