import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly breadcrumb: Locator;
  readonly widgetHeaders: Locator;
  readonly sidebarMenuItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.breadcrumb = page.locator('h6.oxd-topbar-header-breadcrumb-module');
    this.widgetHeaders = page.locator('.orangehrm-dashboard-widget-header');
    this.sidebarMenuItems = page.locator('.oxd-main-menu-item');
  }

  async waitForLoaded(): Promise<void> {
    await this.breadcrumb.waitFor({ state: 'visible' });
  }

  async getWidgetTitles(): Promise<string[]> {
    return this.widgetHeaders.allTextContents();
  }

  async getSidebarItems(): Promise<string[]> {
    return this.sidebarMenuItems.allTextContents();
  }
}
