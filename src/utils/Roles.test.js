import {
  isCorporateRole,
  isServiceProviderRole,
  normalizeRole,
  Roles,
} from "./Roles";

describe("normalizeRole", () => {
  it("parses numeric and string role values", () => {
    expect(normalizeRole("3")).toBe(Roles.CORPORATE);
    expect(normalizeRole(2)).toBe(Roles.SERVICE_PROVIDER);
    expect(normalizeRole("1")).toBe(Roles.CUSTOMER);
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
});
