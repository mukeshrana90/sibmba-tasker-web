import {
  mergeLocationPredictions,
  fetchPhotonPredictions,
} from "./landingPlaces";

describe("mergeLocationPredictions", () => {
  it("orders Google first, then Photon, then local Zimbabwe fallback", () => {
    const merged = mergeLocationPredictions({
      googleItems: [
        { description: "Chandigarh, India", source: "google" },
        { description: "Chandler, AZ, USA", source: "google" },
      ],
      photonItems: [
        {
          description: "Changsha, China",
          source: "photon",
          lat: 28.2,
          lng: 112.9,
        },
      ],
      localItems: [{ description: "Chitungwiza, Zimbabwe", isLocal: true }],
    });

    expect(merged[0].source).toBe("google");
    expect(merged[merged.length - 1].description).toMatch(/Zimbabwe/);
    expect(merged).toHaveLength(4);
  });

  it("dedupes by description", () => {
    const merged = mergeLocationPredictions({
      googleItems: [{ description: "Harare, Zimbabwe", source: "google" }],
      photonItems: [{ description: "Harare, Zimbabwe", source: "photon" }],
      localItems: [{ description: "Harare, Zimbabwe", isLocal: true }],
    });
    expect(merged).toHaveLength(1);
  });
});

describe("fetchPhotonPredictions", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps worldwide Photon features without Zimbabwe-only filter", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [2.12, 49.12] },
            properties: {
              name: "Chanu",
              country: "France",
              countrycode: "FR",
              osm_id: 1,
              osm_type: "N",
            },
          },
          {
            geometry: { coordinates: [31.05, -17.89] },
            properties: {
              name: "Chitungwiza",
              country: "Zimbabwe",
              countrycode: "ZW",
              osm_id: 2,
              osm_type: "R",
            },
          },
        ],
      }),
    });

    const results = await fetchPhotonPredictions("chan", {
      worldwide: true,
      limit: 8,
    });

    expect(results).toHaveLength(2);
    expect(results[0].description).toMatch(/France/);
    expect(results[0].source).toBe("photon");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("photon.komoot.io")
    );
    expect(global.fetch.mock.calls[0][0]).not.toContain("bbox=");
  });

  it("returns empty array for single-character input without calling fetch", async () => {
    global.fetch = jest.fn();
    const results = await fetchPhotonPredictions("c", { worldwide: true });
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
