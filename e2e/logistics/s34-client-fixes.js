/* Stage 34 — v2.7.66 client fixes: "New" instead of 0.0 / 0 reviews, payment promise removed, no plus
   codes in addresses (posted jobs + the fix script), tax certificate expiry optional. */
const path = require("path");
const fs = require("fs");
const L = require("./lib");
const F = require("./fleet-helpers");
const DOCS = require("./docs");
const { execFileSync } = require("child_process");

const { OID } = F;
const CODE_RE = /(?:^|[\s,])[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,}/i;
const PLUS = "464Q+H9G, Harare, Zimbabwe";

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const d = await L.db();
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };
  const person = (role, i, key) => {
    const p = C.person(role, 100 + i);
    return { ...p, email: `s34${role.slice(0, 2)}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s34-${role}-${key}`), company: p.company || `${p.name} Transport` };
  };
  await F.resetPeople([person("owner", 0, "a").email, person("owner", 1, "b").email, person("owner", 2, "sig").email]);

  try {
    const customer = await L.makeCustomer(`s34-${RUN}`);

    L.sec("34a. Provider profile: no reviews shows New; a reviewed one still shows its score");
    const provider = await L.makeCustomer(`s34-prov-${RUN}`, 2);
    const provA = await A("customer-view");
    await L.seedAuth(provA, { token: customer.token, user: customer });
    await provA.page.evaluate(() => { localStorage.setItem("latitude", "-17.8292"); localStorage.setItem("longitude", "31.0522"); });
    // Provider profile data: the real API, its rating fields replaced for each case
    const patchProfile = (url, patch) => provA.ctx.route(url, async (route) => {
      const r = await route.fetch({ url: route.request().url().replace("https://localhost:3001", L.API) }).catch(() => null);
      if (!r) return route.abort();
      const body = await r.json().catch(() => ({}));
      if (body?.data) patch(body.data);
      await route.fulfill({ response: r, body: JSON.stringify(body), headers: { ...r.headers(), "content-type": "application/json" } });
    });
    let mode = "new";
    await patchProfile(/\/api\/customer\/service-provider-profile/, (data) => {
      data.averageRating = mode === "new" ? 0 : 4.5;
      data.feedbacks = mode === "new" ? [] : [{ _id: "f1", rating: 4, review: "Good work", customerId: { full_name: "Test Customer" } }, { _id: "f2", rating: 5, review: "Great", customerId: { full_name: "Other Customer" } }];
    });
    // Similar providers: one new, one reviewed (the section renders whatever the API sends)
    await patchProfile(/\/api\/customer\/top-rated-services/, (data) => {
      const sp = (i) => ({ _id: `aaaaaaaaaaaaaaaaaaaaaaa${i}`, full_name: `Similar Provider ${i}` });
      data.items = [
        { _id: "bbbbbbbbbbbbbbbbbbbbbbb1", serviceSubCategoryName: "Plumbing", price: 20, averageRating: 0, reviewCount: 0, serviceProvider: sp(1) },
        { _id: "bbbbbbbbbbbbbbbbbbbbbbb2", serviceSubCategoryName: "Plumbing", price: 20, averageRating: 4.5, reviewCount: 2, serviceProvider: sp(2) },
      ];
    });
    await L.goto(provA, `/service-provider/${provider._id}`);
    await provA.page.waitForSelector(".prov-card", { timeout: 20000 }).catch(() => {});
    await provA.page.waitForTimeout(800);
    let body = await L.bodyText(provA);
    L.check(/\bNew\b/.test(body), "no reviews: profile says New", body.slice(0, 200));
    L.check(!/\b0\.0\b/.test(body) && !/\(?\b0 reviews?\)?/i.test(body), "no reviews: no 0.0 and no '0 reviews'", (body.match(/.{0,20}(0\.0|0 reviews?).{0,20}/i) || [])[0]);
    const cards = provA.page.locator(".prov-card");
    L.check((await cards.count()) === 2, "two similar providers shown", await cards.count());
    const card0 = await cards.nth(0).innerText();
    const card1 = await cards.nth(1).innerText();
    L.check(/\bNew\b/.test(card0) && !/0\.0|0 reviews/i.test(card0), "similar provider without reviews: New, no 0.0", card0.replace(/\s+/g, " "));
    L.check(/4\.5/.test(card1), "similar provider with reviews still shows its score", card1.replace(/\s+/g, " "));
    await L.shot(provA, "s34-provider-new");
    mode = "reviewed";
    await provA.page.reload({ waitUntil: "domcontentloaded" });
    await provA.page.waitForLoadState("networkidle").catch(() => {});
    await provA.page.waitForTimeout(1500);
    body = await L.bodyText(provA);
    L.check(/4\.5/.test(body) && !/\bNew\b(?!\s*Orleans)/.test((body.match(/.{0,5}4\.5.{0,20}/) || [""])[0]), "reviewed: profile shows its score", (body.match(/.{0,20}4\.5.{0,20}/) || [])[0]);

    L.sec("34b. The payment promise is gone from the profile");
    L.check((await provA.page.locator(".guarantee").count()) === 0, "no .guarantee block");
    L.check(!/Protected by Simba Tasker|money is held|held securely|payment guarantee/i.test(body), "no payment promise on the page");

    L.sec("34c. Truck with no reviews shows New; a reviewed one keeps its score");
    const owner = await F.makeOwner(person("owner", 0, "a"));
    const unit = await F.makeUnit(owner, C.unit("truck", 340), { docs: { rego: 8 } });
    await L.goto(provA, `/logistics/asset/${unit._id}`, ".log-detail-item, h1");
    await provA.page.waitForTimeout(1500);
    body = await L.bodyText(provA);
    L.check(/\bNew\b/.test(body), "no reviews: truck page says New", body.slice(0, 200));
    L.check(!/\b0\.0\b|\b0 reviews?\b/i.test(body), "no reviews: truck page has no 0.0 / 0 reviews", (body.match(/.{0,20}(0\.0|0 reviews?).{0,20}/i) || [])[0]);
    await L.shot(provA, "s34-truck-new");
    if (st.truck?._id) {
      const reviewed = await L.api("GET", `/logistics/asset/${st.truck._id}`, { token: customer.token });
      const rating = reviewed?.data?.asset?.rating || {};
      if (Number(rating.count) > 0) {
        await L.goto(provA, `/logistics/asset/${st.truck._id}`);
        await provA.page.waitForTimeout(1500);
        const t2 = await L.bodyText(provA);
        L.check(new RegExp(String(Number(rating.average).toFixed(1).replace(".", "\\."))).test(t2) && /\d review/.test(t2), "reviewed truck still shows its score", (t2.match(/.{0,20}review.{0,20}/) || [])[0]);
      } else {
        L.check(false, "s34 expects the s3 truck to have a review (run s3 first)", rating);
      }
    } else {
      L.check(false, "s34 needs state.json truck (run s2 first)");
    }

    L.sec("34d. Plus code address");
    const job = await F.postJob(customer, { goods: `S34 plus ${RUN}`, weight: 5, body: { pickup: { address: PLUS, coordinates: L.PLACES.coords.harare } } });
    let row = await d.collection("transport_jobs").findOne({ _id: OID(job) });
    L.check(!!row && !CODE_RE.test(row.pickup?.address || ""), "posted job: plus code removed from the saved address", row?.pickup?.address);
    L.check(!!(row?.pickup?.address || "").trim(), "address isn't empty", row?.pickup?.address);
    const pjob = await L.api("PATCH", `/logistics/job/${job}`, { token: customer.token, body: { pickup: { address: PLUS, coordinates: L.PLACES.coords.harare } } });
    row = await d.collection("transport_jobs").findOne({ _id: OID(job) });
    L.check(pjob?.success !== false && !CODE_RE.test(row?.pickup?.address || ""), "job edit: plus code removed", row?.pickup?.address);
    // Shown to the customer and to a fleet
    await L.goto(provA, `/logistics/jobs/${job}`);
    await provA.page.waitForTimeout(1500);
    let page = await L.bodyText(provA);
    L.check(!CODE_RE.test(page), "customer's job page: no plus code", (page.match(CODE_RE) || [])[0]);
    const fleet = await A("fleet");
    if (st.operator?._id) {
      await L.seedAuth(fleet, { token: L.tokenFor(st.operator._id), user: st.operator });
      await L.goto(fleet, `/logistics/driver/job/${job}`);
      await fleet.page.waitForTimeout(1500);
      page = await L.bodyText(fleet);
      L.check(!CODE_RE.test(page), "operator's job page: no plus code", (page.match(CODE_RE) || [])[0]);
    }

    L.sec("34e. Old job: fix script");
    const old = await F.postJob(customer, { goods: `S34 old ${RUN}`, weight: 5 });
    await d.collection("transport_jobs").updateOne({ _id: OID(old) }, { $set: { "pickup.address": PLUS } });
    const dry = (() => {
      try {
        return execFileSync(process.execPath, [path.join(F.BACKEND, "scripts/fix-plus-code-addresses.js")], { cwd: F.BACKEND, encoding: "utf8", timeout: 120000, env: { ...process.env } });
      } catch (e) {
        return `SCRIPT_ERROR ${e.message} ${e.stdout || ""}`;
      }
    })();
    L.check(new RegExp(`${old} pickup: "`).test(dry), "fix script (dry run) lists the old job", dry.slice(-400));
    L.check(/\(dry run\)/.test(dry) && /no longer|would change|job\(s\)/i.test(dry), "dry run changes nothing and says so", dry.slice(-200));
    L.check((await d.collection("transport_jobs").findOne({ _id: OID(old) }))?.pickup?.address === PLUS, "dry run left the job untouched");
    // The script's own logic, scoped to this one job (the script itself can't be scoped)
    const fixed = F.backend(`const m=require("mongoose");const {readablePlusCodeAddress}=require("./src/utils/logistics/placeLabel");const {TransportJob}=require("./src/models");const j=await TransportJob.findById(${JSON.stringify(old)}).select("pickup");const a=await readablePlusCodeAddress(j.pickup.address,j.pickup.coordinates);await TransportJob.updateOne({_id:j._id},{$set:{"pickup.address":a}},{timestamps:false});return a;`);
    row = await d.collection("transport_jobs").findOne({ _id: OID(old) });
    L.check(!!fixed && !fixed.crash && !CODE_RE.test(row?.pickup?.address || "") && row?.pickup?.address !== PLUS, "fix logic cleans the old job", { fixed, addr: row?.pickup?.address });

    L.sec("34f. Tax certificate: expiry optional, past date refused, owner ID still needs one");
    const pOwnerB = person("owner", 1, "b");
    const ownerB = await F.makeOwner(pOwnerB, { approve: false });
    const biz = await L.businessDocFiles({ name: pOwnerB.name, company: pOwnerB.company });
    const up = await L.apiForm("POST", "/logistics/business-docs", { token: ownerB.token, body: { owner_id_kind: "national_id", owner_id_expires: L.docExpiryYmd() }, files: [["business_registration", biz.business_registration], ["owner_id", biz.owner_id]] });
    L.check(up?.success !== false, "owner uploads the required documents", up?.message);
    const ownerA = await A("ownerB");
    await L.seedAuth(ownerA, { token: ownerB.token, user: ownerB });
    await L.goto(ownerA, "/logistics/owner/verification", '.log-bizdoc[data-type="tax"]');
    const taxRow = ownerA.page.locator('.log-bizdoc[data-type="tax"]');
    L.check(/Expiry date \(optional\)/.test(await taxRow.innerText()), "verification page: tax expiry says optional");
    await taxRow.locator('input[type="file"]').first().setInputFiles(biz.tax);
    await ownerA.page.waitForFunction(() => document.querySelector('.log-bizdoc[data-type="tax"]')?.getAttribute("data-status") === "pending", null, { timeout: 15000 }).catch(() => {});
    L.check((await taxRow.getAttribute("data-status")) === "pending", "tax certificate uploads without an expiry (verification page)", await taxRow.getAttribute("data-status"));
    {
      const u = await d.collection("users").findOne({ _id: OID(ownerB._id) }, { projection: { logistics_business_documents: 1 } });
      L.check((u.logistics_business_documents || []).find((x) => x.type === "tax") && !(u.logistics_business_documents || []).find((x) => x.type === "tax").expires, "saved with no expiry");
    }
    await L.shot(ownerA, "s34-tax-optional");
    const pastTax = await L.apiForm("POST", "/logistics/business-docs", { token: ownerB.token, body: { tax_expires: "2024-01-01" }, files: [["tax", biz.tax]] });
    L.check(pastTax?.success === false && /after today|expiry/i.test(pastTax?.message || ""), "API: past tax expiry refused", pastTax);
    const noExpiryId = await L.apiForm("POST", "/logistics/business-docs", { token: ownerB.token, body: { owner_id_kind: "passport" }, files: [["owner_id", biz.owner_id]] });
    L.check(noExpiryId?.success === false && /expiry/i.test(noExpiryId?.message || ""), "API: owner ID without expiry still refused", noExpiryId);

    // Sign-up (UI): tax certificate without an expiry
    const pSig = person("owner", 2, "sig");
    const sg = await A("signup");
    await L.goto(sg, "/sign-up?role=logistics", "form");
    await sg.page.getByRole("button", { name: "Equipment Owner" }).click();
    await sg.page.fill("#full_name", pSig.name);
    await sg.page.fill("#company_name", pSig.company);
    await sg.page.fill("#email", pSig.email);
    await L.typePhone(sg.page.locator("#phone"), C.CC, pSig.phone);
    await sg.page.fill('input[name="password"]', "Passw0rd!");
    await sg.page.fill('input[name="confirmPassword"]', "Passw0rd!");
    await sg.page.check('input[name="terms"]');
    await L.fillSignupBusinessDocs(sg.page, pSig, { taxExpiry: false });
    L.check(/Expiry date \(optional\)/.test(await sg.page.locator(".log-signup-doc", { hasText: "Tax" }).innerText().catch(() => "")), "sign-up: tax expiry says optional");
    await sg.page.locator('form button[type="submit"]').click();
    await sg.page.getByText("Email", { exact: true }).first().click({ timeout: 10000 });
    await sg.page.locator(".modal button", { hasText: /next|continue|send/i }).last().click();
    await sg.page.waitForURL(/otp/i, { timeout: 15000 }).catch(() => {});
    const su = await d.collection("users").findOne({ email: pSig.email }, { projection: { logistics_business_documents: 1 } });
    const taxSig = (su?.logistics_business_documents || []).find((x) => x.type === "tax");
    L.check(!!taxSig && !taxSig.expires, "sign-up: tax certificate saved with no expiry", taxSig);
    if (su) await d.collection("users").deleteOne({ _id: su._id });
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s34-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
