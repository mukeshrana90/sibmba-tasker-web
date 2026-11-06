/* Stage 28 — profile photos through the real Edit Profile page.
 * Every equipment owner and customer this run created (@yopmail.com, no photo yet) opens
 * /edit-profile, picks an AI face photo (fixtures/real/face-*.jpg, zw-face-*.jpg — not real
 * people) and presses Update. Operators already got a face photo on their invite. */
const path = require("path");
const fs = require("fs");
const L = require("./lib");

const REAL = path.join(__dirname, "fixtures", "real");
const FACES = [7, 8, 4, 6, 2, 1, 3, 5].map((i) => path.join(REAL, i > 6 ? `zw-face-${i}.jpg` : `face-${i}.jpg`)).filter((f) => fs.existsSync(f));
const MAX = Number(process.env.S28_MAX || 30);

(async () => {
  const d = await L.db();
  const actors = [];
  try {
    L.sec("28. Owners and customers add a profile photo (Edit Profile → Update)");
    // Only people this run created (from the stage-1 owner on) — never older testers
    const st = L.loadState();
    const first = st.owner?._id && await d.collection("users").findOne({ _id: new L.mongoose.Types.ObjectId(String(st.owner._id)) }, { projection: { createdAt: 1 } });
    const since = process.env.S28_SINCE ? new Date(process.env.S28_SINCE) : first?.createdAt;
    L.check(!!since, "run start known (stage-1 owner)", { owner: st.owner?._id });
    if (!since) return;
    const people = await d.collection("users")
      .find({
        createdAt: { $gte: since },
        email: /@yopmail\.com$/i,
        $and: [
          { $or: [{ profile_image: { $in: [null, ""] } }, { profile_image: { $exists: false } }] },
          // owners (role 4 without an owner) and Tasker customers / providers / corporates
          { $or: [{ role: 4, owner_id: { $in: [null, undefined] } }, { role: { $in: [1, 2, 3] } }] },
        ],
        is_deleted: { $ne: 1 },
        status: { $ne: 0 },
        full_name: { $nin: [null, ""] },
      })
      .project({ _id: 1, email: 1, role: 1, full_name: 1, owner_id: 1 })
      .sort({ createdAt: 1 })
      .limit(MAX)
      .toArray();
    L.check(people.length > 0, `${people.length} people without a photo`);
    let k = 0;
    for (const u of people) {
      const face = FACES[k++ % FACES.length];
      const a = await L.actor(`photo-${k}`);
      actors.push(a);
      try {
        await L.seedAuth(a, { token: L.tokenFor(u._id), user: { _id: String(u._id), role: u.role } });
        // service providers edit on the company-style page
        await L.goto(a, u.role === 2 ? "/edit-profile-company" : "/edit-profile");
        // a service provider without a service is sent to Add service first (app rule) — skip
        if (/\/service\/add/.test(a.page.url())) {
          L.check(true, `${u.full_name} (service provider): app asks to add a service first — skipped`);
          await a.ctx.close().catch(() => {});
          continue;
        }
        // the file input is hidden (d-none) behind the avatar — wait for it in the DOM
        await a.page.waitForSelector("#upload-profile", { state: "attached", timeout: 20000 });
        await a.page.locator("#upload-profile").setInputFiles(face);
        await a.page.waitForTimeout(800);
        await a.page.locator('button[type="submit"].submit').first().click();
        await a.page.waitForTimeout(2500);
        const after = await d.collection("users").findOne({ _id: u._id }, { projection: { profile_image: 1 } });
        L.check(!!after?.profile_image, `${u.full_name} (${({ 1: "customer", 2: "service provider", 3: "corporate", 4: "owner" })[u.role]}) has a profile photo`, after?.profile_image);
        await L.shot(a, `s28-${k}`);
      } catch (e) {
        L.check(false, `${u.full_name}: photo upload`, e.message.split("\n")[0]);
      }
      await a.ctx.close().catch(() => {});
    }
  } catch (e) {
    L.check(false, "stage 28 crashed", e.stack);
  } finally {
    await L.done();
  }
})();
