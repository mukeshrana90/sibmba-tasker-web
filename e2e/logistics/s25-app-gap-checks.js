/* Stage 25 — concerns from the app developer's gap request (5 Nov): server keep-alive (Q69), operator licence
   chip (Q64), unread after leaving an open thread (Q68), owner's own jobs in drive mode (Q70). */
const http = require("http");
const { io } = require(require.resolve("socket.io-client", { paths: [__dirname + "/../.."] }));
const L = require("./lib");
const F = require("./fleet-helpers");

const API_URL = new URL(L.API || process.env.E2E_API || "http://127.0.0.1:4099");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** One request on a keep-alive agent; resolves with the socket it used. */
const keepAliveGet = (agent) =>
  new Promise((resolve, reject) => {
    const req = http.get({ host: API_URL.hostname, port: API_URL.port, path: "/api/logistics/categories", agent }, (res) => {
      res.resume();
      res.on("end", () => resolve(req.socket));
    });
    req.on("error", reject);
  });

/** Let this actor's page use real chat sockets, against the test API. */
async function liveSockets(a) {
  const ws = `ws://${API_URL.host}`;
  await a.ctx.unroute(/\/socket\.io\//);
  await a.ctx.addInitScript((target) => {
    const Native = window.WebSocket;
    window.WebSocket = function (url, protocols) {
      const u = new URL(url, location.href);
      return new Native(u.pathname.startsWith("/socket.io") ? target + u.pathname + u.search : url, protocols);
    };
    Object.assign(window.WebSocket, Native);
    window.WebSocket.prototype = Native.prototype;
  }, ws);
}

const socketTo = () =>
  new Promise((resolve, reject) => {
    const s = io(API_URL.origin, { transports: ["websocket"], reconnection: false });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });

const unreadFrom = (reader, userId, peerId) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    reader.once("Get_chat_list", (data) => {
      clearTimeout(timer);
      const row = (data?.getdata || []).find((c) => JSON.stringify(c).includes(peerId));
      resolve(row ? Number(row.unreadCount) || 0 : null);
    });
    reader.emit("get_chat_list", { userid: userId });
  });

(async () => {
  const st = L.loadState();
  const RUN = st.RUN || "run";
  const C = L.cast(RUN);
  const stamp = Date.now();
  const actors = [];
  const A = async (name, user, opts) => {
    const a = await L.actor(name, opts);
    actors.push(a);
    if (user) await L.seedAuth(a, { token: user.token, user });
    return a;
  };
  const sockets = [];
  try {
    await F.resetPeople([C.slot("owner", "s25", 0).email, C.slot("operator", "s25", 0).email, C.slot("operator", "s25", 1).email]);
    L.sec("25a. Q69: an idle connection stays open longer than a file pick");
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const first = await keepAliveGet(agent);
    await wait(7000);
    L.check(!first.destroyed, "connection still open after 7 s idle");
    const second = await keepAliveGet(agent);
    L.check(first === second, "the next request reuses it");
    agent.destroy();

    L.sec("25b. Q64 (v2.7.66): owner's operator list names the rejected face photo");
    const owner = await F.makeOwner(C.slot("owner", "s25", 0));
    const T1 = await F.makeUnit(owner, C.unit("truck", 251), { body: { operated_by: "self" } });
    const T2 = await F.makeUnit(owner, C.unit("truck", 252));
    await L.verifyDocs("asset", T1._id);
    await L.verifyDocs("asset", T2._id);
    const op = await F.makeOperator(owner, C.slot("operator", "s25", 0), { assets: [T2._id] });
    const rejected = await F.makeOperator(owner, C.slot("operator", "s25", 1));
    await L.api("POST", "/admin/logistics/documents/review", { token: await L.adminToken(), body: { subject: "face_photo", id: rejected._id, status: "rejected", reason: "Face not clear" } });
    const rows = await L.api("GET", "/logistics/sub-users", { token: owner.token });
    const row = (rows?.data?.operators || []).find((x) => String(x._id) === rejected._id);
    L.check(row?.document_compliance?.block?.code === "DOC_REJECTED", "list row carries document_compliance.block", row?.document_compliance?.block);
    L.check(!!row?.document_compliance?.block?.label, "block has a label", row?.document_compliance?.block);
    const o = await A("owner", owner);
    await L.goto(o, "/logistics/owner/operators");
    await o.page.waitForSelector(".log-doc-status", { timeout: 15000 });
    const chips = await o.page.locator(".log-doc-status").allInnerTexts();
    L.check(chips.some((t) => /face photo rejected/i.test(t)), "chip names the face photo", chips);
    L.check(!chips.some((t) => /^\s*Document rejected/im.test(t)), "not a generic 'Document rejected'", chips);

    L.sec("25c. Q70: an owner in drive mode sees only their own jobs");
    await F.enableSelfOperator(owner);
    const self = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(self?.success !== false, "owner goes live on their unit", self?.message);
    await F.goLive(op, T2._id);
    const customer = await L.makeCustomer(`s25-${RUN}`);
    const ownGoods = `S25 own ${stamp}`;
    const fleetGoods = `S25 fleet ${stamp}`;
    const ownJob = await F.postJob(customer, { goods: ownGoods });
    const fleetJob = await F.postJob(customer, { goods: fleetGoods });
    const ownQuote = await F.quote(owner, ownJob, T1._id);
    const fleetQuote = await F.quote(op, fleetJob, T2._id);
    const idOf = (r) => r?.data?.quote?._id || r?.data?.quotation?._id || r?.data?._id;
    const a1 = await F.acceptQuote(customer, ownJob, idOf(ownQuote));
    const a2 = await F.acceptQuote(customer, fleetJob, idOf(fleetQuote));
    L.check(a1?.success !== false && a2?.success !== false, "both quotes accepted", [a1?.message, a2?.message]);
    const assignedAll = await L.api("GET", "/logistics/jobs/assigned?active=0&limit=50", { token: owner.token });
    const allText = JSON.stringify(assignedAll?.data?.data || []);
    L.check(allText.includes(ownGoods) && allText.includes(fleetGoods), "default list still returns the whole fleet (owner's fleet page)");
    await L.goto(o, "/logistics/owner/jobs");
    await o.page.waitForTimeout(2500);
    const fleetPage = await L.bodyText(o);
    L.check(fleetPage.includes(ownGoods) && fleetPage.includes(fleetGoods), "owner's fleet My Jobs shows both");
    await L.goto(o, "/logistics/driver/jobs");
    await o.page.waitForTimeout(2500);
    const drivePage = await L.bodyText(o);
    L.check(drivePage.includes(ownGoods), "drive mode My Jobs shows the owner's job");
    L.check(!drivePage.includes(fleetGoods), "drive mode My Jobs leaves out the operator's job");
    const opJobs = await L.api("GET", "/logistics/jobs/assigned?active=0&limit=50", { token: op.token });
    L.check(JSON.stringify(opJobs?.data?.data || []).includes(fleetGoods), "operator's own list unchanged");

    L.sec("25d. Q68: a message read in the open thread stays read after leaving");
    const customerSocket = await socketTo();
    sockets.push(customerSocket);
    customerSocket.emit("new_user_connect", { userid: customer._id });
    const say = (message) =>
      customerSocket.emit("send_message_new", { sender_id: customer._id, receiver_id: op._id, message, message_type: "0", module: "logistics" });
    say(`S25 first ${stamp}`);
    await wait(1500);
    const opPage = await A("operator-chat", null);
    await liveSockets(opPage);
    await L.seedAuth(opPage, { token: op.token, user: op });
    await opPage.page.evaluate(() => localStorage.setItem("activeModule", "logistics"));
    await L.goto(opPage, `/messages?userID=${customer._id}`);
    await opPage.page.waitForTimeout(4000);
    await L.shot(opPage, "s25-thread");
    L.check(await L.waitText(opPage, new RegExp(`S25 first ${stamp}`), 15000), "operator opens the thread");
    await opPage.page.waitForTimeout(2000);
    say(`S25 second ${stamp}`);
    const live = await L.waitText(opPage, new RegExp(`S25 second ${stamp}`), 15000);
    L.check(live, "second message appears live in the open thread");
    await opPage.page.waitForTimeout(1500);
    await L.goto(opPage, "/logistics/driver");
    await opPage.page.waitForTimeout(1500);
    const reader = await socketTo();
    sockets.push(reader);
    const unread = await unreadFrom(reader, op._id, customer._id);
    L.check(unread === 0, "unread is 0 after leaving the thread", unread);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s25-crash");
  }
  sockets.forEach((s) => s.close());
  F.pageChecks(actors);
  await L.done();
})();
