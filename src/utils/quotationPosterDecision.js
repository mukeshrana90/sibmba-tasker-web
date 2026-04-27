import { Roles } from "./Roles";
import {
  coerceSeekerTaskStatusForStepper,
  taskStatus,
} from "./jobFlowStatus";

/** API: 1 = accepted, 2 = rejected by poster; 0 / missing = pending */
const STATUS_ACCEPTED = 1;
const STATUS_REJECTED = 2;

/**
 * Normalize status from various possible API shapes.
 * @param {Record<string, unknown> | null | undefined} quotation
 * @returns {number} 1, 2, or NaN if treated as pending/unknown
 */
/**
 * Some APIs store accept/reject on the nested populated `task_id`, not on the quotation root.
 * @param {Record<string, unknown>} taskLike
 */
function getStatusFromTaskLike(taskLike) {
  if (!taskLike || typeof taskLike !== "object") return NaN;
  const t = Number(
    taskLike.status ??
      taskLike.task_status ??
      taskLike.quotation_status ??
      taskLike.quote_status ??
      NaN
  );
  if (!Number.isNaN(t) && t !== 0) return t;
  if (t === 0) return 0;
  return NaN;
}

function getTaskAffectedQuotationId(taskLike) {
  if (!taskLike || typeof taskLike !== "object") return null;
  return (
    taskLike.quatation_id ??
    taskLike.quotation_id ??
    taskLike.quote_id ??
    null
  );
}

function getParentSelectedServiceProviderId(parentTask) {
  if (!parentTask || typeof parentTask !== "object") return null;
  return (
    parentTask.serviceProviderId ??
    parentTask.service_provider_id ??
    parentTask.service_provider?._id ??
    null
  );
}

function quotationMatchesTaskSelection(quotation, parentTask) {
  const selectedQid = getTaskAffectedQuotationId(parentTask);
  if (selectedQid == null || quotation?._id == null) return false;
  if (String(selectedQid) !== String(quotation._id)) return false;
  const selectedProviderId = getParentSelectedServiceProviderId(parentTask);
  if (selectedProviderId == null) return true;
  const qProviderId =
    quotation?.service_provider?._id ?? quotation?.service_provider_id ?? null;
  if (qProviderId == null) return false;
  return String(selectedProviderId) === String(qProviderId);
}

function isTaskLevelDecisionForDifferentQuotation(
  statusValue,
  affectedQuotationId,
  quotationId
) {
  if (
    (statusValue !== STATUS_ACCEPTED && statusValue !== STATUS_REJECTED) ||
    affectedQuotationId == null ||
    quotationId == null
  ) {
    return false;
  }
  return String(affectedQuotationId) !== String(quotationId);
}

function hasProviderRejectionMarker(quotation) {
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
    source.includes("provider") ||
    source === "2"
  ) {
    return true;
  }
  return false;
}

export function getQuotationNumericStatus(quotation) {
  if (!quotation || typeof quotation !== "object") return NaN;

  /** Root-level (includes optimistic merge via `mergeQuotationWithOptimisticStatus`) */
  const raw = Number(
    quotation.status ??
      quotation.quotation_status ??
      quotation.quote_status ??
      quotation.quatation_status ??
      quotation.request_status ??
      quotation.approval_status ??
      NaN
  );
  const rootTaskLike =
    quotation.task_id && typeof quotation.task_id === "object"
      ? quotation.task_id
      : quotation.task && typeof quotation.task === "object"
      ? quotation.task
      : null;
  const rootAffectedQuotationId = getTaskAffectedQuotationId(rootTaskLike);
  if (
    isTaskLevelDecisionForDifferentQuotation(
      raw,
      rootAffectedQuotationId,
      quotation?._id
    )
  ) {
    return NaN;
  }
  if (!Number.isNaN(raw) && raw !== 0) return raw;
  if (raw === 0) return 0;

  /** Populated task document: `get_task_by_id` / listings often put `status` here */
  const affectedFromTaskId =
    quotation.task_id && typeof quotation.task_id === "object"
      ? getTaskAffectedQuotationId(quotation.task_id)
      : null;
  const fromTaskId = getStatusFromTaskLike(
    quotation.task_id && typeof quotation.task_id === "object"
      ? quotation.task_id
      : null
  );
  if (
    isTaskLevelDecisionForDifferentQuotation(
      fromTaskId,
      affectedFromTaskId,
      quotation?._id
    )
  ) {
    return NaN;
  }
  if (!Number.isNaN(fromTaskId)) return fromTaskId;

  const affectedFromTask =
    quotation.task && typeof quotation.task === "object"
      ? getTaskAffectedQuotationId(quotation.task)
      : null;
  const fromTask = getStatusFromTaskLike(
    quotation.task && typeof quotation.task === "object" ? quotation.task : null
  );
  if (
    isTaskLevelDecisionForDifferentQuotation(
      fromTask,
      affectedFromTask,
      quotation?._id
    )
  ) {
    return NaN;
  }
  if (!Number.isNaN(fromTask)) return fromTask;

  if (quotation.is_accepted === true || quotation.accepted === true) {
    return STATUS_ACCEPTED;
  }
  if (quotation.is_rejected === true || quotation.rejected === true) {
    return STATUS_REJECTED;
  }
  if (hasProviderRejectionMarker(quotation)) {
    return STATUS_REJECTED;
  }

  const taskRef = quotation.task_id;
  if (taskRef && typeof taskRef === "object") {
    if (taskRef.is_accepted === true || taskRef.accepted === true) {
      return STATUS_ACCEPTED;
    }
    if (taskRef.is_rejected === true || taskRef.rejected === true) {
      return STATUS_REJECTED;
    }
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
 * On **task detail** (`get_task_by_id`), each quotation may have `task_id` as a plain id or a
 * populated task **without** `status`, while accept/reject is on `data.task.status`.
 * Merges that status in so badges/buttons match My Tasks / refresh — no extra page needed.
 *
 * @param {Record<string, unknown>} quotation
 * @param {Record<string, unknown> | null | undefined} parentTask - `postTaskDetail.data.task`
 */
export function mergeQuotationWithParentTaskForStatus(quotation, parentTask) {
  if (!quotation || !parentTask || typeof parentTask !== "object") {
    return quotation;
  }

  const parentStatus =
    parentTask.status ??
    parentTask.task_status ??
    parentTask.quotation_status;
  if (
    parentStatus === undefined ||
    parentStatus === null ||
    parentStatus === ""
  ) {
    return quotation;
  }

  /**
   * Do not fan-out `ACCEPTED` from task to every quotation.
   * Backend may set task accepted without marking which single quotation won.
   * If we merged `1` here, all quotations incorrectly show "Accepted".
   */
  if (Number(parentStatus) === taskStatus.ACCEPTED) {
    return quotation;
  }

  const parentAffectedQuotationId = getTaskAffectedQuotationId(parentTask);
  if (
    Number(parentStatus) === taskStatus.REJECTED &&
    parentAffectedQuotationId != null &&
    quotation?._id != null &&
    String(parentAffectedQuotationId) !== String(quotation._id)
  ) {
    return quotation;
  }

  const psNum = Number(parentStatus);
  const isPostQuotationSelectionLifecycle =
    psNum === taskStatus.COMPLETED ||
    psNum === taskStatus.ON_THE_WAY ||
    psNum === taskStatus.IN_PROGRESS;

  if (isPostQuotationSelectionLifecycle) {
    if (parentAffectedQuotationId == null) {
      return quotation;
    }
    if (!quotationMatchesTaskSelection(quotation, parentTask)) {
      return quotation;
    }
  }

  const pid = parentTask._id;
  const tid = quotation.task_id;

  const linkedToThisTask =
    pid == null ||
    tid == null ||
    tid === pid ||
    (typeof tid === "string" && String(tid) === String(pid)) ||
    (typeof tid === "object" &&
      tid !== null &&
      String(tid._id) === String(pid));

  if (!linkedToThisTask) {
    return quotation;
  }

  if (typeof tid === "object" && tid !== null) {
    const hasOwnStatus =
      tid.status !== undefined &&
      tid.status !== null &&
      tid.status !== "";
    if (hasOwnStatus) {
      return quotation;
    }
    return { ...quotation, task_id: { ...tid, status: parentStatus } };
  }

  return {
    ...quotation,
    task_id: {
      _id: typeof tid === "string" ? tid : pid,
      status: parentStatus,
    },
  };
}

/**
 * Resolve the task row to merge into a quotation on list screens (`postlist` + `myQuotations`).
 * Prefer the full task from `tasks` so `status` (e.g. on the way) is available when the API omits it on the quote.
 *
 * @param {Record<string, unknown> | null | undefined} quotation
 * @param {unknown[] | null | undefined} tasks
 * @returns {Record<string, unknown> | null}
 */
export function resolveParentTaskForQuotationMerge(quotation, tasks) {
  if (!quotation || typeof quotation !== "object") return null;

  const tid = quotation.task_id;
  const taskId =
    typeof tid === "object" && tid !== null && tid._id != null
      ? tid._id
      : tid;

  if (taskId != null && Array.isArray(tasks)) {
    const fromPosts = tasks.find(
      (t) => t && String(t._id) === String(taskId)
    );
    if (fromPosts && typeof fromPosts === "object") {
      return fromPosts;
    }
  }

  if (tid && typeof tid === "object" && tid !== null) {
    return tid;
  }

  return null;
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
  return hasProviderRejectionMarker(quotation);
}

/**
 * UI state for the task poster (customer) on incoming quotations.
 *
 * @param {Record<string, unknown> | null | undefined} quotation
 * @returns {{ showActions: boolean, badge: "accepted" | "rejected" | null }}
 */
export function getQuotationPosterDecisionState(quotation) {
  const status = getQuotationNumericStatus(quotation);

  if (status === STATUS_REJECTED) {
    if (isQuotationRejectionByServiceProvider(quotation)) {
      return { showActions: false, badge: "rejected" };
    }
    return { showActions: false, badge: "rejected" };
  }

  /**
   * After poster accepts, task moves through canonical lifecycle on `task.status`.
   * Merged quotation sees 4/5/3 — still must hide Accept/Reject (same as quotation.status === 1).
   */
  if (
    status === STATUS_ACCEPTED ||
    status === taskStatus.COMPLETED ||
    status === taskStatus.ON_THE_WAY ||
    status === taskStatus.IN_PROGRESS
  ) {
    return { showActions: false, badge: "accepted" };
  }

  return { showActions: true, badge: null };
}

/**
 * Canonical task `status` for the poster task-detail stepper.
 * - `get_task_by_id` often leaves `task.status` at 0 while `quotation.status` is accepted.
 * - Legacy seeker mapping treats `1` as "pending" (→ PENDING), which breaks canonical `1` = ACCEPTED.
 * Uplifts to at least {@link taskStatus.ACCEPTED} when any quotation shows an accepted badge.
 *
 * @param {Record<string, unknown> | null | undefined} task
 * @param {unknown[] | null | undefined} quotations
 * @param {Record<string, 1 | 2 | 3>} [optimisticById]
 * @returns {number}
 */
export function getPosterTaskDetailStepperStatus(
  task,
  quotations,
  optimisticById = {}
) {
  const hasAcceptedQuotation =
    Array.isArray(quotations) &&
    quotations.some((q) => {
      const merged = mergeQuotationWithParentTaskForStatus(
        mergeQuotationWithOptimisticStatus(q, optimisticById),
        task
      );
      return getQuotationPosterDecisionState(merged).badge === "accepted";
    });

  if (!task || typeof task !== "object") {
    return hasAcceptedQuotation ? taskStatus.ACCEPTED : taskStatus.PENDING;
  }

  const rawTaskStatus = Number(task.status);
  let s = rawTaskStatus;

  /**
   * Prefer canonical backend task status first.
   * Only fall back to legacy seeker coercion when status is missing/non-numeric.
   */
  if (Number.isNaN(s)) {
    const coerced = coerceSeekerTaskStatusForStepper(task.status);
    s =
      typeof coerced === "number" && !Number.isNaN(coerced)
        ? coerced
        : Number(coerced);
  }
  if (Number.isNaN(s)) {
    return hasAcceptedQuotation ? taskStatus.ACCEPTED : taskStatus.PENDING;
  }

  if (s === taskStatus.REJECTED) {
    return taskStatus.REJECTED;
  }

  if (hasAcceptedQuotation) {
    if (s > taskStatus.ACCEPTED) {
      return s;
    }
    return Math.max(s, taskStatus.ACCEPTED);
  }

  return s;
}

function getQuotationTaskId(quotation) {
  if (!quotation || typeof quotation !== "object") return null;
  const tid = quotation.task_id;
  if (tid && typeof tid === "object") {
    return tid._id ?? null;
  }
  return tid ?? null;
}

/**
 * True when any quotation in a task is already accepted (or task moved beyond accepted).
 * Used to disable remaining pending quotation actions for that task.
 *
 * @param {unknown[] | null | undefined} quotations
 * @param {Record<string, unknown> | null | undefined} parentTask
 * @param {Record<string, 1 | 2 | 3>} [optimisticById]
 * @returns {boolean}
 */
export function hasAcceptedQuotationForTask(
  quotations,
  parentTask,
  optimisticById = {}
) {
  const taskStatusNumber = Number(
    parentTask?.status ?? parentTask?.task_status ?? parentTask?.quotation_status
  );
  if (
    taskStatusNumber === taskStatus.ACCEPTED ||
    taskStatusNumber === taskStatus.ON_THE_WAY ||
    taskStatusNumber === taskStatus.IN_PROGRESS ||
    taskStatusNumber === taskStatus.COMPLETED
  ) {
    return true;
  }

  if (!Array.isArray(quotations) || quotations.length === 0) return false;
  return quotations.some((q) => {
    const merged = mergeQuotationWithParentTaskForStatus(
      mergeQuotationWithOptimisticStatus(q, optimisticById),
      parentTask
    );
    return getQuotationPosterDecisionState(merged).badge === "accepted";
  });
}

/**
 * Returns task ids where at least one quotation is accepted.
 *
 * @param {unknown[] | null | undefined} quotations
 * @param {Record<string, 1 | 2 | 3>} [optimisticById]
 * @returns {Set<string>}
 */
export function getAcceptedQuotationTaskIds(quotations, optimisticById = {}) {
  const acceptedTaskIds = new Set();
  if (!Array.isArray(quotations) || quotations.length === 0) return acceptedTaskIds;

  quotations.forEach((q) => {
    const merged = mergeQuotationWithOptimisticStatus(q, optimisticById);
    if (getQuotationPosterDecisionState(merged).badge !== "accepted") return;
    const taskId = getQuotationTaskId(merged);
    if (taskId != null) {
      acceptedTaskIds.add(String(taskId));
    }
  });

  return acceptedTaskIds;
}
