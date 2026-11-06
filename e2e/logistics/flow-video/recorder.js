/* Records one role's browser as a sharp video: CDP screencast frames (only while .on) → ffmpeg → H.264 MP4.
 * Adds what a client needs to follow along: a large visible cursor that travels to each control before using it,
 * click ripples, slow typing, step captions and full-screen title cards. FAST=1 = dry run (no recording, no waits). */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FAST = !!process.env.FAST;
const PACE = { move: 850, settle: 350, after: 800, type: 70, scroll: 800, readBase: 1600, readPerChar: 42 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function overlayInit(role) {
  const mount = () => {
    if (window.__v?.host?.isConnected || !document.documentElement) return;
    const host = document.createElement("video-overlay");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      *{box-sizing:border-box;font-family:"Segoe UI",Roboto,"DejaVu Sans",Arial,sans-serif}
      #cur{position:fixed;left:0;top:0;width:38px;height:38px;z-index:5;pointer-events:none;transition:transform 850ms cubic-bezier(.45,.05,.3,1);will-change:transform;filter:drop-shadow(0 3px 5px rgba(0,0,0,.55))}
      #halo{position:fixed;left:-20px;top:-20px;width:44px;height:44px;border-radius:50%;background:rgba(255,190,0,.38);z-index:4;pointer-events:none;transition:transform 850ms cubic-bezier(.45,.05,.3,1)}
      .rip{position:fixed;width:18px;height:18px;margin:-9px;border-radius:50%;border:4px solid #ff8a00;z-index:6;pointer-events:none;animation:r 650ms ease-out forwards}
      @keyframes r{to{transform:scale(4.5);opacity:0}}
      #cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:1020px;background:rgba(15,23,42,.94);color:#fff;font-size:21px;line-height:1.35;font-weight:500;padding:13px 26px;border-radius:12px;border-left:6px solid #f59e0b;box-shadow:0 8px 28px rgba(0,0,0,.4);z-index:3;display:none;pointer-events:none;text-align:left}
      #tag{position:fixed;left:50%;transform:translateX(-50%);top:6px;background:#0f7a3f;color:#fff;font-size:13px;font-weight:600;padding:5px 12px;border-radius:20px;z-index:3;pointer-events:none;opacity:.94}
      #card{position:fixed;inset:0;background:linear-gradient(135deg,#0b3d2a,#0f7a3f);color:#fff;z-index:2;display:none;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:60px}
      #card .k{font-size:20px;letter-spacing:3px;text-transform:uppercase;color:#fde68a;margin-bottom:18px;font-weight:600}
      #card h1{font-size:50px;margin:0 0 24px;font-weight:700;line-height:1.15}
      #card p{font-size:26px;line-height:1.5;margin:0;max-width:1000px;color:#ecfdf5}
    </style>
    <div id="card"></div><div id="tag"></div><div id="cap"></div><div id="halo"></div>
    <svg id="cur" viewBox="0 0 24 24"><path d="M4 2l15.5 11.2-6.8 1 3.9 7.6-3 1.5-3.9-7.7L5 20.5z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    document.documentElement.appendChild(host);
    const $ = (id) => root.getElementById(id);
    window.__v = {
      host,
      move(x, y, ms) {
        $("cur").style.transitionDuration = `${ms}ms`; $("halo").style.transitionDuration = `${ms}ms`;
        $("cur").style.transform = `translate(${x}px,${y}px)`; $("halo").style.transform = `translate(${x}px,${y}px)`;
      },
      ripple(x, y) { const d = document.createElement("div"); d.className = "rip"; d.style.left = `${x}px`; d.style.top = `${y}px`; root.appendChild(d); setTimeout(() => d.remove(), 700); },
      caption(t) { $("cap").textContent = t || ""; $("cap").style.display = t ? "block" : "none"; },
      tag(t) { $("tag").textContent = t || ""; $("tag").style.display = t ? "block" : "none"; },
      card(k, h, p) { const c = $("card"); if (!h) { c.style.display = "none"; return; } c.innerHTML = `<div class="k">${k || ""}</div><h1>${h}</h1><p>${p || ""}</p>`; c.style.display = "flex"; },
    };
    window.__v.tag(role);
  };
  // The dev build's "Copy link" testing aid isn't in the production build: keep the video like production
  setInterval(() => {
    document.querySelectorAll("button").forEach((b) => { if (b.textContent.trim() === "Copy link") b.style.display = "none"; });
    document.querySelectorAll(".Toastify__toast-body div").forEach((d) => { if (/You can also copy the link/.test(d.textContent)) d.textContent = d.textContent.replace(/\s*You can also copy the link.*$/, ""); });
  }, 200);
  mount();
  document.addEventListener("DOMContentLoaded", mount);
  new MutationObserver(mount).observe(document, { childList: true });
}

class Rec {
  constructor(a, role, workDir) {
    this.a = a; this.role = role; this.dir = path.join(workDir, a.name); this.frames = []; this.on = false; this.n = 0;
    this.x = 640; this.y = 360; this.cap = "";
    fs.rmSync(this.dir, { recursive: true, force: true }); fs.mkdirSync(this.dir, { recursive: true });
    a.rec = this;
  }
  async attach() {
    const { a } = this;
    await a.ctx.addInitScript(overlayInit, this.role);
    await a.page.evaluate(overlayInit, this.role).catch(() => {});
    this.cdp = await a.ctx.newCDPSession(a.page);
    this.cdp.on("Page.screencastFrame", (f) => {
      this.cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
      if (!this.on) return;
      const file = path.join(this.dir, `${String(this.n++).padStart(7, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, "base64"));
      this.frames.push({ file, t: Date.now() });
    });
    a.page.on("domcontentloaded", () => this.restore());
  }
  async restore() {
    await this.a.page.evaluate(({ x, y, c }) => { window.__v?.move(x, y, 0); window.__v?.caption(c); }, { x: this.x, y: this.y, c: this.cap }).catch(() => {});
  }
  async start() {
    if (FAST) return;
    await this.restore();
    this.on = true;
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
    await this.nudge();
  }
  /** Make sure a frame exists (the screencast only sends frames on change). */
  async nudge() {
    await this.a.page.evaluate(() => { const v = window.__v; if (v?.host) { v.host.style.opacity = v.host.style.opacity === "0.999" ? "1" : "0.999"; } }).catch(() => {});
    await sleep(120);
  }
  async stop() {
    if (FAST || !this.on) return;
    await this.nudge();
    this.frames.push({ file: null, t: Date.now() }); // end of segment
    this.on = false;
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    this.cap = "";
    await this.a.page.evaluate(() => window.__v?.caption("")).catch(() => {});
  }
  /** One ffconcat list across all segments; the gap between segments is removed. */
  encode(out) {
    const lines = ["ffconcat version 1.0"]; let last = null;
    for (let i = 0; i < this.frames.length; i++) {
      const f = this.frames[i], next = this.frames[i + 1];
      if (!f.file) continue;
      const d = next ? Math.max(0.001, (next.t - f.t) / 1000) : 1;
      lines.push(`file '${f.file}'`, `duration ${d.toFixed(3)}`); last = f.file;
    }
    if (!last) throw new Error(`no frames for ${this.role}`);
    lines.push(`file '${last}'`);
    const list = path.join(this.dir, "list.ffconcat"); fs.writeFileSync(list, lines.join("\n"));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-safe", "0", "-f", "concat", "-i", list, "-vf", "fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-movflags", "+faststart", out], { stdio: "inherit" });
    return out;
  }
}

const live = (a) => !FAST && a?.rec?.on;
const hold = async (a, ms = 2000) => { if (live(a)) await sleep(ms); };

async function moveTo(a, x, y) {
  if (!live(a)) return;
  const dist = Math.hypot(x - a.rec.x, y - a.rec.y);
  const ms = Math.round(Math.min(1300, Math.max(450, PACE.move * (dist / 600))));
  a.rec.x = x; a.rec.y = y;
  await a.page.evaluate(({ x, y, ms }) => window.__v?.move(x, y, ms), { x, y, ms }).catch(() => {});
  await sleep(ms + PACE.settle);
  await a.page.mouse.move(x, y).catch(() => {});
}

/** Scroll the element into view smoothly, move the cursor onto it, optionally ripple. */
async function aim(a, loc, { ripple = true } = {}) {
  if (!live(a)) return;
  try {
    let h = await loc.elementHandle({ timeout: 12000 }).catch(() => null);
    if (!h) h = await loc.first().elementHandle({ timeout: 3000 });
    let box = await h.boundingBox();
    if (!box || !box.width) { // hidden file input → aim at its visible parent
      h = await h.evaluateHandle((e) => { let p = e; while (p && !(p.offsetWidth > 0)) p = p.parentElement; return p; });
      box = await h.asElement()?.boundingBox();
    }
    if (!box) return;
    const vp = a.page.viewportSize();
    if (box.y < 70 || box.y + box.height > vp.height - 100) {
      await h.evaluate((e) => e.scrollIntoView({ behavior: "smooth", block: "center" })).catch(() => {});
      await sleep(PACE.scroll);
      box = (await h.boundingBox()) || box;
    }
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await moveTo(a, x, y);
    if (ripple) { await a.page.evaluate(({ x, y }) => window.__v?.ripple(x, y), { x, y }).catch(() => {}); await sleep(220); }
  } catch { /* the real action below reports any real problem */ }
}

/** Caption + time to read it. */
async function say(a, text, extra = 0) {
  if (a?.page) { // the cab feature must never appear in a client video
    const seen = await a.page.evaluate(() => document.body?.innerText || "").catch(() => "");
    const hit = seen.match(/.{0,40}\b(cabs?|taxis?)\b.{0,40}/i);
    if (hit) console.log(`  ⚠ cab wording on ${a.name} ${a.page.url()}: ${hit[0]}`);
  }
  if (process.env.FAST && process.env.DEBUG_DIR && a?.page) { // dry run: a screenshot per step for review
    a.__s = (a.__s || 0) + 1;
    await a.page.screenshot({ path: path.join(process.env.DEBUG_DIR, `${a.name}-${String(a.__s).padStart(3, "0")}.jpg`), type: "jpeg", quality: 60 }).catch(() => {});
  }
  if (!live(a)) return;
  a.rec.cap = text;
  await a.page.evaluate((t) => window.__v?.caption(t), text).catch(() => {});
  await sleep(PACE.readBase + text.length * PACE.readPerChar + extra);
}
async function card(a, kicker, title, para, ms) {
  if (!live(a)) return;
  a.rec.cap = "";
  await a.page.evaluate(({ kicker, title, para }) => { window.__v?.caption(""); window.__v?.card(kicker, title, para); }, { kicker, title, para }).catch(() => {});
  await sleep(ms || 2600 + (title.length + (para || "").length) * 45);
  await a.page.evaluate(() => window.__v?.card()).catch(() => {});
  await sleep(400);
}
/** Slow scroll so the viewer can read a long page. */
async function pan(a, px = 500, ms = 2200) {
  if (!live(a)) return;
  await a.page.evaluate(([px, ms]) => {
    const t0 = performance.now(), y0 = window.scrollY;
    (function step(t) { const k = Math.min(1, (t - t0) / ms); window.scrollTo(0, y0 + px * (k * (2 - k))); if (k < 1) requestAnimationFrame(step); })(t0);
  }, [px, ms]).catch(() => {});
  await sleep(ms + 500);
}

/** Every Playwright click / fill / select on a page being recorded goes through the visible cursor. */
function patchPlaywright(pages, sample) {
  const LP = Object.getPrototypeOf(sample.locator("html")); const PP = Object.getPrototypeOf(sample);
  const who = (p) => pages.get(p);
  const orig = {}; for (const m of ["click", "fill", "check", "selectOption", "pressSequentially", "setInputFiles", "dispatchEvent"]) orig[m] = LP[m];
  LP.click = async function (o) { const a = who(this.page()); await aim(a, this); const r = await orig.click.call(this, o); await hold(a, PACE.after); return r; };
  LP.check = async function (o) { const a = who(this.page()); await aim(a, this); const r = await orig.check.call(this, o); await hold(a, PACE.after); return r; };
  LP.selectOption = async function (v, o) { const a = who(this.page()); await aim(a, this); const r = await orig.selectOption.call(this, v, o); await hold(a, PACE.after); return r; };
  LP.setInputFiles = async function (f, o) { const a = who(this.page()); await aim(a, this); const r = await orig.setInputFiles.call(this, f, o); await hold(a, 1200); return r; };
  LP.dispatchEvent = async function (t, i, o) { const a = who(this.page()); if (t === "mousedown") await aim(a, this); const r = await orig.dispatchEvent.call(this, t, i, o); await hold(a, PACE.after); return r; };
  LP.pressSequentially = async function (t, o) { const a = who(this.page()); await aim(a, this, { ripple: false }); return orig.pressSequentially.call(this, t, live(a) ? { ...o, delay: PACE.type } : o); };
  LP.fill = async function (v, o) {
    const a = who(this.page());
    if (!live(a)) return orig.fill.call(this, v, o);
    const type = await this.getAttribute("type", { timeout: 8000 }).catch(() => "");
    await aim(a, this);
    if (type === "date" || !v) { const r = await orig.fill.call(this, v, o); await hold(a, 500); return r; }
    await orig.fill.call(this, "", o);
    const r = await orig.pressSequentially.call(this, String(v), { delay: String(v).length > 40 ? 40 : PACE.type });
    await hold(a, 350);
    return r;
  };
  for (const m of ["click", "fill", "check"]) PP[m] = function (sel, ...args) { return this.locator(sel)[m](...args); };
}

module.exports = { Rec, FAST, hold, say, card, pan, aim, moveTo, patchPlaywright, sleep };
