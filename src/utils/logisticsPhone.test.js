import { splitPhoneValue } from "./logisticsPhone";
import { isPlanBucketFull } from "./logisticsPlan";

describe("logistics phone value", () => {
  it("splits dial code and local number", () => {
    expect(splitPhoneValue("+263 77 222 3344", "263")).toEqual({ country_code: "+263", phone_number: "772223344" });
    expect(splitPhoneValue("+91 98745 00000", "91")).toEqual({ country_code: "+91", phone_number: "9874500000" });
    expect(splitPhoneValue("+263", "263")).toEqual({ country_code: "+263", phone_number: "" });
    expect(splitPhoneValue("0772223344", "", "+27")).toEqual({ country_code: "+27", phone_number: "0772223344" });
  });
});

describe("isPlanBucketFull", () => {
  const sub = (used, max) => ({ plan: { limits: { operators: max } }, usage: { operators: used } });
  it("locks only when a limited bucket is used up", () => {
    expect(isPlanBucketFull(sub(2, 2), "operators")).toBe(true);
    expect(isPlanBucketFull(sub(3, 2), "operators")).toBe(true);
    expect(isPlanBucketFull(sub(1, 2), "operators")).toBe(false);
    expect(isPlanBucketFull(sub(50, null), "operators")).toBe(false);
    expect(isPlanBucketFull(null, "operators")).toBe(false);
  });
});
