import {
  notBookableReason,
  photosMissingNote,
  unitMapTone,
  unitStatusChip,
  unitStatusKey,
} from "./ownerUnitStatus";

const unit = (customer_view, state = "available_now") => ({
  availability: { state },
  customer_view,
});

describe("unitStatusChip (doc 12 · L36)", () => {
  it("never says Available now for a unit with no operator", () => {
    const a = unit({ bookable: false, state: "offline", status_detail: "No operator assigned" });
    expect(unitStatusChip(a)).toEqual({ label: "Not bookable — no operator", tone: "closed" });
    expect(unitStatusKey(a)).toBe("not_bookable");
    expect(unitMapTone(a)).toBe("offline");
  });

  it("names the document that blocks the unit", () => {
    const a = unit({ bookable: false, state: "offline", status_detail: "Road licence (ZINARA) rejected" });
    expect(unitStatusChip(a).label).toBe("Not bookable — Road licence (ZINARA) rejected");
    expect(notBookableReason(a)).toBe("Not bookable — Road licence (ZINARA) rejected");
  });

  it("shows bookable states from the customer view", () => {
    expect(unitStatusChip(unit({ bookable: true, state: "available_now", raw_state: "available_now" })).label).toBe(
      "Available now"
    );
    expect(unitStatusChip(unit({ bookable: true, state: "on_job" })).label).toBe("On a job");
    expect(unitStatusChip(unit({ bookable: true, state: "available_now", raw_state: "returning_empty" })).label).toBe(
      "Returning empty"
    );
  });

  it("falls back to the stored state when the API sends no customer view", () => {
    expect(unitStatusChip({ availability: { state: "on_job" } }).label).toBe("On a job");
    expect(unitStatusChip({ availability: "offline" }).label).toBe("Offline");
    expect(unitMapTone({ availability: "on_job" })).toBeNull();
  });
});

describe("photosMissingNote (doc 12 · 4.3)", () => {
  it("warns below 2 photos only", () => {
    expect(photosMissingNote({ photos: ["a"] })).toMatch(/at least 2/);
    expect(photosMissingNote({ photos: ["a", "b"] })).toBe("");
  });
});
