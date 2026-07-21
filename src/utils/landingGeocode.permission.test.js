import {
  clearDeviceLocation,
  getLocationSettingsInstructions,
  getMobilePlatform,
} from "./landingGeocode";

describe("nearby location permission helpers", () => {
  afterEach(() => {
    clearDeviceLocation();
  });

  it("detects iOS user agents", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(getMobilePlatform()).toBe("ios");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: original,
    });
  });

  it("returns iOS settings copy", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(getLocationSettingsInstructions()).toMatch(/aA icon/i);
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: original,
    });
  });
});
