/**
 * Task lifecycle (service provider / posted task flow).
 * Align with backend `task.status` when available.
 */
export const taskStatus = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
  COMPLETED: 3,
  ON_THE_WAY: 4,
  IN_PROGRESS: 5,
};

/**
 * Provider task detail (`ServiceTaskDetails`): show **one** progression control at a time.
 * Flow: Accepted → On the Way → In Progress → Job Done. No skipping (Job Done only after in progress).
 * Terminal states hide all actions.
 * @param {unknown} status
 * @returns {{ showCancel: boolean, showOnTheWay: boolean, showInProgress: boolean, showJobDone: boolean }}
 */
export function getProviderTaskDetailActionVisibility(status) {
  const ts = Number(status);
  if (Number.isNaN(ts)) {
    return {
      showCancel: false,
      showOnTheWay: false,
      showInProgress: false,
      showJobDone: false,
    };
  }
  const isTerminal =
    ts === taskStatus.REJECTED || ts === taskStatus.COMPLETED;
  return {
    showCancel: !isTerminal && ts < taskStatus.ON_THE_WAY,
    showOnTheWay: ts === taskStatus.ACCEPTED,
    showInProgress: ts === taskStatus.ON_THE_WAY,
    showJobDone: ts === taskStatus.IN_PROGRESS,
  };
}

/**
 * Booking lifecycle (customer booking flow).
 */
export const bookingStatus = {
  PENDING: 0,
  REQUESTED: 1,
  ACCEPTED: 2,
  CANCELLED: 3,
  COMPLETED: 4,
  REJECTED: 5,
  ON_THE_WAY: 6,
  IN_PROGRESS: 7,
};

/**
 * Booking customer: hide cancel once provider is en route, working, or job-complete (pay) stage.
 * @param {unknown} status
 */
export function bookingSeekerShouldHideCancellationActions(status) {
  const s = Number(status);
  if (Number.isNaN(s)) return false;
  return (
    s === bookingStatus.COMPLETED ||
    s === bookingStatus.ON_THE_WAY ||
    s === bookingStatus.IN_PROGRESS
  );
}

/** Visual steps (order matches design: Posted → … → Completed) */
export const JOB_FLOW_STEP_LABELS = [
  "Posted",
  "Accepted",
  "On the Way",
  "In Progress",
  "Completed",
];

/**
 * @typedef {{ activeStep: number, variant: 'default' | 'rejected' | 'cancelled', terminalLabel?: string }} JobFlowStepperModel
 */

/**
 * Map task status → step index 0..4, or -1 for terminal non-progress.
 * @param {unknown} status
 * @returns {JobFlowStepperModel}
 */
export function getTaskFlowStepperState(status) {
  const s = Number(status);
  if (Number.isNaN(s)) {
    return { activeStep: 0, variant: "default" };
  }

  if (s === taskStatus.REJECTED) {
    return {
      activeStep: -1,
      variant: "rejected",
      terminalLabel: "Rejected",
    };
  }

  if (s === taskStatus.PENDING) {
    return { activeStep: 0, variant: "default" };
  }
  if (s === taskStatus.ACCEPTED) {
    return { activeStep: 1, variant: "default" };
  }
  if (s === taskStatus.ON_THE_WAY) {
    return { activeStep: 2, variant: "default" };
  }
  if (s === taskStatus.IN_PROGRESS) {
    return { activeStep: 3, variant: "default" };
  }
  if (s === taskStatus.COMPLETED) {
    return { activeStep: 4, variant: "default" };
  }

  return { activeStep: 0, variant: "default" };
}

/**
 * Map booking status → step index 0..4.
 * @param {unknown} status
 * @returns {JobFlowStepperModel}
 */
export function getBookingFlowStepperState(status) {
  const s = Number(status);
  if (Number.isNaN(s)) {
    return { activeStep: 0, variant: "default" };
  }

  if (s === bookingStatus.REJECTED) {
    return {
      activeStep: -1,
      variant: "rejected",
      terminalLabel: "Rejected",
    };
  }
  if (s === bookingStatus.CANCELLED) {
    return {
      activeStep: -1,
      variant: "cancelled",
      terminalLabel: "Cancelled",
    };
  }

  if (s === bookingStatus.PENDING || s === bookingStatus.REQUESTED) {
    return { activeStep: 0, variant: "default" };
  }
  if (s === bookingStatus.ACCEPTED) {
    return { activeStep: 1, variant: "default" };
  }
  if (s === bookingStatus.ON_THE_WAY) {
    return { activeStep: 2, variant: "default" };
  }
  if (s === bookingStatus.IN_PROGRESS) {
    return { activeStep: 3, variant: "default" };
  }
  if (s === bookingStatus.COMPLETED) {
    return { activeStep: 4, variant: "default" };
  }

  return { activeStep: 0, variant: "default" };
}

/**
 * Seeker task-detail card historically used `1 = pending`, `2 = cancelled`, `3 = completed`.
 * Map to canonical task enum for the stepper without changing API.
 * @param {unknown} status
 */
export function coerceSeekerTaskStatusForStepper(status) {
  const s = Number(status);
  if (Number.isNaN(s)) return status;
  if (s === 1) return taskStatus.PENDING;
  if (s === 2) return taskStatus.REJECTED;
  if (s === 3) return taskStatus.COMPLETED;
  return s;
}

/**
 * Task poster (customer): hide cancel / delete-style actions once work has started moving.
 * @param {unknown} status
 */
export function seekerShouldHideTaskCancellationActions(status) {
  const s = Number(status);
  if (Number.isNaN(s)) return false;
  return (
    s === taskStatus.COMPLETED ||
    s === taskStatus.ON_THE_WAY ||
    s === taskStatus.IN_PROGRESS
  );
}

/**
 * Copy under the stepper for the **posted task owner** (customer task detail).
 * @param {unknown} status
 */
export function getSeekerTaskFlowDescription(status) {
  const s = Number(status);
  if (s === taskStatus.REJECTED) {
    return "This task was rejected.";
  }
  if (s === taskStatus.PENDING) {
    return "Waiting for providers to quote or for you to accept an offer.";
  }
  if (s === taskStatus.ACCEPTED) {
    return "A provider is assigned. They will work on the scheduled day.";
  }
  if (s === taskStatus.ON_THE_WAY) {
    return "Your service provider is on the way.";
  }
  if (s === taskStatus.IN_PROGRESS) {
    return "The provider is working on your task.";
  }
  if (s === taskStatus.COMPLETED) {
    return "This task is completed.";
  }
  return "Track your task progress below.";
}

export function getBookingFlowDescription(status) {
  const s = Number(status);
  if (s === bookingStatus.CANCELLED) {
    return "This booking was cancelled.";
  }
  if (s === bookingStatus.REJECTED) {
    return "This booking was rejected.";
  }
  if (s === bookingStatus.PENDING || s === bookingStatus.REQUESTED) {
    return "Waiting for the service provider to respond.";
  }
  if (s === bookingStatus.ACCEPTED) {
    return "Your booking is confirmed. The provider will proceed as scheduled.";
  }
  if (s === bookingStatus.ON_THE_WAY) {
    return "The service provider is on the way.";
  }
  if (s === bookingStatus.IN_PROGRESS) {
    return "Service is in progress.";
  }
  if (s === bookingStatus.COMPLETED) {
    return "Service completed.";
  }
  return "";
}

export function getTaskFlowDescription(status) {
  const s = Number(status);
  if (s === taskStatus.REJECTED) {
    return "This task was rejected.";
  }
  if (s === taskStatus.PENDING) {
    return "Waiting for the customer to accept your quotation.";
  }
  if (s === taskStatus.ACCEPTED) {
    return "Service provider need to start work on scheduled day.";
  }
  if (s === taskStatus.ON_THE_WAY) {
    return "You are on the way to the job.";
  }
  if (s === taskStatus.IN_PROGRESS) {
    return "Work is in progress.";
  }
  if (s === taskStatus.COMPLETED) {
    return "This task is completed.";
  }
  return "Track your task progress below.";
}

/** Chat is available once a task is accepted through completion. */
export function canMessageOnActiveTask(status) {
  const s = Number(status);
  if (Number.isNaN(s)) return false;
  return [
    taskStatus.ACCEPTED,
    taskStatus.ON_THE_WAY,
    taskStatus.IN_PROGRESS,
    taskStatus.COMPLETED,
  ].includes(s);
}

/** Chat is available once a booking is accepted through completion. */
export function canMessageOnActiveBooking(status) {
  const s = Number(status);
  if (Number.isNaN(s)) return false;
  return [
    bookingStatus.ACCEPTED,
    bookingStatus.ON_THE_WAY,
    bookingStatus.IN_PROGRESS,
    bookingStatus.COMPLETED,
  ].includes(s);
}
