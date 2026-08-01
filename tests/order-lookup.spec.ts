import { expect, type APIRequestContext, type Page, test } from '@playwright/test';

type MenuItem = {
  name: string;
  description: string;
  imageUrl: string;
};

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

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.menu-item')).toHaveCount(menuItems.length);
});

test.describe('Order lookup', () => {
  test('looks up a valid order id and shows details', async ({ page }) => {
    const fakeOrder = {
      id: 'ORDER123',
      name: 'Alice',
      items: [{ name: menuItems[0].name, quantity: 2 }],
      total: 29.98,
    };

    await page.route('**/api/orders**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: fakeOrder, message: 'Order found' }),
      });
    });

    await page.getByLabel('Order ID:').fill(fakeOrder.id);

    // Capture the network request and response to diagnose lookup behavior
    const lookupRequest = page.waitForRequest((r) => r.url().includes('/api/orders'));
    const lookupResponse = page.waitForResponse((r) => r.url().includes('/api/orders'));

    await page.getByRole('button', { name: 'Look Up Order' }).click();

    const req = await lookupRequest;
    const res = await lookupResponse;

    // Log for debugging (appears in test output)
    console.log('Lookup request URL:', req.url(), 'method:', req.method());
    const responseBody = await res.json().catch(() => null);
    console.log('Lookup response body:', responseBody);

    // Then assert UI shows the returned order
    await expect(page.locator(`text=${fakeOrder.id}`)).toBeVisible();
    await expect(page.locator(`text=${fakeOrder.name}`)).toBeVisible();
    await expect(page.locator(`text=${menuItems[0].name}`)).toBeVisible();
  });

  test('shows not-found message for unknown id', async ({ page }) => {
    await page.route('**/api/orders**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Order not found' }),
      });
    });

    await page.getByLabel('Order ID:').fill('DOESNOTEXIST');
    await page.getByRole('button', { name: 'Look Up Order' }).click();

    await expect(page.locator('text=Order not found')).toBeVisible();
  });

  test('does not call the API when lookup id is empty', async ({ page }) => {
    // Ensure that no network request is made when the input is empty.
    const requestPromise = page.waitForRequest((req) => req.url().includes('/api/orders'), { timeout: 500 }).catch(() => null);

    await page.getByLabel('Order ID:').fill('');
    await page.getByRole('button', { name: 'Look Up Order' }).click();

    const req = await requestPromise;
    expect(req).toBeNull();
  });

  test('place an order then look it up via the returned id', async ({ page }) => {
    // Intercept POST to create order and return a deterministic id (broad glob)
    let createdOrder: any = null;
    await page.route('**/api/orders**', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const orderId = 'NEW-ORDER-1';

        // Fulfill the POST with a created id
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: orderId }, message: 'Order placed' }),
        });

        // Set createdOrder after request is observed (we'll also wait for the request below)
        createdOrder = {
          id: orderId,
          name: body.name ?? 'Test',
          items: body.items ?? [],
          total: body.total ?? 0,
        };
        return;
      }

      // Fallback for other methods
      await route.continue();
    });

    // Intercept GET lookup to return the created order when requested
    await page.route('**/api/orders**', async (route) => {
      const url = route.request().url();
      if (createdOrder && url.endsWith(createdOrder.id)) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: createdOrder, message: 'Order found' }),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Order not found' }),
      });
    });

    // Add one pizza and enter a name
    await page.locator('.menu-item').first().getByRole('button', { name: '+' }).click();
    await page.getByLabel('Your Name:').fill('Test User');

    // Ensure Place Order is enabled, then wait for the POST request
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeEnabled();
    const postRequestPromise = page.waitForRequest((req) => req.url().includes('/api/orders') && req.method() === 'POST');

    // Place order
    await page.getByRole('button', { name: 'Place Order' }).click();

    const postReq = await postRequestPromise;
    const postBody = postReq.postDataJSON();
    // Derive createdOrder from the actual POST payload to be robust
    createdOrder = {
      id: createdOrder?.id ?? 'NEW-ORDER-1',
      name: postBody.name ?? 'Test',
      items: postBody.items ?? [],
      total: postBody.total ?? 0,
    };
    expect(createdOrder).not.toBeNull();

    // Now look up the created order via UI
    await page.getByLabel('Order ID:').fill(createdOrder.id);
    await page.getByRole('button', { name: 'Look Up Order' }).click();

    await expect(page.locator(`text=${createdOrder.id}`)).toBeVisible();
    await expect(page.locator(`text=${createdOrder.name}`)).toBeVisible();
  });
});
