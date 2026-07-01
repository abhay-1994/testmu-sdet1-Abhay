import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly requiredFieldErrors: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorAlert = page.locator('.oxd-alert-content-text');
    this.requiredFieldErrors = page.locator('.oxd-input-group__message');
    this.forgotPasswordLink = page.getByText('Forgot your password?');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
    await this.usernameInput.waitFor({ state: 'visible' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async submitEmpty(): Promise<void> {
    await this.submitButton.click();
  }
}
