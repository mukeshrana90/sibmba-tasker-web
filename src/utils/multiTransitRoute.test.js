import {
  buildNearestMultiTransitRoute,
  haversineKm,
  planWaypoints,
  stopIconState,
} from "./multiTransitRoute";

describe("multiTransitRoute", () => {
  const truck = { lat: 30.7, lng: 76.7 };

  const jobs = [
    {
      _id: "a",
      status: 1,
      job_number: "JOBA",
      pickup: { address: "Near truck", coordinates: [76.71, 30.701] },
      dropoff: { address: "Far drop A", coordinates: [76.9, 30.9] },
    },
    {
      _id: "b",
      status: 1,
      job_number: "JOBB",
      pickup: { address: "Far pick B", coordinates: [76.85, 30.85] },
      dropoff: { address: "Near drop B", coordinates: [76.705, 30.702] },
    },
  ];

  it("starts with nearest open stop from truck", () => {
    const plan = buildNearestMultiTransitRoute(jobs, truck);
    expect(plan.stops[0].jobId).toBe("a");
    expect(plan.stops[0].kind).toBe("pickup");
  });

  it("unlocks drop only after same-job pickup", () => {
    const plan = buildNearestMultiTransitRoute(jobs, truck);
    const firstDropIdx = plan.stops.findIndex(
      (s) => s.jobId === "a" && s.kind === "dropoff"
    );
    const pickAIdx = plan.stops.findIndex(
      (s) => s.jobId === "a" && s.kind === "pickup"
    );
    expect(pickAIdx).toBeGreaterThanOrEqual(0);
    expect(firstDropIdx).toBeGreaterThan(pickAIdx);
  });

  it("for loaded jobs only plans dropoff", () => {
    const plan = buildNearestMultiTransitRoute(
      [{ ...jobs[0], status: 4 }],
      truck
    );
    expect(plan.stops).toHaveLength(1);
    expect(plan.stops[0].kind).toBe("dropoff");
  });

  it("marks pick done at status >= 3 and drop done at >= 5", () => {
    expect(stopIconState({ status: 2 }, "pickup")).toBe("active");
    expect(stopIconState({ status: 3 }, "pickup")).toBe("done");
    expect(stopIconState({ status: 4 }, "dropoff")).toBe("active");
    expect(stopIconState({ status: 5 }, "dropoff")).toBe("done");
  });

  it("haversine is symmetric-ish", () => {
    const d = haversineKm(truck, { lat: 30.71, lng: 76.71 });
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(5);
  });

  it("planWaypoints is truck then stops in order", () => {
    const plan = buildNearestMultiTransitRoute(jobs, truck);
    const pts = planWaypoints(plan);
    expect(pts[0]).toEqual({ lat: truck.lat, lng: truck.lng });
    expect(pts.length).toBe(1 + plan.stops.length);
    expect(pts[1].lat).toBe(plan.stops[0].lat);
  });
});
