import {
  formatMoneyInputValue,
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
});
