#!/usr/bin/env node
/*
 * Outbox viewer — shows, live in the browser, every email / WhatsApp / SMS / push the
 * test API (:4099, mock-providers.js) would have sent, rendered the way the recipient
 * sees it, plus the WhatsApp template catalogue (scripts/logistics-wa-templates.json).
 *
 *   node e2e/logistics/outbox-viewer.js          → http://localhost:4098
 *
 * Reads outbox.jsonl (messages) and progress.jsonl (the E2E step that was running).
 * No dependencies; read-only.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.OUTBOX_VIEWER_PORT || 4098);
const OUTBOX = process.env.MOCK_OUTBOX || path.join(__dirname, "outbox.jsonl");
const PROGRESS = path.join(__dirname, "progress.jsonl");
const TEMPLATES = path.resolve(__dirname, "../../../sibmba-tasker-backend/scripts/logistics-wa-templates.json");

function readJsonl(f) {
  try {
    return fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/outbox") {
    const msgs = readJsonl(OUTBOX);
    const prog = readJsonl(PROGRESS);
    // Attach the stage / section / last check that ran just before each message
    let i = 0, cur = {};
    const out = msgs.map((m, idx) => {
      while (i < prog.length && prog[i].ts <= m.ts) {
        const p = prog[i++];
        if (p.kind === "section") cur = { stage: p.stage, section: p.text, check: "" };
        else cur = { ...cur, stage: p.stage, check: p.text };
      }
      return { n: idx + 1, ...m, step: { ...cur } };
    });
    const last = prog[prog.length - 1];
    return send(res, 200, "application/json", JSON.stringify({ messages: out, now: last || null, checks: prog.filter((p) => p.kind === "check").length, fails: prog.filter((p) => p.kind === "check" && !p.ok).length }));
  }
  if (url.pathname === "/api/templates") {
    try { return send(res, 200, "application/json", fs.readFileSync(TEMPLATES)); } catch (e) { return send(res, 500, "text/plain", String(e)); }
  }
  if (url.pathname === "/") return send(res, 200, "text/html; charset=utf-8", PAGE);
  send(res, 404, "text/plain", "not found");
}).listen(PORT, () => console.log(`Outbox viewer → http://localhost:${PORT}  (reading ${OUTBOX})`));

const PAGE = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Simba Test Outbox</title>
<style>
:root{--bg:#f4f6f8;--panel:#fff;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;--brand:#1f7a3f;--brand-soft:#e7f4ec;--bad:#b91c1c;--bad-soft:#fde8e8;
--wa-bg:#efeae2;--wa-out:#ffffff;--wa-head:#075e54;--sms:#e9e9eb;--sel:#eef6f1}
*{box-sizing:border-box}[hidden]{display:none!important}html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:16px;padding:10px 18px;background:var(--brand);color:#fff;flex-wrap:wrap}
header h1{font-size:16px;margin:0;font-weight:650}
header .note{font-size:12px;opacity:.85}
.tabs{display:flex;gap:4px;margin-left:auto}
.tabs button{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:6px;padding:5px 12px;cursor:pointer;font:inherit}
.tabs button.on{background:#fff;color:var(--brand);font-weight:600}
#now{padding:8px 18px;background:#0f172a;color:#e5e7eb;font-size:12.5px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
#now b{color:#fbbf24}#now .t{color:#93c5fd}#now .ok{color:#86efac}#now .bad{color:#fca5a5}
main{flex:1;display:flex;min-height:0}
.list{width:420px;max-width:45vw;border-right:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;min-height:0}
.filters{display:flex;gap:6px;padding:10px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.filters button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:3px 10px;cursor:pointer;font:inherit;font-size:12.5px}
.filters button.on{background:var(--brand);border-color:var(--brand);color:#fff}
.filters label{font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:4px;margin-left:auto}
#items{overflow:auto;flex:1}
.item{padding:9px 12px;border-bottom:1px solid var(--line);cursor:pointer;display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px}
.item:hover{background:#fafafa}.item.sel{background:var(--sel)}
.item .ch{grid-row:span 3;align-self:start;font-size:11px;font-weight:700;border-radius:5px;padding:2px 6px;color:#fff;margin-top:2px}
.ch.email{background:#2563eb}.ch.whatsapp{background:#16a34a}.ch.sms{background:#7c3aed}.ch.push{background:#d97706}
.item .to{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item .time{color:var(--muted);font-size:12px}
.item .sub{grid-column:2/4;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.item .why{grid-column:2/4;color:var(--muted);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fail-tag{color:var(--bad);font-weight:700}
.view{flex:1;overflow:auto;padding:22px;min-width:0}
.empty{color:var(--muted);text-align:center;margin-top:80px}
.meta{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px}
.meta div{display:flex;gap:8px}.meta span:first-child{color:var(--muted);min-width:90px}
.why-box{background:var(--brand-soft);border:1px solid #bfe3cc;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px}
.why-box b{color:var(--brand)}
.errbox{background:var(--bad-soft);border:1px solid #f5b5b5;color:var(--bad);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-weight:600}
/* email client */
.mail{flex-shrink:0;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;max-width:820px}
.mail-head{padding:16px 20px;border-bottom:1px solid var(--line)}
.mail-head h2{margin:0 0 8px;font-size:19px;font-weight:600}
.mail-head .from{display:flex;align-items:center;gap:10px;font-size:13px}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:700}
.mail iframe{width:100%;border:0;display:block;min-height:500px;background:#fff}
/* phone */
.phone{width:380px;max-width:100%;border:10px solid #111;border-radius:36px;overflow:hidden;background:var(--wa-bg);box-shadow:0 8px 30px rgba(0,0,0,.18)}
.phone .bar{background:var(--wa-head);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px}
.phone .bar .avatar{background:#25d366;width:36px;height:36px}
.phone .bar small{display:block;opacity:.8;font-size:11.5px}
.phone.sms .bar{background:#f2f2f7;color:#111;justify-content:center;flex-direction:column;gap:2px}
.phone.sms{background:#fff}
.chat{padding:16px 12px 22px;min-height:360px;display:flex;flex-direction:column;gap:8px}
.day{align-self:center;background:#e1f2fb;color:#54656f;font-size:11.5px;border-radius:7px;padding:3px 10px}
.bubble{align-self:flex-start;max-width:88%;background:var(--wa-out);border-radius:0 9px 9px 9px;padding:7px 9px 18px;position:relative;box-shadow:0 1px .5px rgba(0,0,0,.13);white-space:pre-wrap;word-break:break-word;font-size:14.2px}
.bubble a{color:#027eb5}
.bubble .tm{position:absolute;right:8px;bottom:3px;font-size:11px;color:#667781}
.phone.sms .bubble{background:var(--sms);border-radius:18px;padding:9px 13px}
.biz{align-self:center;background:#fff7c2;color:#54656f;font-size:11.5px;border-radius:7px;padding:4px 10px;text-align:center;max-width:90%}
.cols{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
.tpl-info{flex:1;min-width:280px}
table.vars{border-collapse:collapse;width:100%;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:13px}
table.vars th,table.vars td{padding:7px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
table.vars th{background:#f9fafb;color:var(--muted);font-weight:600}
code{background:#f3f4f6;border-radius:4px;padding:1px 5px;font-size:12.5px;word-break:break-all}
.raw{white-space:pre-wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;font:12.5px/1.5 ui-monospace,monospace;color:#374151}
/* catalogue */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:22px;padding:22px;overflow:auto;flex:1}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px}
.card h3{margin:0;font-size:15px}.card .sub{color:var(--muted);font-size:12.5px}
.pill{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--brand-soft);color:var(--brand);margin-right:6px}
.card .phone{width:100%;border-width:6px;border-radius:22px}.card .chat{min-height:0}
.count{font-size:12px;color:var(--muted)}
.mailcat{padding:22px;overflow:auto;flex:1;display:flex;flex-direction:column;gap:26px}
@media (max-width:820px){main{flex-direction:column}.list{width:100%;max-width:none;height:45vh}.grid{grid-template-columns:1fr;padding:16px}}
</style></head><body>
<header>
  <h1>Simba Tasker — Test Outbox</h1>
  <span class="note">Local mock of SendGrid / Twilio: nothing leaves this machine. This is exactly what users would receive.</span>
  <div class="tabs"><button data-tab="live" class="on">Live messages</button><button data-tab="wa">WhatsApp templates</button><button data-tab="mail">Email templates</button></div>
</header>
<div id="now">Waiting for the E2E run…</div>
<main id="live">
  <section class="list">
    <div class="filters" id="filters"></div>
    <div id="items"></div>
  </section>
  <section class="view" id="view"><div class="empty">Messages appear here as the browser test sends them.</div></section>
</main>
<main id="wa" hidden><div class="grid" id="tplgrid"></div></main>
<main id="mail" hidden><div class="mailcat" id="mailcat"></div></main>
<script>
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const hhmm = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
let msgs = [], templates = [], filter = "all", follow = true, selected = null, lastCount = -1;

const CH = { email: "EMAIL", whatsapp: "WHATSAPP", sms: "SMS", push: "PUSH" };
function filters() {
  const counts = { all: msgs.length };
  for (const m of msgs) counts[m.channel] = (counts[m.channel] || 0) + 1;
  counts.failed = msgs.filter((m) => m.ok === false).length;
  $("#filters").innerHTML = ["all", "email", "whatsapp", "sms", "push", "failed"].map((k) =>
    '<button class="' + (filter === k ? "on" : "") + '" data-f="' + k + '">' + k[0].toUpperCase() + k.slice(1) + " " + (counts[k] || 0) + "</button>").join("") +
    '<label><input type="checkbox" id="follow" ' + (follow ? "checked" : "") + '> follow newest</label>';
}
function summary(m) {
  if (m.channel === "email") return m.subject;
  if (m.channel === "whatsapp") return (m.template_name ? "[" + m.template_name + "] " : "") + (m.body || "");
  if (m.channel === "push") return m.title + " — " + m.body;
  return m.body;
}
function list() {
  const shown = msgs.filter((m) => filter === "all" || (filter === "failed" ? m.ok === false : m.channel === filter)).slice().reverse();
  $("#items").innerHTML = shown.map((m) =>
    '<div class="item ' + (selected === m.n ? "sel" : "") + '" data-n="' + m.n + '"><span class="ch ' + m.channel + '">' + CH[m.channel] + '</span>' +
    '<span class="to">' + (m.ok === false ? '<span class="fail-tag">FAILED · </span>' : "") + esc(m.to) + '</span><span class="time">#' + m.n + " · " + hhmm(m.ts) + "</span>" +
    '<span class="sub">' + esc(summary(m)) + "</span>" + (m.step.section ? '<span class="why">' + esc(m.step.stage + " › " + m.step.section) + "</span>" : "") + "</div>").join("") ||
    '<div class="empty">Nothing yet.</div>';
}
function whyBox(m) {
  if (!m.step || !m.step.section) return "";
  return '<div class="why-box"><b>Sent during:</b> ' + esc(m.step.stage) + " › " + esc(m.step.section) + (m.step.check ? '<br><b>Last check before it:</b> ' + esc(m.step.check) : "") + "</div>";
}
function phone(m, { title, sub, body, sms } = {}) {
  return '<div class="phone ' + (sms ? "sms" : "") + '"><div class="bar">' + (sms ? "<b>" + esc(title) + "</b><small>" + esc(sub) + "</small>" :
    '<div class="avatar">S</div><div><b>' + esc(title) + "</b><small>" + esc(sub) + "</small></div>") + '</div><div class="chat">' +
    '<span class="day">' + (m ? new Date(m.ts).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "Today") + "</span>" +
    (sms ? "" : '<span class="biz">This business uses a secure service from Meta to manage this chat.</span>') +
    '<div class="bubble">' + linkify(body) + '<span class="tm">' + (m ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:24") + "</span></div></div></div>";
}
function varsTable(t, vars, head = "Value sent") {
  const keys = Object.keys(vars || {});
  if (!keys.length) return "";
  return '<table class="vars"><tr><th>Variable</th><th>" + head + "</th>' + (t && t.checks ? "<th>Rule</th>" : "") + "</tr>" +
    keys.map((k) => "<tr><td><code>{{" + k + "}}</code></td><td>" + esc(vars[k]) + "</td>" + (t && t.checks ? "<td><code>" + esc(t.checks[k] || "") + "</code></td>" : "") + "</tr>").join("") + "</table>";
}
function show(n) {
  const m = msgs.find((x) => x.n === n);
  selected = n;
  if (!m) return;
  let h = whyBox(m);
  if (m.ok === false) h += '<div class="errbox">Delivery failed (as the real provider would refuse it): ' + esc(m.error) + "</div>";
  if (m.channel === "email") {
    h += '<div class="mail"><div class="mail-head"><h2>' + esc(m.subject) + '</h2><div class="from"><div class="avatar">S</div><div><b>Simba Tasker</b> &lt;' + esc(m.from) +
      "&gt;<br><span style='color:var(--muted)'>to " + esc(m.to) + " · " + new Date(m.ts).toLocaleString() + '</span></div></div></div><iframe id="mailframe" sandbox="allow-same-origin allow-popups"></iframe></div>';
    $("#view").innerHTML = h;
    const f = $("#mailframe");
    f.srcdoc = m.html || "<pre>" + esc(m.body) + "</pre>";
    f.onload = () => { try { f.style.height = f.contentDocument.documentElement.scrollHeight + 20 + "px"; } catch {} };
  } else if (m.channel === "whatsapp") {
    const t = templates.find((x) => x.name === m.template_name);
    h += '<div class="cols">' + phone(m, { title: "Simba Tasker", sub: "WhatsApp Business · to " + m.to, body: m.body || "(not delivered)" }) +
      '<div class="tpl-info"><div class="meta"><div><span>Template</span><b>' + esc(m.template_name || "—") + "</b></div><div><span>Category</span>" + esc(t ? t.category : "") +
      "</div><div><span>Content SID</span><code>" + esc(m.contentSid) + "</code></div><div><span>Live env</span><code>" + esc(t ? t.env || "" : "") + "</code></div><div><span>Sent by</span>" + esc(t ? t.sent_by : "") +
      "</div></div>" + varsTable(t, m.variables) + (t ? '<p class="count">Template body as approved by Meta:</p><div class="raw">' + esc(t.body) + "</div>" : "") + "</div></div>";
    $("#view").innerHTML = h;
  } else if (m.channel === "sms") {
    h += '<div class="cols">' + phone(m, { title: "SimbaTasker", sub: "Text message · to " + m.to, body: m.body || "", sms: true }) +
      '<div class="tpl-info"><div class="meta"><div><span>To</span>' + esc(m.to) + "</div><div><span>From</span>" + esc(m.from || "") + "</div></div></div></div>";
    $("#view").innerHTML = h;
  } else {
    h += '<div class="cols"><div class="phone sms"><div class="chat"><div class="bubble" style="background:#f2f2f7"><b>' + esc(m.title) + "</b>\n" + esc(m.body) +
      '</div></div></div><div class="tpl-info"><p class="count">Push notification (Firebase) — data payload:</p><div class="raw">' + esc(JSON.stringify(m.data, null, 2)) + "</div></div></div>";
    $("#view").innerHTML = h;
  }
  list();
}
function nowBar(d) {
  if (!d.now) return;
  const p = d.now;
  $("#now").innerHTML = "<span>Running <b>" + esc(p.stage) + '</b></span><span class="t">' + d.checks + ' checks · <span class="' + (d.fails ? "bad" : "ok") + '">' + d.fails + " failed</span></span>" +
    "<span>" + (p.kind === "check" ? '<span class="' + (p.ok ? "ok" : "bad") + '">' + (p.ok ? "✔ " : "✘ ") + "</span>" + esc(p.text) : "▶ " + esc(p.text)) + "</span>" +
    '<span style="margin-left:auto">' + msgs.length + " messages captured</span>";
}
async function poll() {
  try {
    const d = await (await fetch("/api/outbox")).json();
    msgs = d.messages;
    nowBar(d);
    if (msgs.length !== lastCount) {
      lastCount = msgs.length;
      filters();
      if (follow && msgs.length) {
        const shown = msgs.filter((m) => filter === "all" || (filter === "failed" ? m.ok === false : m.channel === filter));
        if (shown.length) show(shown[shown.length - 1].n); else list();
      } else list();
      if (!$("#mail").hidden) renderMailCat();
    }
  } catch {}
  setTimeout(poll, 1500);
}
function renderTemplates() {
  $("#tplgrid").innerHTML = templates.map((t) => {
    const body = t.body.replace(/\{\{(\d+)\}\}/g, (_, k) => t.variables[k]);
    const used = msgs.filter((m) => m.template_name === t.name).length;
    return '<div class="card"><div><h3>' + esc(t.name) + '</h3><div class="sub"><span class="pill">' + esc(t.category) + "</span>" + (t.existing ? '<span class="pill">already live</span>' : '<span class="pill">new — submit with --create</span>') +
      '</div></div><div class="sub">' + esc(t.sent_by) + "</div>" + phone(null, { title: "Simba Tasker", sub: "WhatsApp Business · sample", body }) +
      '<div class="raw">' + esc(t.body) + "</div>" + varsTable(t, t.variables, "Sample value") + '<div class="count">Env: <code>' + esc(t.env) + "</code> · sent " + used + " time(s) in this run</div></div>";
  }).join("");
}
function renderMailCat() {
  const by = new Map();
  for (const m of msgs) if (m.channel === "email" && m.ok !== false) {
    const key = (m.subject || "").replace(/[0-9a-f]{24}|\d{4,}|[\w.+-]+@[\w.-]+/gi, "…").replace(/\b[A-Z0-9]{8,}\b/g, "…");
    if (!by.has(key)) by.set(key, { m, count: 0 });
    by.get(key).count++;
  }
  if (!by.size) { $("#mailcat").innerHTML = '<div class="empty">Each distinct email (one example per kind) appears here once the run sends it.</div>'; return; }
  $("#mailcat").innerHTML = '<p class="count">' + by.size + " different emails captured — one real example of each, as the inbox shows it.</p>" +
    [...by.values()].map(({ m, count }, i) => '<div class="mail"><div class="mail-head"><h2>' + esc(m.subject) + '</h2><div class="from"><div class="avatar">S</div><div><b>Simba Tasker</b> &lt;' + esc(m.from) +
      "&gt;<br><span style='color:var(--muted)'>e.g. to " + esc(m.to) + " · sent " + count + " time(s) · " + esc(m.step.stage || "") + " › " + esc(m.step.section || "") + '</span></div></div></div><iframe data-i="' + i + '" sandbox="allow-same-origin allow-popups"></iframe></div>').join("");
  const vals = [...by.values()];
  document.querySelectorAll("#mailcat iframe").forEach((f) => {
    const m = vals[+f.dataset.i].m;
    f.srcdoc = m.html || "<pre>" + esc(m.body) + "</pre>";
    f.onload = () => { try { f.style.height = f.contentDocument.documentElement.scrollHeight + 20 + "px"; } catch {} };
  });
}
document.addEventListener("click", (e) => {
  const it = e.target.closest(".item");
  if (it) { follow = false; filters(); show(+it.dataset.n); return; }
  const fb = e.target.closest("[data-f]");
  if (fb) { filter = fb.dataset.f; filters(); list(); return; }
  const tb = e.target.closest("[data-tab]");
  if (tb) {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b === tb));
    ["live", "wa", "mail"].forEach((id) => ($("#" + id).hidden = id !== tb.dataset.tab));
    if (tb.dataset.tab === "wa") renderTemplates();
    if (tb.dataset.tab === "mail") renderMailCat();
  }
});
document.addEventListener("change", (e) => { if (e.target.id === "follow") follow = e.target.checked; });
fetch("/api/templates").then((r) => r.json()).then((d) => { templates = d.templates || []; renderTemplates(); }).finally(poll);
</script></body></html>`;
