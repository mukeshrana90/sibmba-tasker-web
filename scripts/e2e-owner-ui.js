/**
 * E2E: owner logistics pages — no title/breadcrumb banner; list tables share chrome.
 *
 * Env:
 *   OWNER_E2E_BASE   default http://127.0.0.1:3000 (or https://127.0.0.1:3001)
 *   OWNER_E2E_TOKEN  JWT (required unless OWNER_E2E_MINT=1 with backend .env)
 *   OWNER_E2E_USER_ID default logistic owner id
 *
 * Run: node scripts/e2e-owner-ui.js
 */
const path = require("path");
const fs = require("fs");

async function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    try {
      return require(path.join(
        __dirname,
        "..",
        "node_modules",
        "playwright"
      ));
    } catch {
      /* try npx-resolved */
    }
  }
  throw new Error(
    "playwright is required. Install with: npm i -D playwright && npx playwright install chromium"
  );
}

function mintTokenIfRequested() {
  if (process.env.OWNER_E2E_TOKEN) return process.env.OWNER_E2E_TOKEN;
  if (process.env.OWNER_E2E_MINT !== "1") return null;
  const backendEnv = path.join(
    __dirname,
    "..",
    "..",
    "sibmba-tasker-backend",
    ".env"
  );
  if (!fs.existsSync(backendEnv)) {
    throw new Error("OWNER_E2E_MINT=1 but backend .env not found");
  }
  require("dotenv").config({ path: backendEnv });
  const JWT = require("jsonwebtoken");
  const userId =
    process.env.OWNER_E2E_USER_ID || "6a9fef58d481429e7f85fbb2";
  return JWT.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

const BASE = process.env.OWNER_E2E_BASE || "http://127.0.0.1:3000";
const USER_ID =
  process.env.OWNER_E2E_USER_ID || "6a9fef58d481429e7f85fbb2";

const OWNER_ROUTES = [
  { path: "/logistics/owner", expectTable: false },
  { path: "/logistics/owner/equipment", expectTable: true, expectToolbar: true },
  { path: "/logistics/owner/fleet", expectTable: true, expectToolbar: true },
  { path: "/logistics/owner/quotes", expectTable: true, expectToolbar: true },
  { path: "/logistics/owner/earnings", expectTable: true, expectToolbar: true },
  { path: "/logistics/owner/analytics", expectTable: true },
  { path: "/logistics/owner/jobs", expectTable: true, expectToolbar: true },
  {
    path: "/logistics/owner/opportunities",
    expectTable: true,
    expectToolbar: true,
  },
  { path: "/logistics/owner/operators", expectTable: true, expectToolbar: true },
  { path: "/logistics/owner/availability", expectTable: false },
];

async function seedOwnerAuth(page, token) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate(
    ({ token: t, userId }) => {
      localStorage.setItem("token", t);
      localStorage.setItem("userId", userId);
      localStorage.setItem("role", "4");
      localStorage.setItem("activeModule", "logistics");
    },
    { token, userId: USER_ID }
  );
}

async function run() {
  const token = mintTokenIfRequested();
  if (!token) {
    throw new Error("OWNER_E2E_TOKEN or OWNER_E2E_MINT=1 is required");
  }

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const failures = [];

  try {
    await seedOwnerAuth(page, token);

    for (const route of OWNER_ROUTES) {
      await page.goto(`${BASE}${route.path}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.waitForSelector(".p-logistics-hub, .p-logistics-supply", {
        timeout: 20000,
      });

      const bannerCount = await page.locator("section.corp-banner").count();
      if (bannerCount > 0) {
        failures.push(`${route.path}: corp-banner still visible`);
      }

      const crumbOwner = await page
        .locator(".crumbs")
        .filter({ hasText: "Owner" })
        .count();
      if (crumbOwner > 0) {
        failures.push(`${route.path}: breadcrumb crumbs still visible`);
      }

      const supply = await page.locator(".p-logistics-supply").count();
      if (supply < 1) {
        failures.push(`${route.path}: missing p-logistics-supply`);
      }

      if (route.expectTable) {
        const wraps = await page.locator(".log-jobs-table-wrap").count();
        const tables = await page.locator("table.log-jobs-table").count();
        // Empty states may omit the table; allow either wrap+table or empty copy
        const empty = await page.locator(".logistics-empty, .log-fleet-empty").count();
        if (wraps === 0 && tables === 0 && empty === 0) {
          // still loading?
          await page.waitForTimeout(1500);
        }
        const wraps2 = await page.locator(".log-jobs-table-wrap").count();
        const tables2 = await page.locator("table.log-jobs-table").count();
        const empty2 = await page
          .locator(".logistics-empty, .log-fleet-empty, .log-form-card")
          .count();
        if (wraps2 === 0 && tables2 === 0 && empty2 === 0) {
          failures.push(
            `${route.path}: expected log-jobs-table chrome or empty state`
          );
        }
      }

      if (route.expectToolbar) {
        const toolbar = await page.locator(".log-jobs-toolbar").count();
        if (toolbar < 1) {
          failures.push(`${route.path}: missing log-jobs-toolbar`);
        }
      }

      console.log(
        `OK ${route.path} banner=${bannerCount} supply=${supply}`
      );
    }

    if (failures.length) {
      console.error("FAILURES:\n" + failures.join("\n"));
      process.exitCode = 1;
    } else {
      console.log(`All ${OWNER_ROUTES.length} owner routes passed.`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
