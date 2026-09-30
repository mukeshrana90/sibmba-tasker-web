import {
  clearLogisticsSearchDraft,
  loadLogisticsSearchDraft,
  saveLogisticsSearchDraft,
} from "./logisticsSearchDraft";

const defaults = {
  category: "logistic",
  location: "",
  location_coords: null,
  radius_km: "50",
  name: "",
  truck_type: "",
  equipment: "",
  subtype: "",
};

describe("logisticsSearchDraft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trips location + coords", () => {
    saveLogisticsSearchDraft({
      ...defaults,
      location: "Sector 73, Mohali",
      location_coords: [76.70555, 30.72087],
      category: "agricultural",
      radius_km: "25",
    });
    const loaded = loadLogisticsSearchDraft(defaults);
    expect(loaded.location).toBe("Sector 73, Mohali");
    expect(loaded.location_coords).toEqual([76.70555, 30.72087]);
    expect(loaded.category).toBe("agricultural");
    expect(loaded.radius_km).toBe("25");
  });

  it("drops invalid coords", () => {
    saveLogisticsSearchDraft({
      ...defaults,
      location: "Somewhere",
      location_coords: ["bad", null],
    });
    const loaded = loadLogisticsSearchDraft(defaults);
    expect(loaded.location).toBe("");
    expect(loaded.location_coords).toBeNull();
  });

  it("clears draft", () => {
    saveLogisticsSearchDraft({
      ...defaults,
      location: "X",
      location_coords: [1, 2],
    });
    clearLogisticsSearchDraft();
    expect(loadLogisticsSearchDraft(defaults).location).toBe("");
  });
});
