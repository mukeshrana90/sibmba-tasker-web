const fs = require("fs");
const path = require("path");

const FILES = {
  landing: path.join(__dirname, "landing.css"),
  style: path.join(__dirname, "style.css"),
  marketing: path.join(__dirname, "simba-marketing.css"),
};

function read(fileKey) {
  return fs.readFileSync(FILES[fileKey], "utf8");
}

function extractRuleBlock(css, selectorStart) {
  const idx = css.indexOf(selectorStart);
  if (idx < 0) return "";
  const open = css.indexOf("{", idx);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(idx, i + 1);
    }
  }
  return css.slice(idx, open + 200);
}

describe("search button hover matches Join As (no blink)", () => {
  let landing;
  let style;
  let marketing;

  beforeAll(() => {
    landing = read("landing");
    style = read("style");
    marketing = read("marketing");
  });

  test("landing Search uses solid Join As green, not a gradient", () => {
    const block = extractRuleBlock(landing, ".landing-search-btn {");
    expect(block).toMatch(/background:\s*#0f5c4c\s*!important/i);
    expect(block).not.toMatch(/linear-gradient/i);
  });

  test("landing Search hover darkens like Join As without transform blink", () => {
    expect(landing).toMatch(
      /\.landing-search-btn:hover[\s\S]*?background:\s*#0a4338\s*!important/i
    );
    expect(landing).toMatch(/\.landing-search-btn:hover[\s\S]*?color:\s*#fff\s*!important/i);
    expect(landing).toMatch(/\.landing-search-btn:hover[\s\S]*?transform:\s*none/i);
  });

  test("Join As hover remains solid darker green + white text", () => {
    expect(landing).toMatch(
      /\.landing-nav\s+\.landing-join-btn:hover[\s\S]*?background:\s*#0a4338\s*!important/i
    );
    expect(landing).toMatch(
      /\.landing-nav\s+\.landing-join-btn:hover[\s\S]*?color:\s*#fff\s*!important/i
    );
  });

  test("providers search page Search uses solid green (no gradient blink)", () => {
    expect(style).toMatch(/\.p-search\{[\s\S]*?\.search-btn\{[^}]*background:#0f5c4c/i);
    expect(style).toMatch(
      /\.p-search\{[\s\S]*?\.search-btn:hover[\s\S]*?background:#0a4338!important/i
    );
    expect(style).toMatch(
      /\.p-search\{[\s\S]*?\.search-btn:hover[\s\S]*?transform:none/i
    );
  });

  test("marketing layout Search hover keeps white text on darker green", () => {
    expect(marketing).toMatch(
      /\.simba-page\.p-search\s+\.search-btn:hover[\s\S]*?background:\s*#0a4338\s*!important/i
    );
    expect(marketing).toMatch(
      /\.simba-page\.p-search\s+\.search-btn:hover[\s\S]*?color:\s*#fff\s*!important/i
    );
  });
});
