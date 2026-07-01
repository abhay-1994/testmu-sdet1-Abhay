import { test, expect } from './fixtures';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';

const VALID_USERNAME = 'Admin';
const VALID_PASSWORD = 'admin123';

const EXPECTED_WIDGETS = [
  'Time at Work',
  'My Actions',
  'Quick Launch',
  'Buzz Latest Posts',
  'Employees on Leave Today',
  'Employee Distribution by Sub Unit',
  'Employee Distribution by Location',
];

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await expect(page).toHaveURL(/dashboard\/index/);
  });

  test('all expected widgets load on the dashboard', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoaded();

    const titles = await dashboard.getWidgetTitles();
    for (const expected of EXPECTED_WIDGETS) {
      expect(titles).toContain(expected);
    }
  });

  test('an admin user sees permission-gated navigation items', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoaded();

    const sidebarItems = await dashboard.getSidebarItems();
    // "Admin" and "Maintenance" are only visible to users with administrator privileges —
    // an ESS/regular-employee login on this same demo does not see them.
    expect(sidebarItems).toContain('Admin');
    expect(sidebarItems).toContain('Maintenance');
  });

  test('the dashboard collapses to a mobile layout on small viewports', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.reload();

    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoaded();

    // On mobile the full sidebar collapses behind a hamburger toggle and widgets stack
    // into a single column instead of the desktop multi-column grid.
    await expect(page.locator('.oxd-topbar-header-hamburger')).toBeVisible();
    await expect(dashboard.widgetHeaders.first()).toBeVisible();
  });
});
