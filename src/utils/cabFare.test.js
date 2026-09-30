import { estimateRideFare } from "./cabFare";

const CAR = { fare: { min_per_km: 1.1, max_per_km: 1.5, min_fare: 3 } };
const BIKE = { fare: { min_per_km: 0.25, max_per_km: 0.5, min_fare: 1 } };
const A = [76.7789, 30.7415];
const B = [76.801, 30.7058];

test("car minimum is distance × rate, same as backend", () => {
  const e = estimateRideFare(CAR, A, B, 1.3);
  expect(e.distance_km).toBe(5.8);
  expect(e.min_fare).toBe(6.4);
  expect(e.max_fare).toBe(8.7);
  expect(e.fare_floor).toBe(3);
});

test("short ride uses the class floor", () => {
  expect(estimateRideFare(BIKE, A, [76.78, 30.745], 1.3).min_fare).toBe(1);
});

test("no estimate without both points", () => {
  expect(estimateRideFare(CAR, A, null)).toBeNull();
});
