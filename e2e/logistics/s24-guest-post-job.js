/* Stage 24 — visitor hero switch and guest Post a job: Services | Logistics cards on the visitor hero; in Logistics
   a guest fills in the job, signs in, and the job comes back ready to post. Owners and operators can't send it. */
const L = require("./lib");
const F = require("./fleet-helpers");
const CAST = require("./cast");

const SWITCH = '[data-testid="market-switch"]';
const SERVICES = '[data-testid="market-services"]';
const LOGISTICS = '[data-testid="market-logistics"]';
const FORM = "form.log-form-card--post";
const SUBMIT = `${FORM} button[type="submit"]`;
const PHOTO = "input[type=file]";

async function loginUi(a, email, password = "Passw0rd!") {
  await a.page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await a.page.fill('input[name="email"]', email);
  await a.page.fill('input[name="password"]', password);
  await a.page.locator('button[type="submit"]', { hasText: "Log in" }).click();
}

/** Fill the whole form as a guest and press Post. Ends on the login page. */
async function guestFillsJob(a, goods) {
  await L.goto(a, "/logistics", SWITCH);
  await a.page.locator(".landing-nav__post-task:visible").first().click();
  await a.page.waitForSelector(FORM, { timeout: 15000 });
  await L.pickLocation(a, 0);
  await L.pickLocation(a, 1, CAST.PLACES.drops[0]);
  await L.fillGoods(a.page, goods);
  await a.page.fill('input[placeholder="8"]', "1");
  await a.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
  const dateInput = a.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first();
  await L.pickDate(a.page, dateInput, 1, 15);
  await L.typeMoney(a.page, 'input[aria-label="Price"]', "275");
  const [photo] = await L.photoFixtures("truck");
  await a.page.locator(`${FORM} ${PHOTO}`).first().setInputFiles(photo);
  await a.page.locator(SUBMIT).click();
  await a.page.waitForURL(/\/login/, { timeout: 15000 });
}

const draftInTab = (a) => a.page.evaluate(() => Boolean(sessionStorage.getItem("logisticsJobDraft")));

(async () => {
  const st = L.loadState();
  const RUN = st.RUN || "run";
  const C = L.cast(RUN);
  const d = await L.db();
  const actors = [];
  const A = async (name, opts) => { const a = await L.actor(name, opts); actors.push(a); return a; };
  const pressed = (a, sel) => a.page.locator(sel).getAttribute("aria-pressed");
  try {
    L.sec("24a. Visitor hero switch");
    const g = await A("guest");
    await L.goto(g, "/", SWITCH);
    L.check(/What do you need today\?/.test(await g.page.locator(SWITCH).innerText()), "heading above the cards");
    L.check((await pressed(g, SERVICES)) === "true", "Services is active on the home page");
    L.check(/Find trusted pros/.test(await g.page.locator(".landing-hero h1").innerText()), "services heading");
    L.check(!/🦁/.test(await g.page.locator(".landing-eyebrow").first().innerText()), "no emoji in the label");
    await L.shot(g, "s24-hero-services");
    await g.page.locator(LOGISTICS).click();
    await g.page.waitForURL(/\/logistics$/, { timeout: 10000 });
    await g.page.waitForSelector(SWITCH, { timeout: 15000 });
    L.check((await pressed(g, LOGISTICS)) === "true", "Logistics card opens Logistics and is active");
    L.check(/Trucks & machines/.test(await g.page.locator(".landing-hero h1").innerText()), "logistics heading");
    await L.shot(g, "s24-hero-logistics");
    await g.page.locator(SERVICES).click();
    await g.page.waitForFunction(() => location.pathname === "/", null, { timeout: 10000 }).catch(() => {});
    await g.page.waitForTimeout(800);
    L.check(new URL(g.page.url()).pathname === "/", "Services card returns home and doesn't bounce back", g.page.url());
    const headerPost = g.page.locator(".landing-nav__post-task:visible").first();
    L.check((await headerPost.getAttribute("href")) === "/post-task", "Services: Post a Task → /post-task");

    for (const width of [320, 390]) {
      const p = await A(`guest-phone-${width}`, { viewport: { width, height: 760 } });
      for (const path of ["/", "/logistics"]) {
        await L.goto(p, path, SWITCH);
        const over = await p.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        L.check(over <= 0, `${width} px ${path}: no sideways scroll`, over);
      }
      if (width === 320) await L.shot(p, "s24-hero-phone");
    }

    L.sec("24b. v2.7.66: logged-in customer gets the Services/Logistics choice too");
    const known = await L.makeCustomer(`s24-hero-${RUN}`);
    const lg = await A("known");
    await L.seedAuth(lg, { token: known.token, user: known });
    await L.goto(lg, "/", ".landing-hero h1");
    L.check((await lg.page.locator(SWITCH).count()) > 0, "customer logged in: the switch is shown");

    L.sec("24c. Guest fills in a job, customer signs in and posts it");
    const customer = await L.makeCustomer(`s24-post-${RUN}`);
    const goods = `S24 goods ${Date.now()}`;
    const c = await A("guest-customer");
    await guestFillsJob(c, goods);
    L.check(/redirect=%2Flogistics%2Fpost|returnUrl=%2Flogistics%2Fpost/.test(c.page.url()), "asked to sign in, returns to the form", c.page.url());
    L.check(await draftInTab(c), "draft saved");
    L.check(!(await d.collection("transport_jobs").findOne({ load_type: new RegExp(goods) })), "nothing posted yet");
    await loginUi(c, customer.email);
    await c.page.waitForURL(/\/logistics\/post/, { timeout: 20000 });
    await c.page.waitForSelector(FORM, { timeout: 15000 });
    await c.page.waitForTimeout(800);
    L.check((await c.page.locator('input[placeholder="e.g. Construction materials"]').inputValue()) === goods, "goods restored");
    L.check(/275/.test(await c.page.locator('input[aria-label="Price"]').inputValue()), "price restored");
    L.check((await c.page.locator(`${FORM} img`).count()) >= 1, "photo restored");
    L.check((await c.page.locator('[data-testid="guest-post-note"]').count()) === 0, "guest note gone");
    L.check(await L.waitText(c, /Check them and post your job/, 5000), "told the details are back");
    L.check(!/Sign in to post your job/.test(await L.bodyText(c)), "old sign-in message gone");
    await L.shot(c, "s24-restored");
    await c.page.locator(SUBMIT).click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 });
    const job = await d.collection("transport_jobs").findOne({ load_type: new RegExp(goods) });
    L.check(!!job && String(job.requester_id) === customer._id, "job saved for the customer");
    L.check((job?.images || []).length === 1, "with its photo", job?.images);
    L.check(!(await draftInTab(c)), "draft cleared after posting");

    L.sec("24d. Equipment owner can't send the draft");
    const owner = await F.makeOwner(C.slot("owner", "s24", 0));
    const { password } = await d.collection("users").findOne({ email: customer.email }, { projection: { password: 1 } });
    await d.collection("users").updateOne({ email: owner.email }, { $set: { password } });
    const o = await A("guest-owner");
    const ownerGoods = `S24 owner ${Date.now()}`;
    await guestFillsJob(o, ownerGoods);
    await loginUi(o, owner.email);
    await o.page.waitForURL(/\/logistics\/owner/, { timeout: 20000 });
    L.check(await L.waitText(o, /customer account/, 6000), "owner told why");
    await L.shot(o, "s24-owner-blocked");
    L.check(!(await draftInTab(o)), "owner's draft discarded");
    L.check(!(await d.collection("transport_jobs").findOne({ load_type: new RegExp(ownerGoods) })), "no job created");

    L.sec("24e. Operator can't send the draft");
    const operator = await F.makeOperator(owner, C.slot("operator", "s24", 0));
    await d.collection("users").updateOne({ email: operator.email }, { $set: { password } });
    const op = await A("guest-operator");
    const opGoods = `S24 operator ${Date.now()}`;
    await guestFillsJob(op, opGoods);
    await loginUi(op, operator.email);
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 });
    L.check(await L.waitText(op, /customer account/, 6000), "operator told why");
    L.check(!(await draftInTab(op)), "operator's draft discarded");
    L.check(!(await d.collection("transport_jobs").findOne({ load_type: new RegExp(opGoods) })), "no job created");

    L.sec("24f. Actions that still need an account");
    const x = await A("guest-account");
    for (const q of ["edit=000000000000000000000000", "asset=000000000000000000000000", "category=cab"]) {
      await x.page.goto(`${L.WEB}/logistics/post?${q}`, { waitUntil: "domcontentloaded" });
      await x.page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
      L.check(/\/login\?redirect=/.test(x.page.url()), `${q.split("=")[0]}: goes to sign in`, x.page.url());
    }
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s24-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
