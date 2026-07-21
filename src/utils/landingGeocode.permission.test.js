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

  it("returns Safari on iOS settings copy", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    expect(getLocationSettingsInstructions()).toMatch(/In Safari/i);
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: original,
    });
  });

  it("returns Chrome on iOS settings copy", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
    });
    expect(getLocationSettingsInstructions()).toMatch(/In Chrome/i);
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: original,
    });
  });
});
