import { resolvePostLoginPath, safeReturnUrl } from "./authRedirect";
import { Roles } from "./Roles";
import {
  normalizeAuthPayload,
  persistLogisticsSession,
} from "./authSession";

describe("resolvePostLoginPath", () => {
  it("sends each role to its primary dashboard", () => {
    expect(resolvePostLoginPath({ role: Roles.CUSTOMER })).toBe("/");
    expect(resolvePostLoginPath({ role: Roles.SERVICE_PROVIDER })).toBe(
      "/requests"
    );
    expect(resolvePostLoginPath({ role: Roles.CORPORATE })).toBe("/corporate");
    expect(resolvePostLoginPath({ role: Roles.LOGISTICS })).toBe(
      "/logistics/owner"
    );
    expect(
      resolvePostLoginPath({ role: Roles.LOGISTICS, ownerId: "op1" })
    ).toBe("/logistics/driver");
  });

  it("keeps logistics deep links but ignores Tasker return for logistics", () => {
    expect(
      resolvePostLoginPath({
        role: Roles.LOGISTICS,
        returnUrl: "/logistics/owner/fleet",
      })
    ).toBe("/logistics/owner/fleet");
    expect(
      resolvePostLoginPath({
        role: Roles.LOGISTICS,
        returnUrl: "/",
      })
    ).toBe("/logistics/owner");
  });

  it("does not send Tasker roles into logistics supply portals", () => {
    expect(
      resolvePostLoginPath({
        role: Roles.CUSTOMER,
        returnUrl: "/logistics/owner",
      })
    ).toBe("/");
    expect(
      resolvePostLoginPath({
        role: Roles.CUSTOMER,
        returnUrl: "/logistics/search",
      })
    ).toBe("/logistics/search");
  });
});

describe("normalizeAuthPayload", () => {
  it("flattens logistics { token, user } responses", () => {
    const out = normalizeAuthPayload({
      data: {
        token: "t1",
        user: { _id: "u1", role: 4, owner_id: null },
      },
    });
    expect(out).toEqual({
      _id: "u1",
      role: 4,
      owner_id: null,
      token: "t1",
    });
  });

  it("passes through Tasker flat login payloads", () => {
    const out = normalizeAuthPayload({
      data: { _id: "c1", role: 1, token: "t2", email: "a@b.com" },
    });
    expect(out.token).toBe("t2");
    expect(out.role).toBe(1);
  });
});

describe("persistLogisticsSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores owner_id and logistics module for operators", () => {
    persistLogisticsSession({
      owner_id: "owner99",
      permissions: ["jobs.operate"],
      isSubscribed: 1,
      subscription_holder: "owner",
    });
    expect(localStorage.getItem("owner_id")).toBe("owner99");
    expect(localStorage.getItem("activeModule")).toBe("logistics");
    expect(localStorage.getItem("isSubscribed")).toBe("1");
  });

  it("clears owner_id for fleet owners", () => {
    localStorage.setItem("owner_id", "stale");
    persistLogisticsSession({ owner_id: null, permissions: [] });
    expect(localStorage.getItem("owner_id")).toBeNull();
    expect(localStorage.getItem("activeModule")).toBe("logistics");
  });
});

describe("safeReturnUrl", () => {
  it("rejects open redirects", () => {
    expect(safeReturnUrl("//evil.com")).toBeNull();
    expect(safeReturnUrl("https://evil.com")).toBeNull();
    expect(safeReturnUrl("/messages")).toBe("/messages");
  });
});
