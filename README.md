# Awesome Pizza — Playwright E2E Tests

End-to-end test suite for **Awesome Pizza**, a single-page pizza ordering app, built with [Playwright](https://playwright.dev/) and TypeScript.

## Features Under Test

- **Menu** — browsing pizzas and adjusting item quantities with `+`/`-` controls
- **Cart & Order Placement** — customer name entry, cart totals, and placing an order
- **Order Lookup** — searching for a previously placed order by ID
- **Theme** — dark mode toggle and persistence

## Tech Stack

- [Playwright Test](https://playwright.dev/) with TypeScript
- Page Object Model (`tests/menu.page.ts`) for reusable page interactions
- Network mocking/interception via `page.route()` for deterministic API responses

## Project Structure

```text
tests/
  menu.page.ts          # Page Object Model for the menu/cart UI
  menu.spec.ts           # Menu browsing and cart quantity tests
  menu.pom.spec.ts        # Menu tests using the Page Object Model
  order-lookup.spec.ts    # Order lookup by ID (valid, invalid, empty, round-trip)
  theme.spec.ts           # Dark mode toggle and persistence
playwright.config.ts       # Playwright configuration (browsers, base URL, reporting)
E2E_TESTING_STRATEGY.md    # Test planning notes and coverage priorities
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- The Awesome Pizza app running locally at `http://localhost:3000` (see `playwright.config.ts` for `baseURL`)

### Install

```bash
npm install
npx playwright install
```

### Run the tests

```bash
# Run all tests headless
npm run test:e2e

# Run all tests in a headed browser
npm run test:e2e:headed
```

Tests run across Chromium, Firefox, and WebKit by default. An HTML report is generated after each run:

```bash
npx playwright show-report
```

## Test Strategy

See [E2E_TESTING_STRATEGY.md](./E2E_TESTING_STRATEGY.md) for the full breakdown of test suites, coverage priorities, and planned scenarios.
