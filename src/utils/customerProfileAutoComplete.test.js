import {
  buildMinimalCustomerProfileFormData,
  customerDisplayName,
  emailUsernameFromEmail,
  finalizeCustomerSession,
  resolveCustomerEmail,
  sanitizeProfileValue,
} from "./customerProfileUtils";

describe("emailUsernameFromEmail", () => {
  it("uses the local part before @", () => {
    expect(emailUsernameFromEmail("john.doe@example.com")).toBe("John.doe");
    expect(emailUsernameFromEmail("cleanuser@test.co.zw")).toBe("Cleanuser");
  });

  it("returns User for invalid values", () => {
    expect(emailUsernameFromEmail("")).toBe("User");
    expect(emailUsernameFromEmail("undefined")).toBe("User");
  });
});

describe("sanitizeProfileValue", () => {
  it("treats undefined strings as empty", () => {
    expect(sanitizeProfileValue("undefined")).toBe("");
    expect(sanitizeProfileValue(null, "N/A")).toBe("N/A");
    expect(sanitizeProfileValue(" Harare ")).toBe("Harare");
  });
});

describe("customerDisplayName", () => {
  it("prefers full_name then email username", () => {
    expect(customerDisplayName({ full_name: "Jane Doe" })).toBe("Jane Doe");
    expect(customerDisplayName({ full_name: "undefined", email: "sam@test.com" })).toBe("Sam");
    expect(customerDisplayName({})).toBe("User");
  });
});

describe("resolveCustomerEmail", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads email from verify payload", () => {
    expect(resolveCustomerEmail({ email: "a@b.com" })).toBe("a@b.com");
  });

  it("falls back to signup cache", () => {
    localStorage.setItem(
      "signupFormData",
      JSON.stringify({ email: "cached@example.com" })
    );
    expect(resolveCustomerEmail({})).toBe("cached@example.com");
  });
});

describe("buildMinimalCustomerProfileFormData", () => {
  it("sends only full_name and is_completeProfile", () => {
    const formData = buildMinimalCustomerProfileFormData("Sam");
    expect(formData.get("full_name")).toBe("Sam");
    expect(formData.get("is_completeProfile")).toBe("1");
    expect(formData.get("address")).toBeNull();
  });
});

describe("finalizeCustomerSession", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("temptoken", "temp");
  });

  it("promotes temptoken to token and stores role", () => {
    finalizeCustomerSession({
      token: "token-1",
      userId: "user-1",
      role: 1,
      expiresAt: 123,
    });

    expect(localStorage.getItem("token")).toBe("token-1");
    expect(localStorage.getItem("userId")).toBe("user-1");
    expect(localStorage.getItem("role")).toBe("1");
    expect(localStorage.getItem("expiresAt")).toBe("123");
    expect(localStorage.getItem("temptoken")).toBeNull();
  });
});
