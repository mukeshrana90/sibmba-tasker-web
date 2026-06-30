import {
  buildSearchUrlWithoutQuery,
  isProviderSearchPath,
  readSearchFromUrl,
  resolveSearchSubmitCoords,
} from "./headerSearchSync";

describe("isProviderSearchPath", () => {
  it("matches customer and public provider search routes", () => {
    expect(isProviderSearchPath("/customer-search-providers")).toBe(true);
    expect(isProviderSearchPath("/search-providers")).toBe(true);
    expect(isProviderSearchPath("/services")).toBe(false);
  });
});

describe("readSearchFromUrl", () => {
  it("reads and decodes the search query param", () => {
    expect(readSearchFromUrl("?search=plumber")).toBe("plumber");
    expect(readSearchFromUrl("?search=clean%20ing")).toBe("clean ing");
  });

  it("returns empty string when search is missing", () => {
    expect(readSearchFromUrl("?location=Harare")).toBe("");
  });
});

describe("buildSearchUrlWithoutQuery", () => {
  it("removes only the search param and keeps the rest", () => {
    expect(
      buildSearchUrlWithoutQuery(
        "/customer-search-providers",
        "?search=plu&location=Harare&lat=1&lng=2"
      )
    ).toBe("/customer-search-providers?location=Harare&lat=1&lng=2");
  });

  it("also drops stale coords when location is absent", () => {
    expect(
      buildSearchUrlWithoutQuery(
        "/customer-search-providers",
        "?search=plu&lat=1&lng=2"
      )
    ).toBe("/customer-search-providers");
  });

  it("returns pathname when no params remain", () => {
    expect(
      buildSearchUrlWithoutQuery("/customer-search-providers", "?search=plu")
    ).toBe("/customer-search-providers");
  });
});

describe("resolveSearchSubmitCoords", () => {
  it("clears coords when location is empty", () => {
    expect(
      resolveSearchSubmitCoords("", false, { lat: 1, lng: 2 })
    ).toEqual({ coords: null, nearby: false });
  });

  it("keeps coords when location text is present", () => {
    expect(
      resolveSearchSubmitCoords("Harare", true, { lat: -17.8, lng: 31.05 })
    ).toEqual({
      coords: { lat: -17.8, lng: 31.05 },
      nearby: true,
    });
  });
});
