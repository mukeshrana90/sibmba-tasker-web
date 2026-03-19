import { Roles } from "./Roles";

/** API: 1 = accepted, 2 = rejected by poster; 0 / missing = pending */
const STATUS_ACCEPTED = 1;
const STATUS_REJECTED = 2;

/**
 * Normalize status from various possible API shapes.
 * @param {Record<string, unknown> | null | undefined} quotation
 * @returns {number} 1, 2, or NaN if treated as pending/unknown
 */
export function getQuotationNumericStatus(quotation) {
  if (!quotation || typeof quotation !== "object") return NaN;

  const raw = Number(
    quotation.status ??
      quotation.quotation_status ??
      quotation.quote_status ??
      quotation.quatation_status ??
      quotation.request_status ??
      quotation.approval_status ??
      NaN
  );
  if (!Number.isNaN(raw) && raw !== 0) return raw;
  if (raw === 0) return 0;

  if (quotation.is_accepted === true || quotation.accepted === true) {
    return STATUS_ACCEPTED;
  }
  if (quotation.is_rejected === true || quotation.rejected === true) {
    return STATUS_REJECTED;
  }

  return NaN;
}

/**
 * @param {Record<string, unknown>} quotation
 * @param {Record<string, 1 | 2>} optimisticById
 */
export function mergeQuotationWithOptimisticStatus(quotation, optimisticById) {
  if (!quotation?._id) return quotation;
  const opt = optimisticById[quotation._id];
  if (opt === undefined) return quotation;
  return { ...quotation, status: opt };
}

/**
 * True when backend attributes the rejection to the service provider (quotation sender),
 * so the task poster should see Accept / Reject again (e.g. provider withdrew offer).
 * Supports multiple possible field names until API is normalized.
 *
 * @param {Record<string, unknown> | null | undefined} quotation
 * @returns {boolean}
 */
export function isQuotationRejectionByServiceProvider(quotation) {
  if (!quotation || typeof quotation !== "object") return false;

  if (
    quotation.rejected_by_quotation_sender === true ||
    quotation.rejectedByQuotationSender === true
  ) {
    return true;
  }
  if (
    quotation.reopen_for_poster === true ||
    quotation.can_poster_respond === true
  ) {
    return true;
  }

  const role = Number(
    quotation.reject_by_role ??
      quotation.rejected_by_role ??
      quotation.rejectByRole ??
      quotation.rejectedByRole
  );
  if (role === Roles.SERVICE_PROVIDER) return true;

  const source = String(
    quotation.rejected_by ??
      quotation.reject_by ??
      quotation.rejection_source ??
      ""
  ).toLowerCase();
  if (
    source.includes("service_provider") ||
    source.includes("service-provider") ||
    source.includes("quotation_sender") ||
    source.includes("provider")
  ) {
    return true;
  }
  if (source === "2") return true;

  return false;
}

/**
 * UI state for the task poster (customer) on incoming quotations.
 *
 * @param {Record<string, unknown> | null | undefined} quotation
 * @returns {{ showActions: boolean, badge: "accepted" | "rejected" | null }}
 */
export function getQuotationPosterDecisionState(quotation) {
  const status = getQuotationNumericStatus(quotation);

  /** 3 = completed / job done in some APIs — same as accepted for poster actions */
  if (status === STATUS_ACCEPTED || status === 3) {
    return { showActions: false, badge: "accepted" };
  }

  if (status === STATUS_REJECTED) {
    if (isQuotationRejectionByServiceProvider(quotation)) {
      return { showActions: true, badge: null };
    }
    return { showActions: false, badge: "rejected" };
  }

  return { showActions: true, badge: null };
}
