/* Stage 38 — phone number on /edit-profile (v2.7.69, all roles on that page).
 * The stored number shows on the page; "Change" sends a code to the NEW number (WhatsApp / SMS,
 * captured in outbox.jsonl) and the number is saved only after the code is verified.
 * Also: a number another account uses is refused, a wrong code is refused, the code never
 * appears in a response. Runs for an approved owner and a customer. */
const L = require("./lib");
const F = require("./fleet-helpers");

const { OID } = F;

async function waitCode(since, phoneTail, channel, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const hit = F.outbox(since).filter((m) => m.channel === channel && String(m.to).endsWith(phoneTail));
    if (hit.length) {
      const m = hit[hit.length - 1];
      return String(m.variables?.["1"] || (String(m.body || "").match(/\d{4}/) || [""])[0]);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return "";
}

(async () => {
  const RUN = L.loadState().RUN || "run";
  const C = L.cast(RUN);
  const d = await L.db();
  const actors = [];
  const user = (id) => d.collection("users").findOne({ _id: OID(id) });
  const tag = String(RUN).toLowerCase().replace(/[^a-z0-9]/g, "");
  // unique 9-digit Harare-style numbers for this run (07x → 77…)
  const base = 770000000 + (Date.now() % 9000000);
  const fresh = (k) => String(base + k * 11);

  try {
    const pOwner = { ...C.slot("owner", "s38", 0), email: `s38.owner.${tag}@${C.DOMAIN}`, phone: C.phone("s38-owner") };
    const owner = await F.makeOwner(pOwner);
    const customer = await L.makeCustomer(`s38-cust-${RUN}`);
    const people = [
      { who: "owner", u: owner, channel: "whatsapp", newPhone: fresh(1) },
      { who: "customer", u: { ...customer, role: 1 }, channel: "sms", newPhone: fresh(2) },
    ];

    for (const p of people) {
      L.sec(`38 ${p.who}: phone shows on /edit-profile and changes only after the code`);
      const before = await user(p.u._id);
      const a = await L.actor(`s38-${p.who}`);
      actors.push(a);
      await L.seedAuth(a, { token: p.u.token, user: { _id: p.u._id, role: p.u.role } });
      await L.goto(a, "/edit-profile", ".profile-phone");

      const shown = await a.page.locator("#profilePhoneNumber").inputValue();
      L.check(shown.replace(/\D/g, "").endsWith(String(before.phone_number).replace(/\D/g, "")), "stored phone shows", { shown, stored: before.phone_number });
      L.check(await a.page.locator("#profilePhoneNumber").isDisabled(), "stored phone is read-only");

      // taken number → refused, nothing sent
      await a.page.locator(".profile-phone__change").click();
      const other = p.who === "owner" ? await user(customer._id) : await user(owner._id);
      await L.typePhone(a.page.locator("#profileNewPhone"), other.country_code, other.phone_number);
      let t0 = new Date().toISOString();
      await a.page.locator(".profile-phone__send").click();
      await L.waitText(a, /already used by another account/);
      L.check(/already used by another account/.test(await a.page.locator(".profile-phone__error").innerText()), "number of another account refused");
      L.check(F.outbox(t0).length === 0, "nothing sent for a taken number");

      // new number → code by the chosen channel
      await L.typePhone(a.page.locator("#profileNewPhone"), "+263", p.newPhone);
      if (p.channel === "sms") await a.page.locator("#profilePhoneChannelSms").check();
      t0 = new Date().toISOString();
      await a.page.locator(".profile-phone__send").click();
      await a.page.waitForSelector("#profilePhoneOtp", { timeout: 15000 });
      const code = await waitCode(t0, p.newPhone, p.channel);
      L.check(/^\d{4}$/.test(code), `code sent by ${p.channel} to the new number`, code);
      L.check(F.outbox(t0).every((m) => String(m.to).endsWith(p.newPhone)), "code went to the new number only");
      L.check(/••• ••• \d{3}/.test(await L.bodyText(a)), "page shows the new number masked");
      let u = await user(p.u._id);
      L.check(u.phone_number === before.phone_number, "not saved before verify");

      // the pending code never leaves the server
      const prof = await L.api("GET", "/customer/getProfile", { token: p.u.token });
      L.check(!JSON.stringify(prof).includes("phone_change") && !JSON.stringify(prof).includes(`"otp"`), "getProfile carries no pending code");

      // wrong code
      await a.page.locator("#profilePhoneOtp").fill(code === "1111" ? "2222" : "1111");
      await a.page.locator(".profile-phone__verify").click();
      await L.waitText(a, /Wrong code/);
      L.check(true, "wrong code refused");

      // right code (Enter verifies, profile form is not submitted)
      await a.page.locator("#profilePhoneOtp").fill(code);
      await a.page.locator("#profilePhoneOtp").press("Enter");
      await L.waitText(a, /Phone number updated/);
      await a.page.waitForSelector(".profile-phone__panel", { state: "detached", timeout: 10000 }).catch(() => {});
      u = await user(p.u._id);
      L.check(u.country_code === "+263" && u.phone_number === p.newPhone && u.phone_verified === 1, "new number saved + verified", { cc: u.country_code, phone: u.phone_number, v: u.phone_verified });
      L.check(!u.phone_change, "pending change cleared");
      L.check(/\/edit-profile/.test(a.page.url()), "stayed on /edit-profile (profile form not submitted)");
      await a.page.waitForTimeout(800);
      const after = await a.page.locator("#profilePhoneNumber").inputValue();
      L.check(after.replace(/\D/g, "").endsWith(p.newPhone), "page shows the new number", after);
      await L.shot(a, `s38-${p.who}`);

      // same number again → refused
      const same = await L.api("POST", "/customer/phone/send-code", { token: p.u.token, body: { country_code: "+263", phone_number: p.newPhone } });
      L.check(same?.success === false && /already your phone/.test(same?.message), "same number refused", same?.message);
    }
  } catch (e) {
    L.check(false, "stage 38 crashed", e.stack);
  } finally {
    for (const a of actors) await a.ctx.close().catch(() => {});
    await L.done();
  }
})();
