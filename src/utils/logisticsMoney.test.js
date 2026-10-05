import {
  editableMoneyValue,
  formatMoneyInputValue,
  moneyInputMask,
  normalizeTypedMoney,
  parseLogisticsMoney,
  sanitizeMoneyInput,
} from "./logisticsMoney";

describe("logisticsMoney", () => {
  it("allows typing 25.00 and 124.21 (max 2 decimals)", () => {
    expect(sanitizeMoneyInput("25.00")).toBe("25.00");
    expect(sanitizeMoneyInput("124.21")).toBe("124.21");
    expect(sanitizeMoneyInput("124.219")).toBe("124.21");
    expect(sanitizeMoneyInput("12.")).toBe("12.");
    expect(sanitizeMoneyInput("1a2b.3c")).toBe("12.3");
    expect(sanitizeMoneyInput("123456")).toBe("99999.99");
  });

  it("formats to 2 decimals on blur / prefill", () => {
    expect(formatMoneyInputValue("25")).toBe("25.00");
    expect(formatMoneyInputValue("124.2")).toBe("124.20");
    expect(formatMoneyInputValue("12.")).toBe("12.00");
    expect(formatMoneyInputValue(1231)).toBe("1231.00");
    expect(formatMoneyInputValue(".")).toBe("");
    expect(formatMoneyInputValue("")).toBe("");
  });

  it("parses formatted values", () => {
    expect(parseLogisticsMoney("25.00")).toEqual({ ok: true, value: 25 });
    expect(parseLogisticsMoney("124.21")).toEqual({ ok: true, value: 124.21 });
    expect(parseLogisticsMoney("0.00").ok).toBe(false);
  });

  it("keeps a live .00 mask while typing (12 → 12.00, 53.24)", () => {
    expect(moneyInputMask("")).toEqual({ text: "", pad: "" });
    expect(moneyInputMask("12")).toEqual({ text: "12.00", pad: ".00" });
    expect(moneyInputMask("53.")).toEqual({ text: "53.00", pad: "00" });
    expect(moneyInputMask("53.2")).toEqual({ text: "53.20", pad: "0" });
    expect(moneyInputMask("53.24")).toEqual({ text: "53.24", pad: "" });
    expect(moneyInputMask(25)).toEqual({ text: "25.00", pad: ".00" });
  });

  it("normalizes typed money", () => {
    expect(normalizeTypedMoney(".")).toBe("0.");
    expect(normalizeTypedMoney(".5")).toBe("0.5");
    expect(normalizeTypedMoney("05")).toBe("5");
    expect(normalizeTypedMoney("0.5")).toBe("0.5");
    expect(normalizeTypedMoney("53..")).toBe("53.");
  });

  it("resumes editing a formatted value", () => {
    expect(editableMoneyValue("53.00")).toBe("53");
    expect(editableMoneyValue("53.20")).toBe("53.2");
    expect(editableMoneyValue("53.24")).toBe("53.24");
    expect(editableMoneyValue("0.00")).toBe("0");
    expect(editableMoneyValue("12")).toBe("12");
  });
});
