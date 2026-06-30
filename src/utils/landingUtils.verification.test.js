import {
  displayField,
  formatProviderPhone,
  isTruthyVerified,
  providerRoleLabel,
  verificationLabel,
  verificationPillClass,
} from "./landingUtils";

describe("verification helpers", () => {
  it("detects verified flags", () => {
    expect(isTruthyVerified(1)).toBe(true);
    expect(isTruthyVerified("1")).toBe(true);
    expect(isTruthyVerified(true)).toBe(true);
    expect(isTruthyVerified(0)).toBe(false);
    expect(isTruthyVerified(null)).toBe(false);
  });

  it("returns labels and pill classes", () => {
    expect(verificationLabel(1)).toBe("Verified");
    expect(verificationLabel(0)).toBe("Not Verified");
    expect(verificationPillClass(1)).toBe("verif-pill verified");
    expect(verificationPillClass(0)).toBe("verif-pill unverified");
  });
});

describe("provider profile display helpers", () => {
  it("formats empty fields as N/A", () => {
    expect(displayField(null)).toBe("N/A");
    expect(displayField("undefined")).toBe("N/A");
    expect(displayField("Sector 91 Road")).toBe("Sector 91 Road");
  });

  it("formats provider phone", () => {
    expect(
      formatProviderPhone({ country_code: "+91", phone_number: "9876542187" })
    ).toBe("+919876542187");
    expect(formatProviderPhone({})).toBe("N/A");
  });

  it("picks role label from identify_yourself or company", () => {
    expect(providerRoleLabel({ identify_yourself: "hero" })).toBe("hero");
    expect(providerRoleLabel({ company_name: "Acme" })).toBe("Acme");
    expect(providerRoleLabel({})).toBe("Service provider");
  });
});
