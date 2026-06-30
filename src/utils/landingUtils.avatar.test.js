import { handleProviderAvatarError, handleReviewAvatarError, providerInitials } from "./landingUtils";

describe("handleProviderAvatarError", () => {
  it("hides the image and shows initials on the parent", () => {
    const parent = document.createElement("span");
    const img = document.createElement("img");
    parent.appendChild(img);

    handleProviderAvatarError({ currentTarget: img }, "RV");

    expect(img.style.display).toBe("none");
    expect(parent.textContent).toBe("RV");
    expect(img.onerror).toBeNull();
  });

  it("uses providerInitials default when initials omitted", () => {
    const parent = document.createElement("span");
    const img = document.createElement("img");
    parent.appendChild(img);

    handleProviderAvatarError({ currentTarget: img });

    expect(parent.textContent).toBe("SP");
  });

  it("does not throw when parentElement is missing", () => {
    const img = document.createElement("img");

    expect(() =>
      handleProviderAvatarError({ currentTarget: img }, "AB")
    ).not.toThrow();
    expect(img.style.display).toBe("");
  });

  it("does not throw when event or currentTarget is missing", () => {
    expect(() => handleProviderAvatarError(null, "AB")).not.toThrow();
    expect(() => handleProviderAvatarError({}, "AB")).not.toThrow();
  });
});

describe("providerInitials", () => {
  it("returns up to two uppercase initials", () => {
    expect(providerInitials("Rud Vinaya")).toBe("RV");
    expect(providerInitials("hero")).toBe("H");
  });
});

describe("handleReviewAvatarError", () => {
  it("shows a single initial for review cards", () => {
    const parent = document.createElement("span");
    const img = document.createElement("img");
    parent.appendChild(img);

    handleReviewAvatarError({ currentTarget: img }, "Test navi");

    expect(img.style.display).toBe("none");
    expect(parent.textContent).toBe("T");
  });

  it("does not throw when parent is missing", () => {
    const img = document.createElement("img");
    expect(() =>
      handleReviewAvatarError({ currentTarget: img }, "Veer")
    ).not.toThrow();
  });
});
