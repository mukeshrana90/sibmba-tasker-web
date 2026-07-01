import { buildLocalLocationPredictions } from "./landingLocationPredictions";

describe("buildLocalLocationPredictions", () => {
  it("returns Zimbabwe cities matching the query", () => {
    const results = buildLocalLocationPredictions("har");
    expect(results.some((r) => r.description.includes("Harare"))).toBe(true);
  });

  it("returns empty array when nothing matches", () => {
    expect(buildLocalLocationPredictions("zzzz")).toEqual([]);
  });
});
