/* Stage 11 — loading skeletons + response hygiene.
 * Every logistics route × role (desktop + 390px), with /api/logistics + /api/equipment
 * slowed down so the loading state is visible:
 *   - a shimmer skeleton (.log-sk / .log-hub-shimmer) shows while data loads,
 *   - no bare "Loading…" text is shown outside a skeleton,
 *   - the skeleton goes away and real content renders (nothing stuck),
 *   - no API response the page receives contains OTP / password fields.
 * Screenshots of the skeleton state go to shots/s11-*.png.
 */
const L = require("./lib");

const DELAY = Number(process.env.E2E_SK_DELAY || 1800);
const LEAK_RE = /"(email_otp|phone_otp|whatsapp_otp|password|device_token)"\s*:/;
const SK_SEL = ".log-sk, .log-hub-shimmer";

(async () => {
  const st = L.loadState();
  const fresh = (u) => ({ ...u, token: L.tokenFor(u._id) });
  const provider = await L.makeCustomer(`prov.sk.${st.RUN}`, 2);
  const ROLES = {
    customer: {
      user: fresh(st.customer),
      routes: ["/logistics", "/logistics/post", "/logistics/search", `/logistics/asset/${st.truck._id}`, `/logistics/asset/${st.cab._id}`,
        "/logistics/jobs", `/logistics/jobs/${st.job._id}`, `/logistics/jobs/${st.job._id}/quotes`, `/logistics/jobs/${st.ride}`,
        `/logistics/post?edit=${st.directJob?._id || st.directJob}`, "/logistics/emergency-contacts"],
    },
    provider: { user: provider, routes: ["/logistics", "/logistics/search"] },
    owner: {
      user: fresh(st.owner),
      routes: ["/logistics/owner", "/logistics/owner/fleet", `/logistics/owner/fleet/${st.truck._id}`, `/logistics/owner/fleet/${st.cab._id}`,
        "/logistics/owner/operators", "/logistics/owner/opportunities", "/logistics/owner/quotes", "/logistics/owner/jobs", `/logistics/owner/job/${st.job._id}`,
        "/logistics/owner/earnings", "/logistics/owner/equipment", "/logistics/owner/availability", "/logistics/owner/analytics", "/logistics/owner/reports",
        "/logistics/owner/sos", "/logistics/owner/emergency-contacts", "/logistics/owner/subscription", "/logistics/owner/support"],
    },
    operator: {
      user: fresh(st.operator),
      routes: ["/logistics/driver", "/logistics/driver/work", "/logistics/driver/jobs", "/logistics/driver/quotes", `/logistics/driver/job/${st.job._id}`,
        "/logistics/driver/earnings", "/logistics/driver/analytics", "/logistics/driver/emergency-contacts", "/logistics/driver/support"],
    },
  };

  const summary = [];
  const leaks = new Set();

  for (const mobile of [false, true]) {
    for (const [role, cfg] of Object.entries(ROLES)) {
      L.sec(`11. ${role} loading skeletons (${mobile ? "mobile 390px" : "desktop"})`);
      const a = await L.actor(`sk-${role}${mobile ? "-m" : ""}`, { mobile });
      await L.seedAuth(a, { token: cfg.user.token, user: cfg.user });
      // Page-level route runs before the context proxy in lib.js; fallback() hands over to it.
      await a.page.route(/\/api\/(logistics|equipment)\//, async (r) => {
        if (r.request().method() === "GET") await new Promise((res) => setTimeout(res, DELAY));
        r.fallback();
      });
      a.page.on("response", async (r) => {
        if (!/\/api\//.test(r.url())) return;
        try {
          const t = await r.text();
          if (LEAK_RE.test(t)) leaks.add(`${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0]} → ${t.match(LEAK_RE)[1]}`);
        } catch {}
      });

      for (const r of cfg.routes) {
        const e0 = a.errors.length, f0 = a.apiFails.length;
        await a.page.goto(`${L.WEB}${r}`, { waitUntil: "domcontentloaded" });
        const t0 = Date.now();
        let seen = false, shotTaken = false, bareLoading = "", clearRuns = 0;
        while (Date.now() - t0 < 25000) {
          const s = await a.page.evaluate((sel) => {
            const sk = [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length).length;
            // visible text outside skeletons / map status chips
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let loading = "";
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              const p = n.parentElement;
              if (!p || p.closest(".log-sk-wrap, .log-route-map__status, script, style, button, option")) continue;
              if (/^\s*(Loading|Searching)\b[^]{0,30}(…|\.\.\.)\s*$/.test(n.textContent) && p.getClientRects().length) loading = n.textContent.trim();
            }
            return { sk, loading };
          }, SK_SEL).catch(() => ({ sk: 0, loading: "" }));
          if (s.loading && !bareLoading) bareLoading = s.loading;
          if (s.sk) {
            seen = true;
            clearRuns = 0;
            if (!shotTaken && Date.now() - t0 > 250) { shotTaken = true; await L.shot(a, `s11${r}`); }
          } else if (Date.now() - t0 > DELAY + 600) {
            if (++clearRuns >= 3) break;
          }
          await a.page.waitForTimeout(120);
        }
        await a.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        const stuck = await a.page.locator(SK_SEL).count();
        const txt = await L.bodyText(a);
        const crashed = /Something went wrong|Unexpected Application Error|Cannot read properties/i.test(txt);
        const overflow = mobile ? await a.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) : 0;
        const newErr = a.errors.slice(e0), newFail = a.apiFails.slice(f0);
        const ok = !bareLoading && !stuck && !crashed && txt.length > 80 && !newErr.length && !newFail.length && overflow <= 2;
        L.check(ok, `${r} — ${seen ? "skeleton shown" : "no skeleton (no slow fetch)"}`, {
          bareLoading: bareLoading || undefined, stuck: stuck || undefined, crashed: crashed || undefined,
          overflow: overflow > 2 ? overflow : undefined, err: newErr.length ? newErr : undefined, fail: newFail.length ? newFail : undefined,
        });
        if (!ok) await L.shot(a, `s11-fail${r}`);
        if (!mobile) summary.push(`${seen ? "SK " : "-- "} ${role.padEnd(8)} ${r}`);
      }
      await a.ctx.close();
    }
  }

  L.sec("11b. No OTP / password fields in any response the pages received");
  L.check(leaks.size === 0, `${leaks.size} leaking response(s)`, [...leaks]);

  L.sec("11c. User-returning endpoints are clean");
  for (const [who, base, user] of [["customer", "customer", st.customer], ["owner", "customer", st.owner], ["operator", "customer", st.operator]]) {
    const token = L.tokenFor(user._id);
    for (const p of [`/${base}/Notificationlist_user`, `/${base}/getProfile`]) {
      const res = await fetch(`${L.API}/api${p}`, { headers: { authorization: token } });
      const t = await res.text();
      L.check(!LEAK_RE.test(t), `${who} GET ${p} (${res.status}, ${t.length} bytes) has no OTP/password`);
    }
  }

  console.log("\nSkeleton coverage (desktop):\n" + summary.join("\n"));
  await L.done();
})();
