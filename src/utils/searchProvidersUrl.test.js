import {
  buildSearchProvidersApiPayload,
  buildSearchProvidersParams,
  parseSearchProvidersQuery,
} from "./searchProvidersUrl";

describe("buildSearchProvidersApiPayload", () => {
  it("never includes location text", () => {
    const payload = buildSearchProvidersApiPayload({
      search: "plu",
      location: "Harare",
      lat: 30.69,
      lng: 76.73,
    });
    expect(payload.search).toBe("plu");
    expect(payload.lat).toBe(30.69);
    expect(payload.lng).toBe(76.73);
    expect(payload.location).toBeUndefined();
  });

  it("omits lat/lng when coords are missing", () => {
    const payload = buildSearchProvidersApiPayload({
      search: "plu",
      location: "Harare",
    });
    expect(payload.lat).toBeUndefined();
    expect(payload.lng).toBeUndefined();
  });
});

describe("buildSearchProvidersParams", () => {
  it("omits lat/lng when location and nearby are absent", () => {
    const params = buildSearchProvidersParams({
      search: "plumber",
      lat: 28.7,
      lng: 76.7,
    });
    expect(params.get("search")).toBe("plumber");
    expect(params.get("lat")).toBeNull();
    expect(params.get("lng")).toBeNull();
  });

  it("includes lat/lng when location is set", () => {
    const params = buildSearchProvidersParams({
      search: "plumber",
      location: "Harare",
      lat: -17.8,
      lng: 31.0,
    });
    expect(params.get("lat")).toBe("-17.8");
    expect(params.get("lng")).toBe("31");
  });
});

describe("parseSearchProvidersQuery", () => {
  it("ignores stale lat/lng when location is missing", () => {
    const params = new URLSearchParams("search=clean&lat=1&lng=2");
    expect(parseSearchProvidersQuery(params)).toMatchObject({
      search: "clean",
      location: "",
      lat: null,
      lng: null,
    });
  });
});
