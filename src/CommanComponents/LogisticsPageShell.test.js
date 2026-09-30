/**
 * Pure helper tests for LogisticsPageShell supply detection.
 * Kept separate from source-contract tests so CRA can run them with babel.
 */
function isSupplyShell({ homeTo, midCrumb, hideBanner }) {
  if (hideBanner === true) return true;
  if (hideBanner === false) return false;
  const home = String(homeTo || "");
  const mid = String(midCrumb?.label || "");
  return (
    home.includes("/logistics/owner") ||
    home.includes("/logistics/driver") ||
    mid === "Owner" ||
    mid === "Operator"
  );
}

describe("isSupplyShell", () => {
  it("hides banner for owner and operator homes", () => {
    expect(
      isSupplyShell({
        homeTo: "/logistics/owner",
        midCrumb: { label: "Owner" },
      })
    ).toBe(true);
    expect(
      isSupplyShell({
        homeTo: "/logistics/driver",
        midCrumb: { label: "Operator" },
      })
    ).toBe(true);
    expect(
      isSupplyShell({
        homeTo: "/logistics/owner/equipment",
        midCrumb: { label: "Fleet" },
      })
    ).toBe(true);
  });

  it("keeps banner for hub/customer logistics pages", () => {
    expect(
      isSupplyShell({
        homeTo: "/logistics",
        midCrumb: { label: "Logistics" },
      })
    ).toBe(false);
    expect(
      isSupplyShell({
        homeTo: "/logistics/jobs",
        midCrumb: { label: "Logistics" },
      })
    ).toBe(false);
  });

  it("respects explicit hideBanner override", () => {
    expect(
      isSupplyShell({
        homeTo: "/logistics",
        midCrumb: { label: "Logistics" },
        hideBanner: true,
      })
    ).toBe(true);
    expect(
      isSupplyShell({
        homeTo: "/logistics/owner",
        midCrumb: { label: "Owner" },
        hideBanner: false,
      })
    ).toBe(false);
  });
});
