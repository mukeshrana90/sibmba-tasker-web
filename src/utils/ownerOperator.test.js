import { apiErrorCode, apiErrorMessage, occupancyLabel, unitHeldByOther, unitOccupancy, whatsappExtrasLabel } from "./ownerOperator";
import { ownerStatusControl } from "./ownerUnitStatus";
import { assetBlockingTypes, docNeedsReplace } from "./docExpiry";
import { logisticsNotificationDocPath } from "./logisticsNotificationNav";

const operatorLive = { busy: true, by: "operator", reason: "live", operator: { id: "op1", name: "Tariro" } };
const optionValues = (c) => c.options.map((o) => o.value);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("role", "4");
});

describe("unit occupancy", () => {
  test("uses the API field, and falls back to assigned operators", () => {
    expect(unitOccupancy({ occupancy: operatorLive }).operator.name).toBe("Tariro");
    const old = unitOccupancy({
      _id: "a1",
      assigned_operators: [{ _id: "op2", full_name: "Rudo", logistics_availability: { active_asset_id: "a1", state: "available_now" } }],
    });
    expect(old).toMatchObject({ busy: true, by: "operator", reason: "live" });
    expect(unitOccupancy({ _id: "a1" }).busy).toBe(false);
  });

  test("label names who holds the unit", () => {
    expect(occupancyLabel({ occupancy: operatorLive })).toBe("In use by Tariro");
    expect(occupancyLabel({ occupancy: { ...operatorLive, reason: "on_job" } })).toBe("In use by Tariro — on a job");
    expect(occupancyLabel({})).toBe("");
  });

  test("held by someone else, for owner and operator", () => {
    expect(unitHeldByOther({ occupancy: operatorLive }, "owner1")).toBe(true);
    expect(unitHeldByOther({ occupancy: { busy: true, by: "owner" } }, "owner1")).toBe(false);
    localStorage.setItem("owner_id", "owner1");
    expect(unitHeldByOther({ occupancy: { busy: true, by: "owner" } }, "op1")).toBe(true);
    expect(unitHeldByOther({ occupancy: operatorLive }, "op1")).toBe(false);
  });
});

describe("availability dropdown (item 6)", () => {
  test("nobody live: only Offline, whatever the stored state says", () => {
    const c = ownerStatusControl({ availability: { state: "available_now" }, customer_view: { bookable: false } });
    expect(c.value).toBe("offline");
    expect(optionValues(c)).toEqual(["offline"]);
    expect(c.disabled).toBe(true);
  });

  test("operator live: real status, and no way to force them off", () => {
    const c = ownerStatusControl({ occupancy: operatorLive, customer_view: { raw_state: "returning_empty", bookable: true } });
    expect(c.value).toBe("returning_empty");
    expect(optionValues(c)).not.toContain("offline");
    expect(c.holder).toBe("operator");
  });

  test("owner on the unit can go offline; on a job it is locked", () => {
    const c = ownerStatusControl({ _id: "a1", customer_view: { raw_state: "available_now" } }, { ownerActiveAssetId: "a1" });
    expect(c.holder).toBe("owner");
    expect(optionValues(c)).toContain("offline");
    const j = ownerStatusControl({ occupancy: { ...operatorLive, reason: "on_job" } });
    expect(j.value).toBe("on_job");
    expect(j.disabled).toBe(true);
  });
});

describe("documents", () => {
  test("trucks always need roadworthy; the red plate only matters on cabs (item 11)", () => {
    expect(assetBlockingTypes("vehicle", false)).toEqual(["rego", "roadworthy"]);
    expect(assetBlockingTypes("cab", false)).toEqual(["rego"]);
    expect(assetBlockingTypes("equipment", true)).toEqual([]);
  });

  test("replace is offered on rejected or expired documents only (item 18)", () => {
    expect(docNeedsReplace({ review: { status: "rejected" } })).toBe(true);
    expect(docNeedsReplace({ expires: "2020-01-01" })).toBe(true);
    expect(docNeedsReplace({ expires: "2999-01-01", review: { status: "verified" } })).toBe(false);
    expect(docNeedsReplace(null)).toBe(false);
  });
});

describe("notifications open the right document (item 19)", () => {
  test("unit, operator, business and trial", () => {
    expect(logisticsNotificationDocPath({ meta: { asset_id: "a1", doc_type: "rego" } })).toBe("/logistics/owner/fleet/a1?doc=rego");
    expect(logisticsNotificationDocPath({ meta: { operator_id: "o1", doc_type: "licence" } })).toBe("/logistics/owner/operators?operator=o1&doc=licence");
    expect(logisticsNotificationDocPath({ meta: { business_doc: true, doc_type: "tax" } })).toBe("/logistics/owner/verification?doc=tax");
    expect(logisticsNotificationDocPath({ meta: { subject: "business", doc_type: "tax" } })).toBe("/logistics/owner/verification?doc=tax");
    expect(logisticsNotificationDocPath({ type: "logistics_whatsapp_trial" })).toBe("/logistics/owner/subscription");
    expect(logisticsNotificationDocPath({ type: "logistics_job" })).toBeNull();
  });
});

describe("error messages", () => {
  test("every new code gets its own wording", () => {
    const unit = { message: "x", data: { code: "UNIT_IN_USE_BY_OPERATOR", operator: { name: "Tariro" }, reason: "live" } };
    expect(apiErrorCode(unit)).toBe("UNIT_IN_USE_BY_OPERATOR");
    expect(apiErrorMessage(unit)).toContain("Tariro is live on this unit");
    for (const code of ["UNIT_IN_USE_BY_OWNER", "OWNER_NOT_ELIGIBLE", "COMPANY_NOT_APPROVED", "ACTIVE_JOB", "OPERATOR_ON_ACTIVE_JOB", "REASON_REQUIRED", "WA_CHAT_NOT_ALLOWED", "WA_CHAT_NO_PHONE", "WA_CHAT_PLAN_REQUIRED"]) {
      expect(apiErrorMessage({ code, message: "server text" })).not.toBe("server text");
    }
    expect(apiErrorMessage({ message: "server text" })).toBe("server text");
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});

test("WhatsApp extras countdown (item 37)", () => {
  expect(whatsappExtrasLabel({ source: "trial", extras_active: true, trial_days_left: 12 })).toBe("Paid benefits free: 12 days left");
  expect(whatsappExtrasLabel({ source: "trial", extras_active: true, trial_days_left: 1 })).toBe("Paid benefits free: 1 day left");
  expect(whatsappExtrasLabel({ source: "paid", extras_active: true })).toContain("included");
  expect(whatsappExtrasLabel({ source: "none", extras_active: false })).toContain("ended");
  expect(whatsappExtrasLabel(null)).toBe("");
});
