/* Stage 14 — operator pages on phones (responsive).
 * Every operator route (+ the owner pages that share the same tables) at 320 / 360 /
 * 390 / 402 (iPhone 17) / 768px, then desktop 1440:
 *   - no horizontal page scroll; reports the outermost element that runs off-screen,
 *   - dashboard: availability card, stats and map/opportunities grid fit the screen,
 *   - job tables (.log-jobs-table--cards) become stacked cards ≤640px: header row hidden,
 *     each labelled cell shows "LABEL  value" side by side (label not glued to value),
 *     cards and their buttons (Quote now / View / Open) stay inside the screen,
 *   - filter toolbar buttons (Apply / Start multi-transit / Reset) stay inside the card,
 *   - desktop keeps the normal table (header row visible, no card labels).
 * Screenshots go to shots/s14-*.png.
 */
const L = require("./lib");

const WIDTHS = (process.env.E2E_WIDTHS || "320,360,390,402,768").split(",").map(Number);
const CARD_MAX = 640;

/** Layout facts for the current page, measured in the browser. */
function measure(W) {
  const ignore = (el) => el.closest(".leaflet-container, .log-fleet-map");
  const rect = (el) => el.getBoundingClientRect();
  const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  // Outermost elements running past the right edge (children of a clipping/scrolling box are fine)
  const clips = (el) => { const o = getComputedStyle(el).overflowX; return o === "auto" || o === "scroll" || o === "hidden"; };
  const offscreen = [];
  for (const el of document.querySelectorAll("body *")) {
    if (ignore(el)) continue;
    const b = rect(el);
    if (!b.width || b.right <= W + 1) continue;
    if (getComputedStyle(el).position === "fixed") continue;
    let p = el.parentElement, clipped = false;
    while (p && p !== document.body) { if (clips(p) && rect(p).right <= W + 1) { clipped = true; break; } p = p.parentElement; }
    if (clipped) continue;
    const par = el.parentElement && rect(el.parentElement);
    if (par && par.right > W + 1 && !ignore(el.parentElement)) continue;
    offscreen.push(`${name(el)} right=${Math.round(b.right)}`);
  }
  const doc = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

  const tables = [...document.querySelectorAll("table.log-jobs-table--cards")].map((t) => {
    const thead = t.querySelector("thead");
    const rows = [...t.querySelectorAll("tbody tr")].filter((tr) => !tr.classList.contains("log-sk-tr") && !tr.querySelector(".logistics-empty"));
    const glued = [], cutoff = [], badRow = [];
    let labelled = 0;
    for (const tr of rows) {
      const rb = rect(tr);
      if (rb.right > W + 1) badRow.push(`${name(tr)} right=${Math.round(rb.right)}`);
      for (const td of tr.querySelectorAll("td")) {
        const cs = getComputedStyle(td);
        if (cs.display === "none") continue;
        const b = rect(td);
        if (b.right > W + 1) cutoff.push(`${td.dataset.label || name(td)} right=${Math.round(b.right)}`);
        if (!td.dataset.label) continue;
        const before = getComputedStyle(td, "::before");
        if (before.content === "none" || before.content === "normal") continue;
        labelled++;
        // Label + value must sit on one flex line with a gap, not run together as inline text
        if (cs.display !== "flex" || before.display !== "block") glued.push(`${td.dataset.label} (display=${cs.display})`);
      }
      for (const btn of tr.querySelectorAll("a, button")) {
        const b = rect(btn);
        if (b.width && (b.right > W + 1 || b.left < -1)) cutoff.push(`button "${btn.textContent.trim()}" right=${Math.round(b.right)}`);
      }
    }
    return { cls: t.className, theadHidden: !thead || getComputedStyle(thead).display === "none", rows: rows.length, labelled, glued, cutoff, badRow };
  });

  const toolbars = [...document.querySelectorAll(".log-jobs-toolbar")].map((tb) => {
    const tr = rect(tb);
    return [...tb.querySelectorAll(".log-jobs-toolbar__actions .logistics-cta")]
      .filter((b) => rect(b).right > tr.right + 1)
      .map((b) => `"${b.textContent.trim()}" right=${Math.round(rect(b).right)} > card ${Math.round(tr.right)}`);
  }).flat();

  const dash = [".log-dash-avail-block", ".log-dash-stats", ".log-dash-grid", ".log-dash-map-card", ".log-dash-opps"]
    .map((s) => document.querySelector(s)).filter(Boolean)
    .filter((el) => rect(el).right > W + 1)
    .map((el) => `${name(el)} right=${Math.round(rect(el).right)}`);

  return { path: location.pathname, doc, offscreen: offscreen.slice(0, 8), tables, toolbars, dash };
}

(async () => {
  const st = L.loadState();
  const fresh = (u) => ({ ...u, token: L.tokenFor(u._id) });
  const operator = fresh(st.operator);
  const owner = fresh(st.owner);
  const jobId = st.job?._id;

  const OPERATOR_ROUTES = ["/logistics/driver", "/logistics/driver/work", "/logistics/driver/jobs", "/logistics/driver/quotes",
    "/logistics/driver/earnings", "/logistics/driver/analytics", "/logistics/driver/emergency-contacts", "/logistics/driver/support",
    ...(jobId ? [`/logistics/driver/job/${jobId}`] : [])];
  // Owner pages that render the same card tables
  const OWNER_ROUTES = ["/logistics/owner/opportunities", "/logistics/owner/quotes", "/logistics/owner/jobs"];

  const seen = { tableRows: 0 };

  for (const W of WIDTHS) {
    for (const [role, user, routes] of [["operator", operator, OPERATOR_ROUTES], ["owner", owner, OWNER_ROUTES]]) {
      L.sec(`14. ${role} pages at ${W}px`);
      const a = await L.actor(`s14-${role}-${W}`, { mobile: true });
      await a.page.setViewportSize({ width: W, height: 874 });
      await L.seedAuth(a, { token: user.token, user });
      for (const route of routes) {
        await L.goto(a, route);
        await a.page.waitForSelector(".log-sk, .log-hub-shimmer", { state: "detached", timeout: 15000 }).catch(() => {});
        await a.page.waitForTimeout(800);
        const m = await a.page.evaluate(measure, W);
        const tag = `${route.replace("/logistics/", "")} @${W}`;
        L.check(m.path === route, `${tag}: page opens (not redirected)`, m.path);
        L.check(m.doc <= W + 1, `${tag}: no sideways scroll`, m.doc > W + 1 ? `page ${m.doc}px wide: ${m.offscreen.join(" | ")}` : "");
        if (route === "/logistics/driver") {
          L.check(!m.dash.length, `${tag}: dashboard cards fit the screen`, m.dash.join(" | "));
        }
        if (m.toolbars.length || /work|jobs|quotes|earnings|opportunities/.test(route)) {
          L.check(!m.toolbars.length, `${tag}: filter buttons stay inside the card`, m.toolbars.join(" | "));
        }
        for (const t of m.tables) {
          if (W <= CARD_MAX) {
            L.check(t.theadHidden, `${tag}: table header hidden (cards)`, t.cls);
            if (t.rows) {
              seen.tableRows += t.rows;
              L.check(t.labelled > 0, `${tag}: card fields show labels`, `${t.rows} rows, ${t.labelled} labelled`);
              L.check(!t.glued.length, `${tag}: labels sit apart from values`, t.glued.slice(0, 4).join(" | "));
              L.check(!t.cutoff.length && !t.badRow.length, `${tag}: cards and buttons inside the screen`, [...t.badRow, ...t.cutoff].slice(0, 4).join(" | "));
            }
          } else {
            L.check(!t.theadHidden, `${tag}: tablet keeps the table header`, t.cls);
          }
        }
        if (W === 402) await L.shot(a, `s14-${role}-${route.split("/").filter(Boolean).slice(-1)[0]}-${W}`);
      }
      L.check(!a.errors.length, `${role} @${W}: no page errors`, a.errors.slice(0, 3).join(" | "));
      await a.ctx.close();
    }
  }

  L.sec("14. card rows were actually exercised");
  L.check(seen.tableRows > 0, "at least one job/quote/earnings row rendered as a card", `${seen.tableRows} row checks`);

  L.sec("14. desktop keeps tables");
  {
    const a = await L.actor("s14-operator-desktop");
    await L.seedAuth(a, { token: operator.token, user: operator });
    for (const route of ["/logistics/driver/work", "/logistics/driver/jobs", "/logistics/driver/quotes", "/logistics/driver/earnings"]) {
      await L.goto(a, route);
      await a.page.waitForSelector(".log-sk, .log-hub-shimmer", { state: "detached", timeout: 15000 }).catch(() => {});
      const r = await a.page.evaluate(() => [...document.querySelectorAll("table.log-jobs-table--cards")].map((t) => {
        const td = t.querySelector("tbody td[data-label]");
        return {
          thead: getComputedStyle(t.querySelector("thead")).display,
          td: td ? getComputedStyle(td).display : "table-cell",
          label: td ? getComputedStyle(td, "::before").content : "none",
        };
      }));
      const ok = r.length && r.every((x) => x.thead === "table-header-group" && x.td === "table-cell" && (x.label === "none" || x.label === "normal"));
      L.check(ok, `${route} @1440: normal table (header row, no card labels)`, JSON.stringify(r));
    }
    await L.shot(a, "s14-operator-quotes-desktop");
    await a.ctx.close();
  }

  await L.done();
})().catch(async (e) => {
  console.error(e);
  L.check(false, "stage crashed", e.message);
  await L.done();
});
