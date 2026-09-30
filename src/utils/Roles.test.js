import {
  ACTIVE_MODULE_KEY,
  canHubConsume,
  getActiveModule,
  homeRouteForRole,
  isCorporateRole,
  isLogisticsDriver,
  isLogisticsOwner,
  isLogisticsRole,
  isServiceProviderRole,
  normalizeRole,
  Roles,
  setActiveModule,
} from "./Roles";

describe("normalizeRole", () => {
  it("parses numeric and string role values", () => {
    expect(normalizeRole("3")).toBe(Roles.CORPORATE);
    expect(normalizeRole(2)).toBe(Roles.SERVICE_PROVIDER);
    expect(normalizeRole("1")).toBe(Roles.CUSTOMER);
    expect(normalizeRole("4")).toBe(Roles.LOGISTICS);
  });

  it("returns null for invalid roles", () => {
    expect(normalizeRole("bad")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
  });
});

describe("role helpers", () => {
  it("detects corporate role from query string", () => {
    expect(isCorporateRole("3")).toBe(true);
    expect(isCorporateRole(3)).toBe(true);
    expect(isCorporateRole("2")).toBe(false);
  });

  it("detects service provider role", () => {
    expect(isServiceProviderRole("2")).toBe(true);
    expect(isServiceProviderRole("3")).toBe(false);
  });

  it("detects logistics owner vs driver", () => {
    expect(isLogisticsRole(4)).toBe(true);
    expect(isLogisticsOwner(4, null)).toBe(true);
    expect(isLogisticsOwner(4, "abc")).toBe(false);
    expect(isLogisticsDriver(4, "abc")).toBe(true);
  });

  it("grants hub.consume for roles 1-3", () => {
    expect(canHubConsume(1)).toBe(true);
    expect(canHubConsume(2)).toBe(true);
    expect(canHubConsume(3)).toBe(true);
    expect(canHubConsume(4, [])).toBe(false);
    expect(canHubConsume(4, ["hub.consume"])).toBe(true);
  });

  it("routes logistics homes correctly", () => {
    expect(homeRouteForRole(4, null)).toBe("/logistics/owner");
    expect(homeRouteForRole(4, "d1")).toBe("/logistics/driver");
    expect(homeRouteForRole(2)).toBe("/requests");
  });
});

describe("active module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to tasker and persists logistics", () => {
    expect(getActiveModule()).toBe("tasker");
    expect(setActiveModule("logistics")).toBe("logistics");
    expect(localStorage.getItem(ACTIVE_MODULE_KEY)).toBe("logistics");
    expect(getActiveModule()).toBe("logistics");
  });
});
