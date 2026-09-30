import {
  statusOptionsForAsset,
  coerceStatusSelection,
  remainingLabel,
  isLiveAvailabilityState,
  OPERATOR_STATUS_OPTIONS,
} from "./logisticsOperatorStatus";

describe("logisticsOperatorStatus", () => {
  it("allows returning_empty for trucks", () => {
    const opts = statusOptionsForAsset({ kind: "vehicle" });
    expect(opts.some((o) => o.value === "returning_empty")).toBe(true);
  });

  it("trucks get available now / return empty / offline only", () => {
    const opts = statusOptionsForAsset({ kind: "vehicle" });
    expect(opts.map((o) => o.value)).toEqual([
      "available_now",
      "returning_empty",
      "offline",
    ]);
  });

  it("equipment gets all four incl. scheduled and return empty", () => {
    const opts = statusOptionsForAsset({ kind: "equipment" });
    expect(opts.length).toBe(OPERATOR_STATUS_OPTIONS.length);
    expect(opts.some((o) => o.value === "returning_empty")).toBe(true);
    expect(opts.find((o) => o.value === "available_tomorrow").label).toBe(
      "Scheduled"
    );
  });

  it("coerces scheduled when switching to a truck", () => {
    const opts = statusOptionsForAsset({ kind: "vehicle" });
    expect(coerceStatusSelection("available_tomorrow", opts)).toBe(
      "available_now"
    );
  });

  it("keeps returning_empty when still valid", () => {
    const opts = statusOptionsForAsset({ kind: "vehicle" });
    expect(coerceStatusSelection("returning_empty", opts)).toBe(
      "returning_empty"
    );
  });

  it("treats returning_empty as a live status", () => {
    expect(isLiveAvailabilityState("returning_empty")).toBe(true);
    expect(isLiveAvailabilityState("offline")).toBe(false);
  });

  it("remainingLabel handles expired and missing until", () => {
    expect(remainingLabel(null)).toBe(null);
    expect(remainingLabel("not-a-date")).toBe(null);
    expect(remainingLabel(new Date(Date.now() - 60000).toISOString())).toBe(
      "Expired"
    );
  });
});
