import { jobListPrice, jobPriceLines, withPriorityFee } from "./jobPrice";

describe("jobPriceLines", () => {
  it("shows the budget before a quote is accepted", () => {
    const p = jobPriceLines({ budget: { amount: 100, currency: "USD" } });
    expect(p.stage).toBe("budget");
    expect(p.headline).toBe("USD 100");
    expect(p.lines).toEqual([{ key: "budget", label: "Budget", value: "USD 100" }]);
  });

  it("shows the agreed price + priority fee + total once accepted (fallback)", () => {
    const p = jobPriceLines({
      priority: true,
      priority_fee: { value: 5, currency: "USD" },
      budget: { amount: 100, currency: "USD" },
      assigned: { amount: { value: 120, currency: "USD" } },
    });
    expect(p.headline).toBe("USD 125");
    expect(p.lines.map((l) => `${l.label}: ${l.value}`)).toEqual([
      "Agreed price: USD 120",
      "Priority fee: USD 5",
      "Total: USD 125",
    ]);
  });

  it("uses price_summary from the API when present", () => {
    const p = jobPriceLines({
      budget: { amount: 100, currency: "USD" },
      price_summary: {
        budget: { value: 100, currency: "USD" },
        agreed: { value: 120, currency: "USD" },
        priority_fee: null,
        total: { value: 120, currency: "USD" },
        fee_in_total: false,
        stage: "agreed",
      },
    });
    expect(p.headline).toBe("USD 120");
    expect(p.lines).toEqual([{ key: "agreed", label: "Agreed price", value: "USD 120" }]);
  });

  it("list price + priority hint and fee on a hire amount", () => {
    const job = {
      priority: true,
      priority_fee: { value: 5, currency: "USD" },
      budget: { amount: 80, currency: "USD" },
    };
    expect(jobListPrice(job)).toEqual({ price: "USD 80", priorityHint: "+ USD 5 priority", agreed: false });
    expect(withPriorityFee(job, { value: 200, currency: "USD" })).toEqual({
      amount: "USD 200",
      fee: "USD 5",
      total: "USD 205",
    });
  });
});
