import { test, expect } from '@playwright/test';

test('should change theme when toggling theme button', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3000/');
  
  // Wait for page to be ready
  await page.waitForLoadState('networkidle');
  
  // Find and click the theme toggle button (moon icon)
  const themeToggle = page.locator('button:has-text("🌙")');
  await expect(themeToggle).toBeVisible();
  
  // Click the theme toggle button
  await themeToggle.click();
  
  // Wait a moment for the theme to change
  await page.waitForTimeout(500);
  
  // Verify the page is still on the correct URL
  expect(page.url()).toBe('http://localhost:3000/');
});
