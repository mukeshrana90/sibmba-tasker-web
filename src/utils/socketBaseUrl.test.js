import { DEV_PROXY_SOCKET_PATH, getSocketBaseUrl } from "./socketBaseUrl";

describe("getSocketBaseUrl", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { origin: "https://localhost:3001" };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it("uses same-origin when REACT_APP_API_URLL is empty", () => {
    expect(getSocketBaseUrl("")).toBe("https://localhost:3001");
  });

  it("uses same-origin when REACT_APP_API_URLL is /", () => {
    expect(getSocketBaseUrl("/")).toBe("https://localhost:3001");
  });

  it("keeps absolute backend URL without trailing slash", () => {
    expect(getSocketBaseUrl("http://127.0.0.1:4041/")).toBe(
      "http://127.0.0.1:4041"
    );
  });

  it("documents that CRA must proxy /socket.io", () => {
    expect(DEV_PROXY_SOCKET_PATH).toBe("/socket.io");
  });
});
