/* Stage 19 — auth buttons never keep spinning (27 Oct 2026):
 * Google / Apple popup closed by the user → button back to normal;
 * browser "Allow notifications" prompt left unanswered → email login still finishes. */
const L = require("./lib");

const LABELS = {
  "/login": ["Continue with Google", "Continue with Apple"],
  "/sign-up": ["Sign up with Google", "Sign up with Apple"],
};

// Label back on the button (not the spinner) and clickable again
async function buttonIdle(page, label, timeout) {
  return page
    .locator("button", { hasText: label })
    .first()
    .waitFor({ state: "visible", timeout })
    .then(async () => !(await page.locator("button", { hasText: label }).first().isDisabled()))
    .catch(() => false);
}

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const a = await L.actor("auth-ui");
  const p = a.page;
  try {
    for (const [path, labels] of Object.entries(LABELS)) {
      for (const label of labels) {
        L.sec(`19. ${path}: "${label}" popup closed by the user`);
        await L.goto(a, path, "form");
        const btn = p.locator("button", { hasText: label }).first();
        if (!(await btn.count())) {
          L.check(true, `${label} hidden by feature flag — nothing to test`);
          continue;
        }
        const popupP = a.ctx.waitForEvent("page", { timeout: 15000 }).catch(() => null);
        await btn.click();
        const popup = await popupP;
        L.check(!!popup, "sign-in popup opened");
        L.check(!(await p.locator("button", { hasText: label }).count()), "button shows the loader while the popup is open");
        if (popup) {
          await popup.waitForLoadState("domcontentloaded").catch(() => {});
          await popup.close();
        }
        await p.bringToFront();
        await p.evaluate(() => window.dispatchEvent(new Event("focus")));
        const t0 = Date.now();
        const idle = await buttonIdle(p, label, 6000);
        L.check(idle, `button back to "${label}" after the popup is closed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
        const toast = (await L.bodyText(a)).match(/sign-in failed|popup/i)?.[0];
        L.check(!toast, "no error toast for a cancelled popup", toast);
        // Retry works: a second click opens the popup again
        const again = a.ctx.waitForEvent("page", { timeout: 15000 }).catch(() => null);
        await p.locator("button", { hasText: label }).first().click();
        const popup2 = await again;
        L.check(!!popup2, "second click opens the popup again");
        if (popup2) await popup2.close();
        await p.bringToFront();
        await p.evaluate(() => window.dispatchEvent(new Event("focus")));
        L.check(await buttonIdle(p, label, 6000), "and stops loading again when closed");
      }
    }

    L.sec("19b. Email login with the notification prompt left unanswered");
    const cust = await L.makeCustomer(`auth.spin.${RUN}`);
    const n = await L.actor("auth-noprompt");
    // Prompt that never gets an answer (the real browser prompt, ignored)
    await n.ctx.addInitScript(() => {
      try {
        Object.defineProperty(Notification, "permission", { get: () => "default" });
        Notification.requestPermission = () => new Promise(() => {});
      } catch {}
    });
    await L.goto(n, "/login", "form");
    await n.page.fill('input[placeholder="Enter your email"]', cust.email);
    await n.page.fill('input[placeholder="Enter your password"]', "Passw0rd!");
    const t0 = Date.now();
    await n.page.locator('form button[type="submit"]').first().click();
    const left = await n.page
      .waitForURL((u) => !/\/login/.test(String(u)), { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    L.check(left, `login finishes while the prompt is ignored (${((Date.now() - t0) / 1000).toFixed(1)} s)`, n.page.url());
    L.check(Date.now() - t0 < 12000, "no long wait (prompt times out after 4 s)");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    await L.shot(a, "s19-crash");
  }
  L.check(a.errors.length === 0, "auth-ui: no page/console errors", a.errors.slice(0, 5));
  await L.done();
})();
