/**
 * Unit tests for location modal close/cleanup helpers.
 * Avoid mounting Google Maps / Bootstrap portals (those caused removeChild crashes).
 */
import { restoreBodyScrollIfIdle } from "./BookingLocationPickerModal";
import fs from "fs";
import path from "path";

describe("restoreBodyScrollIfIdle", () => {
  afterEach(() => {
    document.body.className = "";
    document.body.style.cssText = "";
    document.body.querySelectorAll(".modal").forEach((el) => el.remove());
  });

  it("clears modal-open and scroll lock when no modal.show remains", () => {
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "17px";

    restoreBodyScrollIfIdle();

    expect(document.body.classList.contains("modal-open")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
  });

  it("keeps modal-open when another modal is still shown", () => {
    const modal = document.createElement("div");
    modal.className = "modal show";
    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    restoreBodyScrollIfIdle();

    expect(document.body.classList.contains("modal-open")).toBe(true);
  });
});

describe("BookingLocationPickerModal source contracts", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "BookingLocationPickerModal.jsx"),
    "utf8"
  );

  it("does not manually remove React-managed backdrop nodes", () => {
    expect(src).toContain("animation={false}");
    expect(src).toContain("onExited={restoreBodyScrollIfIdle}");
    expect(src).toContain("replaceChildren");
    expect(src).not.toContain('querySelectorAll(".modal-backdrop")');
    expect(src).not.toContain("el.remove()");
  });

  it("confirms then closes via onHide only", () => {
    expect(src).toMatch(/onConfirm\(draft\);\s*onHide\(\);/);
  });
});
