/**
 * Dev proxy so HTTPS localhost can call the HTTP API without mixed-content blocks.
 * Targets REACT_APP_PROXY_TARGET or http://127.0.0.1:4041
 *
 * Socket.IO must be proxied with ws:true — but ONLY for /socket.io.
 * Do not use a catch-all websocket proxy: CRA HMR uses /ws and will spam
 * "proxying request .../ws to undefined" if stolen by HPM.
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  const target =
    process.env.REACT_APP_PROXY_TARGET || "http://127.0.0.1:4041";

  app.use(
    "/api",
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );

  app.use(
    "/public",
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );

  // Path as first argument so upgrade events only match /socket.io (not /ws HMR)
  app.use(
    createProxyMiddleware("/socket.io", {
      target,
      changeOrigin: true,
      ws: true,
      logLevel: "silent",
    })
  );
};
