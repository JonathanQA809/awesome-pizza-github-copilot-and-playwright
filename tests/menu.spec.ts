import { expect, type APIRequestContext, type Locator, type Page, test } from '@playwright/test';

type MenuItem = {
  name: string;
  description: string;
  imageUrl: string;
};

let menuItems: MenuItem[];

function menuItem(page: Page, pizzaName: string): Locator {
  return page.locator('.menu-item').filter({ hasText: pizzaName });
}

function cartItem(page: Page, pizzaName: string): Locator {
  return page.locator('.cart-item').filter({ hasText: pizzaName });
}

function quantityDisplay(page: Page, pizzaName: string): Locator {
  return menuItem(page, pizzaName).locator('.quantity-display');
}

async function addPizza(page: Page, pizzaName: string, times = 1): Promise<void> {
  const pizza = menuItem(page, pizzaName);
  await expect(pizza.locator('.quantity-btn')).toHaveCount(2);

  for (let count = 0; count < times; count += 1) {
    await pizza.getByRole('button', { name: '+', exact: true }).click();
  }
}

async function removePizza(page: Page, pizzaName: string): Promise<void> {
  const pizza = menuItem(page, pizzaName);
  await expect(pizza.locator('.quantity-btn')).toHaveCount(2);
  await pizza.locator('.quantity-btn').first().click();
}

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

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.menu-item')).toHaveCount(menuItems.length);
});

test.describe('Menu and cart interactions', () => {
  test.describe.configure({ mode: 'serial' });

  test('page loads with backend menu items', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /today's menu/i })).toBeVisible();

    for (const { name, description, imageUrl } of menuItems) {
      const pizza = menuItem(page, name);
      const image = pizza.locator('img');

      await expect(pizza).toBeVisible();
      await expect(pizza).toContainText(description);
      await expect(image).toHaveAttribute('alt', name);
      await expect(image).toHaveAttribute('src', imageUrl);
      await expect(image).toBeVisible();
    }
  });

  test('cart is initially empty', async ({ page }) => {
    await expect(page.locator('#cart-items')).toContainText('Your cart is empty');
    await expect(page.locator('#total-items')).toHaveText('0');
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeDisabled();
  });

  test('increment quantity increases item count', async ({ page }) => {
    const pizzaName = menuItems[0].name;
    await addPizza(page, pizzaName);

    await expect(quantityDisplay(page, pizzaName)).toHaveText('1');
    await expect(cartItem(page, pizzaName)).toContainText('Quantity: 1');
    await expect(page.locator('#total-items')).toHaveText('1');
  });

  test('decrement at zero keeps quantity at zero', async ({ page }) => {
    const pizzaName = menuItems[0].name;
    await removePizza(page, pizzaName);

    await expect(quantityDisplay(page, pizzaName)).toHaveText('0');
    await expect(page.locator('#cart-items')).toContainText('Your cart is empty');
    await expect(page.locator('#total-items')).toHaveText('0');
  });

  test('increment then decrement returns quantity to zero', async ({ page }) => {
    const pizzaName = menuItems[0].name;
    await addPizza(page, pizzaName);
    await removePizza(page, pizzaName);

    await expect(quantityDisplay(page, pizzaName)).toHaveText('0');
    await expect(page.locator('#cart-items')).toContainText('Your cart is empty');
    await expect(page.locator('#total-items')).toHaveText('0');
  });

  test('cart reflects quantities across multiple pizza types', async ({ page }) => {
    const firstPizzaName = menuItems[0].name;
    const secondPizzaName = menuItems[1].name;
    await addPizza(page, firstPizzaName, 2);
    await addPizza(page, secondPizzaName);

    await expect(quantityDisplay(page, firstPizzaName)).toHaveText('2');
    await expect(quantityDisplay(page, secondPizzaName)).toHaveText('1');
    await expect(cartItem(page, firstPizzaName)).toContainText('Quantity: 2');
    await expect(cartItem(page, secondPizzaName)).toContainText('Quantity: 1');
    await expect(page.locator('#total-items')).toHaveText('3');
  });
});
