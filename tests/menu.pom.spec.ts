import { expect, type APIRequestContext, test } from '@playwright/test';
import { MenuPage, type MenuItem } from './menu.page';

let menuItems: MenuItem[];

async function getBackendMenu(request: APIRequestContext): Promise<MenuItem[]> {
  const response = await request.get('/api/daily-menu');
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data.length).toBeGreaterThanOrEqual(2);

  return body.data;
}

test.beforeEach(async ({ page, request }) => {
  menuItems = await getBackendMenu(request);

  await page.route('**/api/daily-menu', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: menuItems,
        message: 'Daily menu retrieved successfully',
      }),
    });
  });

  const menuPage = new MenuPage(page);
  await menuPage.goto();
  await expect(menuPage.menuItems).toHaveCount(menuItems.length);
});

test.describe('Menu and cart interactions', () => {
  test.describe.configure({ mode: 'serial' });

  test('page loads with backend menu items', async ({ page }) => {
    const menuPage = new MenuPage(page);
    await expect(menuPage.todayMenuHeading).toBeVisible();

    for (const { name, description, imageUrl } of menuItems) {
      await menuPage.expectMenuItem(name, description, imageUrl);
    }
  });

  test('cart is initially empty', async ({ page }) => {
    const menuPage = new MenuPage(page);
    await expect(menuPage.cartItems).toContainText('Your cart is empty');
    await expect(menuPage.totalItems).toHaveText('0');
    await expect(menuPage.placeOrderButton).toBeDisabled();
  });

  test('increment quantity increases item count', async ({ page }) => {
    const menuPage = new MenuPage(page);
    const pizzaName = menuItems[0].name;
    await menuPage.addPizza(pizzaName);

    await expect(menuPage.quantityDisplay(pizzaName)).toHaveText('1');
    await expect(menuPage.cartItem(pizzaName)).toContainText('Quantity: 1');
    await expect(menuPage.totalItems).toHaveText('1');
  });

  test('decrement at zero keeps quantity at zero', async ({ page }) => {
    const menuPage = new MenuPage(page);
    const pizzaName = menuItems[0].name;
    await menuPage.removePizza(pizzaName);

    await expect(menuPage.quantityDisplay(pizzaName)).toHaveText('0');
    await expect(menuPage.cartItems).toContainText('Your cart is empty');
    await expect(menuPage.totalItems).toHaveText('0');
  });

  test('increment then decrement returns quantity to zero', async ({ page }) => {
    const menuPage = new MenuPage(page);
    const pizzaName = menuItems[0].name;
    await menuPage.addPizza(pizzaName);
    await menuPage.removePizza(pizzaName);

    await expect(menuPage.quantityDisplay(pizzaName)).toHaveText('0');
    await expect(menuPage.cartItems).toContainText('Your cart is empty');
    await expect(menuPage.totalItems).toHaveText('0');
  });

  test('cart reflects quantities across multiple pizza types', async ({ page }) => {
    const menuPage = new MenuPage(page);
    const firstPizzaName = menuItems[0].name;
    const secondPizzaName = menuItems[1].name;
    await menuPage.addPizza(firstPizzaName, 2);
    await menuPage.addPizza(secondPizzaName);

    await expect(menuPage.quantityDisplay(firstPizzaName)).toHaveText('2');
    await expect(menuPage.quantityDisplay(secondPizzaName)).toHaveText('1');
    await expect(menuPage.cartItem(firstPizzaName)).toContainText('Quantity: 2');
    await expect(menuPage.cartItem(secondPizzaName)).toContainText('Quantity: 1');
    await expect(menuPage.totalItems).toHaveText('3');
  });
});
