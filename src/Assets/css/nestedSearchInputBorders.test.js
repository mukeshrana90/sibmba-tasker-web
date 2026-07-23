const fs = require("fs");
const path = require("path");

const STYLE_CSS = path.join(__dirname, "style.css");

/** Shells that own the visible border; nested inputs must not re-draw one. */
const NESTED_SEARCH_SELECTORS = [
  ".task-search input",
  ".app-search input",
  ".input-shell input",
];

function readStyleCss() {
  return fs.readFileSync(STYLE_CSS, "utf8");
}

function hasBoxShadowNoneOverride(css, selector) {
  // Allow whitespace / nesting; require box-shadow:none!important near the selector.
  const escaped = selector.replace(/\./g, "\\.");
  const re = new RegExp(
    `${escaped}[^{]*\\{[^}]*box-shadow\\s*:\\s*none\\s*!important`,
    "i"
  );
  return re.test(css);
}

describe("nested search input borders", () => {
  let css;

  beforeAll(() => {
    css = readStyleCss();
  });

  test("style.css documents the nested-shell override block", () => {
    expect(css).toMatch(/Nested inputs inside bordered shells/i);
  });

  test.each(NESTED_SEARCH_SELECTORS)(
    "%s clears global input box-shadow (!important)",
    (selector) => {
      expect(hasBoxShadowNoneOverride(css, selector)).toBe(true);
    }
  );

  test("global input still has a box-shadow (scoped shells override it)", () => {
    expect(css).toMatch(
      /(?:^|\n)input\s*\{\s*box-shadow:\s*0px 1px 2px 0px #1018280d\s*!important;/
    );
  });
});
