import { expect, type Locator, type Page } from '@playwright/test';

export type MenuItem = {
  name: string;
  description: string;
  imageUrl: string;
};

export class MenuPage {
  readonly page: Page;
  readonly menuItems: Locator;
  readonly cartItems: Locator;
  readonly totalItems: Locator;
  readonly placeOrderButton: Locator;
  readonly todayMenuHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menuItems = page.locator('.menu-item');
    this.cartItems = page.locator('#cart-items');
    this.totalItems = page.locator('#total-items');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order' });
    this.todayMenuHeading = page.getByRole('heading', { name: /today's menu/i });
  }

  menuItem(name: string): Locator {
    return this.menuItems.filter({ hasText: name });
  }

  cartItem(name: string): Locator {
    return this.page.locator('.cart-item').filter({ hasText: name });
  }

  quantityDisplay(name: string): Locator {
    return this.menuItem(name).locator('.quantity-display');
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async addPizza(name: string, times = 1): Promise<void> {
    const pizza = this.menuItem(name);
    await expect(pizza.locator('.quantity-btn')).toHaveCount(2);

    for (let count = 0; count < times; count += 1) {
      await pizza.getByRole('button', { name: '+', exact: true }).click();
    }
  }

  async removePizza(name: string): Promise<void> {
    const pizza = this.menuItem(name);
    await expect(pizza.locator('.quantity-btn')).toHaveCount(2);
    await pizza.locator('.quantity-btn').first().click();
  }

  async expectMenuItem(name: string, description: string, imageUrl: string): Promise<void> {
    const pizza = this.menuItem(name);
    const image = pizza.locator('img');

    await expect(pizza).toBeVisible();
    await expect(pizza).toContainText(description);
    await expect(image).toHaveAttribute('alt', name);
    await expect(image).toHaveAttribute('src', imageUrl);
    await expect(image).toBeVisible();
  }
}
