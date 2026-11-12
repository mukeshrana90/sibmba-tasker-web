import { hasReviews, ratingLabel } from "./ratingLabel";

describe("ratingLabel", () => {
  it("shows New with no reviews", () => {
    expect(ratingLabel(0, 0)).toBe("New");
    expect(ratingLabel(undefined, undefined)).toBe("New");
    expect(ratingLabel(0)).toBe("New");
    expect(ratingLabel(null, null)).toBe("New");
  });

  it("a count of 0 wins over a stray average", () => {
    expect(hasReviews(4.2, 0)).toBe(false);
    expect(ratingLabel(4.2, 0)).toBe("New");
  });

  it("falls back to the average when no count is supplied", () => {
    expect(ratingLabel(4.25)).toBe("4.3");
    expect(ratingLabel("3", null)).toBe("3.0");
  });

  it("formats a rated item with an optional suffix", () => {
    expect(ratingLabel(4.5, 2)).toBe("4.5");
    expect(ratingLabel(4.5, 2, " ★")).toBe("4.5 ★");
  });
});
