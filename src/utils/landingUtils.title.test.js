import { formatDisplayTitle, providerDisplayName } from "./landingUtils";

describe("formatDisplayTitle", () => {
  it("capitalizes the first letter only", () => {
    expect(formatDisplayTitle("plumbing")).toBe("Plumbing");
    expect(formatDisplayTitle("graphic")).toBe("Graphic");
    expect(formatDisplayTitle("lock smiths")).toBe("Lock smiths");
    expect(formatDisplayTitle("heating & cooling")).toBe("Heating & cooling");
  });

  it("leaves already-capitalized titles unchanged", () => {
    expect(formatDisplayTitle("Electrician")).toBe("Electrician");
    expect(formatDisplayTitle("Land Surveyors")).toBe("Land Surveyors");
  });

  it("trims whitespace and handles empty values", () => {
    expect(formatDisplayTitle("  painter  ")).toBe("Painter");
    expect(formatDisplayTitle("", "Fallback")).toBe("Fallback");
    expect(formatDisplayTitle(null, "Fallback")).toBe("Fallback");
  });
});

describe("providerDisplayName", () => {
  it("capitalizes provider names", () => {
    expect(providerDisplayName({ company_name: "hero" })).toBe("Hero");
    expect(providerDisplayName({ full_name: "dessert" })).toBe("Dessert");
  });
});
