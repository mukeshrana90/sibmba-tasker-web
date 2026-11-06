import { countWords, limitWords, SERVICE_NAME_MAX_WORDS } from "./landingUtils";

const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

describe("countWords", () => {
  it("ignores extra spaces and line breaks", () => {
    expect(countWords("  Emergency   plumbing \r\n repairs ")).toBe(3);
    expect(countWords("")).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });
});

describe("limitWords", () => {
  it("keeps names up to the cap unchanged", () => {
    expect(limitWords(words(SERVICE_NAME_MAX_WORDS))).toEqual({
      display: words(11),
      full: words(11),
      truncated: false,
    });
  });

  it("cuts longer names with an ellipsis and keeps the full text", () => {
    const r = limitWords(words(12));
    expect(r.truncated).toBe(true);
    expect(r.display).toBe(`${words(11)}…`);
    expect(r.full).toBe(words(12));
  });

  it("drops trailing punctuation before the ellipsis", () => {
    const r = limitWords("Cleaning, hygiene & supplies, plumbing, painting", 3);
    expect(r.display).toBe("Cleaning, hygiene…");
  });
});
