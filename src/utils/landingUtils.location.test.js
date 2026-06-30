import { shortenLocationLabel } from "./landingUtils";

describe("shortenLocationLabel", () => {
  it("keeps labels with three words or fewer unchanged", () => {
    expect(shortenLocationLabel("Harare, Zimbabwe")).toEqual({
      display: "Harare, Zimbabwe",
      full: "Harare, Zimbabwe",
    });
    expect(shortenLocationLabel("Gweru Central")).toEqual({
      display: "Gweru Central",
      full: "Gweru Central",
    });
  });

  it("truncates longer labels to three words with ellipsis", () => {
    const long =
      "Mohali Railway Station Rd, Phase 10, Sector 64, Sahibzada Ajit Singh Nagar, Punjab 160062, India";
    expect(shortenLocationLabel(long)).toEqual({
      display: "Mohali Railway Station...",
      full: long,
    });
  });

  it("handles empty values", () => {
    expect(shortenLocationLabel("")).toEqual({ display: "", full: "" });
    expect(shortenLocationLabel(null)).toEqual({ display: "", full: "" });
  });
});
