/* Stage 23 — guest home and empty results (v2.7.61): the original home section stays (the two-card home was
   removed on 4 Nov), Corporates link in the desktop header, phone bottom nav, lastSection (new context / new tab),
   corporate browsing without login, empty-results fallback and Post a request. All as a guest, against the real API. */
const L = require("./lib");
const F = require("./fleet-helpers");
const { OID } = F;
const ANY_HARARE = /Harare/i;

(async () => {
  const st = L.loadState();
  const RUN = st.RUN || "run";
  const d = await L.db();
  const actors = [];
  const A = async (name, opts) => { const a = await L.actor(name, opts); actors.push(a); return a; };
  const visible = (a, id) => a.page.locator(`[data-testid="${id}"]`);
  const HOME = ".landing-hero h1";
  const SWITCH = ".landing-nav__module button";
  try {
    L.sec("23a. Guest home: original section, no two-card home (desktop)");
    const g = await A("guest");
    await L.goto(g, "/", HOME);
    L.check(/Find trusted pros\s*for any job, anywhere\./.test((await g.page.locator(HOME).innerText()).replace(/\n/g, " ")), "original heading", await g.page.locator(HOME).innerText());
    L.check(await g.page.locator(".landing-hero .landing-search, .landing-hero input").first().isVisible(), "search box in the home section");
    L.check((await g.page.locator(".landing-tags .landing-tag").count()) > 0, "Popular tags");
    for (const id of ["home-heading", "home-choice", "home-card-services", "home-card-logistics", "home-chip", "home-location", "explore-services", "explore-logistics", "home-corporates"]) {
      L.check((await visible(g, id).count()) === 0, `removed section stays gone: ${id}`);
    }
    L.check((await g.page.locator('[data-testid="guest-bottom-nav"]').isVisible().catch(() => false)) === false, "no bottom nav on desktop");
    L.check((await g.page.evaluate(() => localStorage.getItem("lastSection"))) === null, "no lastSection for a new visitor");
    await L.shot(g, "s23-home-desktop");

    L.sec("23a2. Corporates link in the desktop header, every desktop width");
    for (const width of [981, 1024, 1100, 1101, 1180, 1280, 1281, 1366, 1600]) {
      await g.page.setViewportSize({ width, height: 800 });
      await g.page.waitForTimeout(250);
      const box = await visible(g, "nav-corporates").boundingBox();
      L.check(!!box && await visible(g, "nav-corporates").isVisible(), `${width} px: Corporates link visible`, box);
      const m = await g.page.evaluate(() => {
        const inner = document.querySelector(".landing-nav__inner");
        const line = (el) => Math.round(el.getBoundingClientRect().height);
        const shown = [...document.querySelectorAll(".landing-nav__links a")].filter((a) => a.offsetParent);
        const lastKid = [...inner.children].filter((c) => c.offsetParent).pop();
        return {
          overflow: inner.scrollWidth > inner.clientWidth + 1 || lastKid.getBoundingClientRect().right > window.innerWidth,
          sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
          heights: shown.map(line),
          labels: shown.map((a) => a.textContent),
          navH: line(document.getElementById("landingNav")),
        };
      });
      L.check(!m.overflow && !m.sideways, `${width} px: header fits, no sideways scroll`, m);
      L.check(m.heights.every((h) => h === m.heights[0]) && m.navH <= 90, `${width} px: links stay on one row`, m);
    }
    await g.page.setViewportSize({ width: 1024, height: 800 });
    await L.shot(g, "s23-header-1024");
    await g.page.setViewportSize({ width: 1366, height: 800 });
    await L.shot(g, "s23-header-1366");
    await visible(g, "nav-corporates").click();
    await g.page.waitForURL(/\/corporate-list/, { timeout: 15000 });
    L.check(/\/corporate-list/.test(g.page.url()) && !/login/.test(g.page.url()), "Corporates opens /corporate-list without login", g.page.url());

    L.sec("23b. Use my location on the logistics search; the header switch is the section choice");
    const g2 = await A("guest-gps");
    const g2searches = [];
    g2.page.on("request", (q) => { if (/\/logistics\/assets\/search/.test(q.url())) g2searches.push(q.url()); });
    await L.goto(g2, "/logistics/search", '[data-testid="use-my-location"]');
    await g2.page.locator('[data-testid="use-my-location"]:visible').first().click();
    await g2.page.waitForTimeout(1500);
    await g2.page.locator('.log-search-filters [type="submit"]:visible').first().click();
    await g2.page.waitForTimeout(2000);
    L.check(g2searches.some((x) => /company_lat=-17\.8/.test(x)), "GPS coordinates reach the search", g2searches.slice(-3));
    const g3 = await A("guest-services");
    // Home and /logistics carry the switch in the hero (search mode only); the header
    // switch shows on the other guest pages, e.g. Corporates
    await L.goto(g3, "/corporate-list", SWITCH);
    await g3.page.locator(SWITCH).filter({ hasText: "Services" }).click();
    await g3.page.waitForTimeout(400);
    L.check((await g3.page.evaluate(() => localStorage.getItem("lastSection"))) === "services", "switch to Services: lastSection=services");
    await L.goto(g3, "/corporate-list", SWITCH);
    await g3.page.locator(SWITCH).filter({ hasText: "Logistics" }).click();
    await g3.page.waitForURL(/\/logistics/, { timeout: 15000 });
    L.check((await g3.page.evaluate(() => localStorage.getItem("lastSection"))) === "logistics", "switch to Logistics: lastSection=logistics");

    L.sec("23c. lastSection: only an explicit choice, only a new tab's first page, logo reaches home");
    // Browsing without choosing doesn't set it
    const g4 = await A("guest-browse");
    await L.goto(g4, "/logistics");
    await g4.page.waitForTimeout(800);
    L.check((await g4.page.evaluate(() => localStorage.getItem("lastSection"))) === null, "just opening /logistics doesn't save a section");
    const tab0 = await g4.ctx.newPage();
    await tab0.goto(`${L.WEB}/`, { waitUntil: "domcontentloaded" });
    await tab0.waitForSelector(HOME, { timeout: 15000 });
    L.check(new URL(tab0.url()).pathname === "/", "new tab without a choice: home", tab0.url());
    await tab0.close();
    // After a choice, a new tab goes back there
    const ctx = g3.ctx;
    await g3.page.evaluate(() => localStorage.setItem("lastSection", "logistics"));
    const tab = await ctx.newPage();
    await tab.goto(`${L.WEB}/`, { waitUntil: "domcontentloaded" });
    await tab.waitForURL(/\/logistics/, { timeout: 15000 }).catch(() => {});
    L.check(/\/logistics/.test(tab.url()), "new tab, section chosen: lands on Logistics", tab.url());
    // The logo still reaches home in that tab
    await tab.waitForLoadState("networkidle").catch(() => {});
    const logo = tab.locator('a[href="/"]').first();
    if (await logo.count()) {
      await logo.click();
      await tab.waitForSelector(HOME, { timeout: 10000 }).catch(() => {});
      L.check(new URL(tab.url()).pathname === "/" && await tab.locator(HOME).count(), "logo reaches home", tab.url());
    } else L.check(false, "logo link found on the logistics page");
    // Reload of / in the same tab: not the tab's first page
    await tab.goto(`${L.WEB}/`, { waitUntil: "domcontentloaded" });
    await tab.waitForSelector(HOME, { timeout: 10000 }).catch(() => {});
    L.check(new URL(tab.url()).pathname === "/", "same tab again: stays on home", tab.url());
    await tab.close();
    // v2.7.66: Services returns home, where the Services/Logistics choice is
    await g3.page.evaluate(() => localStorage.setItem("lastSection", "services"));
    const tabS = await ctx.newPage();
    await tabS.goto(`${L.WEB}/`, { waitUntil: "domcontentloaded" });
    await tabS.waitForTimeout(1500);
    L.check(new URL(tabS.url()).pathname === "/", "new tab, Services chosen: stays on home (no redirect to /services)", tabS.url());
    await tabS.close();
    // A deep link in a new tab isn't redirected
    const tab2 = await ctx.newPage();
    await tab2.goto(`${L.WEB}/services`, { waitUntil: "domcontentloaded" });
    await tab2.waitForTimeout(800);
    L.check(/\/services/.test(tab2.url()), "a deep link keeps its page", tab2.url());
    await tab2.close();
    // Logged-in customer gets it; owner doesn't
    const cust = await L.makeCustomer(`cust.s23.${RUN}`);
    const lc = await A("customer");
    await L.seedAuth(lc, { token: cust.token, user: cust });
    await lc.page.evaluate(() => localStorage.setItem("lastSection", "logistics"));
    const lcTab = await lc.ctx.newPage();
    await lcTab.goto(`${L.WEB}/`, { waitUntil: "domcontentloaded" });
    await lcTab.waitForURL(/\/logistics/, { timeout: 15000 }).catch(() => {});
    L.check(/\/logistics/.test(lcTab.url()), "customer in a new tab: last section too", lcTab.url());
    await lcTab.close();

    L.sec("23d. Phone: bottom nav, no sideways scroll");
    const m = await A("guest-phone", { mobile: true });
    await L.goto(m, "/", HOME);
    L.check(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll at 390 px");
    await m.page.waitForSelector('[data-testid="guest-bottom-nav"]', { timeout: 8000 });
    for (const k of ["services", "logistics", "post", "account"]) L.check(await visible(m, `bottom-nav-${k}`).isVisible(), `bottom nav: ${k}`);
    const navBox = await visible(m, "guest-bottom-nav").boundingBox();
    L.check(Math.abs(navBox.y + navBox.height - 844) < 3, "nav fixed at the bottom", navBox);
    await L.shot(m, "s23-home-phone");
    await visible(m, "bottom-nav-logistics").click();
    await m.page.waitForURL(/\/logistics/, { timeout: 15000 });
    L.check((await m.page.evaluate(() => localStorage.getItem("lastSection"))) === "logistics", "nav Logistics: saved as a choice");
    await m.page.waitForSelector('[data-testid="bottom-nav-logistics"].is-active', { timeout: 8000 }).catch(() => {});
    L.check(await m.page.locator('[data-testid="bottom-nav-logistics"].is-active').count(), "Logistics marked active");
    await visible(m, "bottom-nav-post").click();
    await m.page.waitForURL(/\/logistics\/post/, { timeout: 15000 }).catch(() => {});
    L.check(/\/logistics\/post/.test(m.page.url()), "Post on Logistics as a guest → the job form", m.page.url());
    await L.goto(m, "/services");
    await m.page.waitForSelector('[data-testid="bottom-nav-post"]', { timeout: 8000 });
    await visible(m, "bottom-nav-post").click();
    await m.page.waitForURL(/\/post-task|\/login/, { timeout: 15000 });
    L.check(/post-task|login/.test(m.page.url()), "Post on Services → /post-task", m.page.url());
    await L.goto(m, "/");
    await m.page.waitForSelector('[data-testid="bottom-nav-account"]', { timeout: 8000 });
    await visible(m, "bottom-nav-account").click();
    await m.page.waitForURL(/\/login/, { timeout: 15000 });
    L.check(/\/login/.test(m.page.url()), "Account → login", m.page.url());
    await L.seedAuth(m, { token: cust.token, user: cust });
    await L.goto(m, "/");
    await m.page.waitForTimeout(1000);
    L.check((await m.page.locator('[data-testid="guest-bottom-nav"]').count()) === 0, "signed in: no guest nav");
    // Tablet width
    const t768 = await A("guest-tablet", { viewport: { width: 768, height: 1024 } });
    await L.goto(t768, "/", HOME);
    L.check(await t768.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll at 768 px");
    const t320 = await A("guest-320", { viewport: { width: 320, height: 640 } });
    await L.goto(t320, "/", HOME);
    L.check(await t320.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll at 320 px");

    L.sec("23e. Top providers: Harare first, then other cities");
    const g5 = await A("guest-top");
    await L.goto(g5, "/services");
    await L.goto(g5, "/");
    await g5.page.waitForTimeout(2500);
    let groups = await g5.page.locator('[data-testid="top-providers-city"]').evaluateAll((els) => els.map((e) => e.dataset.city));
    if (!groups.length) {
      await g5.page.locator(".landing-prov-city, .landing-prov-grid").first().scrollIntoViewIfNeeded().catch(() => {});
      await g5.page.waitForTimeout(2000);
      groups = await g5.page.locator('[data-testid="top-providers-city"]').evaluateAll((els) => els.map((e) => e.dataset.city));
    }
    const providersExist = await d.collection("services").countDocuments({}).catch(() => 0);
    const emptyProv = await g5.page.locator('[data-testid="empty-results"]').count();
    L.check(groups.length > 0 ? ANY_HARARE.test(groups[0]) : emptyProv > 0 || !providersExist, "city groups start with Harare (or the widening fallback when no city has providers)", { groups, emptyProv, providersExist });
    await L.shot(g5, "s23-top-providers");

    L.sec("23f. Corporate pages without login; contact details stripped");
    const corp = await L.makeCustomer(`corp.s23.${RUN}`, 3);
    await d.collection("users").updateOne({ _id: OID(corp._id) }, { $set: { full_name: `Corporate Co ${RUN}`, company_name: `Corporate Co ${RUN}`, location: { type: "Point", coordinates: [31.05, -17.83] }, address: "Harare" } });
    const prodName = `Cement pallet ${RUN}`;
    await d.collection("products").deleteMany({ name: prodName });
    const prod = await d.collection("products").insertOne({ name: prodName, description: "E2E product", user_id: OID(corp._id), price: 50, images: [], status: "active", createdAt: new Date(), updatedAt: new Date() });
    const g6 = await A("guest-corporate");
    const respBodies = [];
    const profileCalls = [];
    g6.page.on("request", (q) => { if (/getProfile/i.test(q.url())) profileCalls.push(q.url()); });
    g6.page.on("response", async (x) => {
      if (/\/api\/.*(corporate|product)/i.test(x.url())) { try { respBodies.push({ url: x.url(), text: await x.text(), status: x.status() }); } catch {} }
    });
    for (const [route, label] of [["/corporate-list", "corporate list"], [`/get-corporate/${corp._id}`, "corporate page"], [`/product-detail/${prod.insertedId}`, "product page"], [`/product-details/${prod.insertedId}`, "product details"]]) {
      await L.goto(g6, route);
      await g6.page.waitForTimeout(1500);
      L.check(!/\/login/.test(g6.page.url()), `${label}: opens without login`, g6.page.url());
    }
    await L.goto(g6, `/product-detail/${prod.insertedId}`);
    await g6.page.waitForTimeout(2000);
    L.check((await L.bodyText(g6)).includes(prodName), "product shown to the guest", (await L.bodyText(g6)).slice(0, 200));
    await L.shot(g6, "s23-product-guest");
    const leak = respBodies.filter((x) => new RegExp(`"(email|phone_number)"\\s*:\\s*"[^"]`).test(x.text));
    L.check(leak.length === 0, "guest responses carry no email or phone", leak.map((x) => x.url.slice(0, 100)));
    L.check(profileCalls.length === 0, "no getProfile call for a guest", profileCalls.slice(0, 3));
    const server5 = respBodies.filter((x) => x.status >= 500);
    L.check(server5.length === 0, "no server errors on corporate pages", server5.map((x) => x.url));
    const chat = g6.page.getByText("Direct Chat").first();
    if (await chat.count()) {
      await chat.click();
      await g6.page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
      L.check(/\/login/.test(g6.page.url()) || /log ?in/i.test(await L.bodyText(g6)), "Chat asks for login", g6.page.url());
    } else L.check(false, "Direct Chat button on the product page", (await L.bodyText(g6)).slice(0, 200));
    await L.goto(g6, "/near-by-corporate");
    await g6.page.waitForTimeout(6000);
    const spin = await g6.page.locator(".spinner-border, .loader, .loading").count();
    L.check(spin === 0, "near-by corporate: no endless loader", spin);
    await L.goto(g6, `/corporate-category-detail/000000000000000000000000`);
    await g6.page.waitForTimeout(3000);
    L.check(await g6.page.locator('[data-testid="empty-results"]').count() || !/\/login/.test(g6.page.url()), "corporate category opens and widens when empty", g6.page.url());

    L.sec("23g. Empty results widen the search; Post a request");
    const g7 = await A("guest-empty");
    const noSuch = `zzznothing${RUN}`;
    await L.goto(g7, `/logistics/search?q=${noSuch}`);
    await g7.page.waitForSelector('[data-testid="empty-results"]', { timeout: 20000 });
    await g7.page.waitForFunction(() => document.querySelector('[data-testid="empty-results"]')?.dataset.state !== "loading", null, { timeout: 25000 });
    let state = await visible(g7, "empty-results").getAttribute("data-state");
    L.check(state === "fallback" || state === "none", "logistics search: settles (never stuck on loading)", state);
    L.check(!/No data found/i.test(await L.bodyText(g7)), "no 'No data found' dead end");
    if (state === "fallback") {
      L.check(await visible(g7, "empty-results-heading").count(), "heading says how far it widened", await visible(g7, "empty-results-heading").innerText().catch(() => ""));
      const cards = visible(g7, "empty-results-card");
      L.check((await cards.count()) >= 1, "fallback cards");
      const href = await cards.first().getAttribute("href");
      L.check(/^\/logistics\/asset\/[a-f0-9]{24}$/.test(href), "card links to a real unit (asset_id)", href);
      await cards.first().click();
      await g7.page.waitForURL(/\/logistics\/asset\//, { timeout: 10000 });
      await g7.page.waitForLoadState("networkidle").catch(() => {});
      L.check(!/not found/i.test((await L.bodyText(g7)).slice(0, 400)), "and the unit page opens");
      await L.goto(g7, `/logistics/search?q=${noSuch}`);
      await g7.page.waitForSelector('[data-testid="post-request"]', { timeout: 20000 });
    }
    L.check(await visible(g7, "post-request").isVisible(), "Post a request button");
    const clr = await visible(g7, "post-request").evaluate((el) => { const c = getComputedStyle(el); return { color: c.color, bg: c.backgroundColor }; });
    L.check(/255, 255, 255/.test(clr.color), "button text is white on the green (readable)", clr);
    L.check((await visible(g7, "post-request").getAttribute("href")) === "/logistics/post", "Logistics: Post a request → the job form (guests sign in when they post)");
    await L.shot(g7, "s23-empty-logistics");
    await L.goto(g7, `/search-providers?search=${noSuch}`);
    await g7.page.waitForSelector('[data-testid="empty-results"]', { timeout: 20000 }).catch(() => {});
    await g7.page.waitForFunction(() => document.querySelector('[data-testid="empty-results"]')?.dataset.state !== "loading", null, { timeout: 25000 }).catch(() => {});
    state = await visible(g7, "empty-results").getAttribute("data-state").catch(() => null);
    L.check(state === "fallback" || state === "none", "services search: settles", state);
    L.check((await visible(g7, "post-request").getAttribute("href").catch(() => "")) === "/post-task", "Services: Post a request → /post-task");
    await visible(g7, "post-request").click();
    await g7.page.waitForURL(/\/post-task|\/login/, { timeout: 10000 });
    L.check(/post-task|login/.test(g7.page.url()), "button goes on", g7.page.url());
    // Placeholders on Search.js unchanged (existing stages rely on them)
    await L.goto(g7, "/logistics/search");
    L.check(await g7.page.locator('input[placeholder="Truck, tractor, unit or company name"]').count(), "search placeholder unchanged");
    // A guest can open the job form (the rest of this flow is in s24)
    await L.goto(g7, "/logistics/post", "form.log-form-card--post");
    L.check(/\/logistics\/post/.test(g7.page.url()), "/logistics/post opens for a guest", g7.page.url());

    await d.collection("products").deleteOne({ _id: prod.insertedId });
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s23-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
