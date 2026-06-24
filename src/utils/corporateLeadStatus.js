import { corpoTaskStatus } from "./Roles";

export function getCorporateLeadStatus(lead) {
  const cs = Number(lead?.corporateStatus);
  const us = Number(lead?.userStatus);

  if (cs === corpoTaskStatus.COMPLETED || us === corpoTaskStatus.COMPLETED) {
    return "completed";
  }
  if (cs === corpoTaskStatus.REJECT || us === corpoTaskStatus.REJECT) {
    return "rejected";
  }
  if (cs === corpoTaskStatus.ACCEPT && us === corpoTaskStatus.ACCEPT) {
    return "in-progress";
  }
  return lead?.status || "pending";
}

export function canCorporateRespondToLead(lead) {
  return (
    Number(lead?.userStatus) === 1 && Number(lead?.corporateStatus) === 0
  );
}

export function canCorporateViewLeadDetails(lead) {
  const status = getCorporateLeadStatus(lead);
  return ["in-progress", "completed", "rejected"].includes(status);
}

export function formatCorporateLeadStatusLabel(status) {
  const labels = {
    pending: "Pending",
    "in-progress": "In Progress",
    rejected: "Rejected",
    completed: "Completed",
  };
  return labels[status] || status;
}

function parseWhenDone(lead) {
  const whenDone =
    lead?.taskId?.when_done || lead?.bookingId?.date || "";
  if (!whenDone) return 0;
  const parts = String(whenDone).split("-");
  if (parts.length === 3 && parts[0].length === 2) {
    const [mm, dd, yyyy] = parts;
    return new Date(`${yyyy}-${mm}-${dd}`).getTime();
  }
  return new Date(whenDone).getTime() || 0;
}

export function getTaskTimeSortValue(taskTime = "") {
  const match = String(taskTime).match(/(\d{1,2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const period = match[2].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour;
}

export function sortUpcomingCorporateLeads(leads = []) {
  return [...leads].sort((a, b) => {
    const dateA = a?.convertedDate
      ? new Date(a.convertedDate).getTime()
      : parseWhenDone(a);
    const dateB = b?.convertedDate
      ? new Date(b.convertedDate).getTime()
      : parseWhenDone(b);
    if (dateB !== dateA) return dateB - dateA;

    const timeA =
      a?.type === "task"
        ? getTaskTimeSortValue(a?.taskId?.task_time)
        : getTaskTimeSortValue(a?.bookingId?.slotTime?.[0]);
    const timeB =
      b?.type === "task"
        ? getTaskTimeSortValue(b?.taskId?.task_time)
        : getTaskTimeSortValue(b?.bookingId?.slotTime?.[0]);
    return timeB - timeA;
  });
}
