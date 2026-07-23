import { formatDisplayTitle, providerDisplayName } from "./landingUtils";

describe("formatDisplayTitle", () => {
  it("title-cases all-lowercase labels", () => {
    expect(formatDisplayTitle("plumbing")).toBe("Plumbing");
    expect(formatDisplayTitle("graphic")).toBe("Graphic");
    expect(formatDisplayTitle("lock smiths")).toBe("Lock Smiths");
    expect(formatDisplayTitle("heating & cooling")).toBe("Heating & Cooling");
  });

  it("title-cases ALL CAPS so shouty provider text matches other cards", () => {
    expect(formatDisplayTitle("CENTRAL LOCKSMITH CAR KEY PROGRAMMING")).toBe(
      "Central Locksmith Car Key Programming"
    );
    expect(formatDisplayTitle("KEYLESS TECHNOLOGIES")).toBe(
      "Keyless Technologies"
    );
  });

  it("title-cases mixed input while keeping short acronyms", () => {
    expect(formatDisplayTitle("Electrician")).toBe("Electrician");
    expect(formatDisplayTitle("Land Surveyors")).toBe("Land Surveyors");
    expect(formatDisplayTitle("Keyless shop technologies")).toBe(
      "Keyless Shop Technologies"
    );
    expect(formatDisplayTitle("MTM carpenters")).toBe("MTM Carpenters");
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

  it("title-cases ALL CAPS company names", () => {
    expect(
      providerDisplayName({
        company_name: "CENTRAL LOCKSMITH CAR KEY PROGRAMMING",
      })
    ).toBe("Central Locksmith Car Key Programming");
  });

  it("title-cases mixed company names on search cards", () => {
    expect(providerDisplayName({ company_name: "MTM carpenters" })).toBe(
      "MTM Carpenters"
    );
    expect(providerDisplayName({ company_name: "Everythang Everywhere" })).toBe(
      "Everythang Everywhere"
    );
  });
});
