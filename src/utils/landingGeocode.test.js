import { resolveSearchCoords } from "./landingGeocode";

describe("resolveSearchCoords", () => {
  beforeEach(() => {
    localStorage.setItem("latitude", "28.7");
    localStorage.setItem("longitude", "76.7");
  });

  afterEach(() => {
    localStorage.removeItem("latitude");
    localStorage.removeItem("longitude");
  });

  it("returns null when location is empty and nearby is off", () => {
    expect(resolveSearchCoords("", false, { lat: 1, lng: 2 })).toBeNull();
    expect(resolveSearchCoords("   ", false, null)).toBeNull();
  });

  it("uses device coords when nearby is enabled", () => {
    expect(resolveSearchCoords("", true, null)).toEqual({
      lat: 28.7,
      lng: 76.7,
    });
  });

  it("geocodes known city names", () => {
    expect(resolveSearchCoords("Harare", false, null)).toEqual({
      lat: -17.8252,
      lng: 31.0335,
    });
  });
});
