const fs = require("fs");
const path = require("path");

const STYLE_CSS = path.join(__dirname, "style.css");
const EDIT_COMPANY = path.join(
  __dirname,
  "../../Pages/EditProfileCompany.js"
);
const PROVIDER_FORM = path.join(
  __dirname,
  "../../CommanComponents/ProviderForm.jsx"
);

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function declaredZIndex(css, selector) {
  const escaped = selector.replace(/\./g, "\\.");
  const re = new RegExp(
    `${escaped}\\s*\\{[^}]*z-index\\s*:\\s*(\\d+)\\s*!important`,
    "i"
  );
  const match = css.match(re);
  return match ? Number(match[1]) : null;
}

describe("modal backdrop stacking (Select Address / fade show)", () => {
  let css;
  let editCompany;
  let providerForm;

  beforeAll(() => {
    css = read(STYLE_CSS);
    editCompany = read(EDIT_COMPANY);
    providerForm = read(PROVIDER_FORM);
  });

  test("documents why backdrop must stay below the modal", () => {
    expect(css).toMatch(/backdrop below modal/i);
    expect(css).toMatch(/untouchable under the fade overlay/i);
  });

  test(".modal-backdrop.show stays at Bootstrap backdrop layer (1050)", () => {
    expect(declaredZIndex(css, ".modal-backdrop.show")).toBe(1050);
  });

  test(".modal.show sits above the backdrop (1055)", () => {
    expect(declaredZIndex(css, ".modal.show")).toBe(1055);
  });

  test("backdrop z-index is strictly below modal z-index", () => {
    const backdrop = declaredZIndex(css, ".modal-backdrop.show");
    const modal = declaredZIndex(css, ".modal.show");
    expect(backdrop).toBeLessThan(modal);
  });

  test("location-permission modal stays above standard modals", () => {
    const permission = declaredZIndex(css, ".location-permission-modal.modal");
    const modal = declaredZIndex(css, ".modal.show");
    expect(permission).toBeGreaterThan(modal);
  });

  test("EditProfileCompany does not pin address modal under the backdrop (no zIndex: 1050)", () => {
    expect(editCompany).toMatch(/className=["']address-select-modal["']/);
    expect(editCompany).not.toMatch(
      /showAddressModal[\s\S]{0,400}style=\{\{\s*zIndex:\s*1050\s*\}\}/
    );
  });

  test("EditProfileCompany injects backdrop below address modal while open", () => {
    expect(editCompany).toMatch(
      /\.modal-backdrop\.show\s*\{\s*z-index:\s*1050\s*!important/
    );
    expect(editCompany).toMatch(
      /\.modal\.show\.address-select-modal\s*\{\s*z-index:\s*1055\s*!important/
    );
  });

  test("ProviderForm address modal keeps backdrop below dialog", () => {
    expect(providerForm).toMatch(/className=["']address-select-modal["']/);
    expect(providerForm).toMatch(
      /\.modal-backdrop\.show\s*\{\s*z-index:\s*1050\s*!important/
    );
    expect(providerForm).toMatch(
      /\.modal\.show\.address-select-modal\s*\{\s*z-index:\s*1055\s*!important/
    );
  });
});
