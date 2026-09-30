/**
 * Ensures setupProxy registers Socket.IO forwarding without stealing CRA HMR /ws.
 */
const path = require("path");

describe("setupProxy socket.io", () => {
  it("registers /socket.io proxy with websocket support and a concrete target", () => {
    const mounts = [];
    const fakeApp = {
      use(...args) {
        if (typeof args[0] === "string") {
          mounts.push({ route: args[0], middleware: args[1] });
        } else {
          mounts.push({
            route: args[0]?.__context || "(filter)",
            middleware: args[0],
          });
        }
      },
    };

    jest.isolateModules(() => {
      jest.doMock("http-proxy-middleware", () => ({
        createProxyMiddleware: (pathOrOpts, maybeOpts) => {
          const context =
            typeof pathOrOpts === "string" ? pathOrOpts : null;
          const opts =
            typeof pathOrOpts === "string" ? maybeOpts : pathOrOpts;
          const fn = () => {};
          fn.__opts = opts;
          fn.__context = context;
          fn.__ws = Boolean(opts?.ws);
          return fn;
        },
      }));
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const setupProxy = require(path.join(__dirname, "setupProxy.js"));
      setupProxy(fakeApp);
    });

    expect(mounts.some((m) => m.route === "/api")).toBe(true);
    expect(mounts.some((m) => m.route === "/public")).toBe(true);

    const socketMount = mounts.find(
      (m) =>
        m.route === "/socket.io" ||
        m.middleware?.__context === "/socket.io"
    );
    expect(socketMount).toBeTruthy();
    expect(socketMount.middleware.__ws).toBe(true);
    expect(socketMount.middleware.__opts.target).toMatch(/4041/);
    // Must not register a bare /ws proxy (CRA HMR)
    expect(mounts.some((m) => m.route === "/ws")).toBe(false);
  });
});
