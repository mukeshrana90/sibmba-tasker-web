/* Stage 7 — every logistics route × role, desktop + mobile: renders, no errors/5xx, no horizontal overflow; route guards. */
const L = require("./lib");

(async () => {
  const st = L.loadState();
  const provider = await L.makeCustomer(`prov.${st.RUN}`, 2);
  const corporate = await L.makeCustomer(`corp.${st.RUN}`, 3);
  const ROLES = {
    customer: {
      user: st.customer,
      routes: ["/logistics", "/logistics/post", "/logistics/search", `/logistics/asset/${st.truck._id}`, `/logistics/asset/${st.cab._id}`,
        "/logistics/jobs", `/logistics/jobs/${st.job._id}`, `/logistics/jobs/${st.job._id}/quotes`, `/logistics/jobs/${st.ride}`, "/logistics/emergency-contacts"],
    },
    provider: { user: provider, routes: ["/logistics", "/logistics/search", "/logistics/post"] },
    corporate: { user: corporate, routes: ["/logistics", "/logistics/search", "/logistics/post"] },
    owner: {
      user: st.owner,
      routes: ["/logistics/owner", "/logistics/owner/fleet", `/logistics/owner/fleet/${st.truck._id}`, `/logistics/owner/fleet/${st.cab._id}`,
        "/logistics/owner/operators", "/logistics/owner/opportunities", "/logistics/owner/quotes", "/logistics/owner/jobs", `/logistics/owner/job/${st.job._id}`,
        "/logistics/owner/earnings", "/logistics/owner/equipment", "/logistics/owner/availability", "/logistics/owner/analytics", "/logistics/owner/reports",
        "/logistics/owner/sos", "/logistics/owner/emergency-contacts", "/logistics/owner/subscription", "/logistics/owner/support"],
    },
    operator: {
      user: st.operator,
      routes: ["/logistics/driver", "/logistics/driver/work", "/logistics/driver/jobs", "/logistics/driver/quotes", `/logistics/driver/job/${st.job._id}`,
        "/logistics/driver/earnings", "/logistics/driver/analytics", "/logistics/driver/emergency-contacts", "/logistics/driver/support"],
    },
  };

  for (const mobile of [false, true]) {
    for (const [role, cfg] of Object.entries(ROLES)) {
      L.sec(`7. ${role} routes (${mobile ? "mobile 390px" : "desktop"})`);
      const a = await L.actor(`${role}${mobile ? "-m" : ""}`, { mobile });
      await L.seedAuth(a, { token: cfg.user.token, user: cfg.user });
      for (const r of cfg.routes) {
        const e0 = a.errors.length, f0 = a.apiFails.length;
        await L.goto(a, r);
        await a.page.waitForTimeout(1200);
        const url = a.page.url().replace(L.WEB, "");
        const txt = await L.bodyText(a);
        const overflow = await a.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const blank = txt.length < 80;
        const crashed = /Something went wrong|Unexpected Application Error|Cannot read properties/i.test(txt);
        const stuck = /^\s*Loading/.test(txt.replace(/^.*?(Job detail|Home \/ Logistics)/, "")) && false;
        const newErr = a.errors.slice(e0), newFail = a.apiFails.slice(f0);
        const ok = url.split("?")[0].replace(/\/$/, "") === r && !blank && !crashed && newErr.length === 0 && newFail.length === 0 && (!mobile || overflow <= 2);
        L.check(ok, `${r}`, { url: url !== r ? url : undefined, blank, crashed, overflow: mobile ? overflow : undefined, err: newErr, fail: newFail });
        if (!ok) await L.shot(a, `s7${r}`);
      }
      await a.ctx.close();
    }
  }

  L.sec("7b. Route guards");
  const guard = async (who, user, path, expect) => {
    const a = await L.actor(`guard-${who}`);
    if (user) await L.seedAuth(a, { token: user.token, user });
    await L.goto(a, path);
    await a.page.waitForTimeout(800);
    const url = a.page.url().replace(L.WEB, "");
    L.check(expect.test(url), `${who} → ${path} lands on ${url}`, url);
    await a.ctx.close();
  };
  await guard("anon", null, "/logistics/post", /^\/login/);
  await guard("anon", null, "/logistics/owner", /^\/login/);
  await guard("customer", st.customer, "/logistics/owner", /^\/(login|logistics$|$)/);
  await guard("customer", st.customer, "/logistics/driver", /^\/(login|logistics$|$)/);
  await guard("operator", st.operator, "/logistics/owner/fleet", /^\/logistics\/driver/);
  await guard("operator", st.operator, "/logistics/post", /^\/logistics\/driver/);
  await guard("owner", st.owner, "/logistics/driver", /^\/logistics\/owner/);
  await guard("owner", st.owner, "/logistics/post", /^\/logistics\/owner/);
  await L.done();
})();
