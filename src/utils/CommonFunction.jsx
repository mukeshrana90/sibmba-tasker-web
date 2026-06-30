import moment from "moment";
import { useLocation } from "react-router-dom";

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const serialNumber = (currentPage, limit, index) => {
  return (currentPage - 1) * limit + index + 1;
};

const constructQueryString = (params = {}) => {
  return Object.entries(params)
    .filter(([_, value]) => value !== "" && value !== null && value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
};


const capitalizeFirstLetter = (string) => {
  if (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } else {
    return `N/A`;
  }
};

const fullName = (firstName, lastName) => {
  let name = firstName
    ? `${capitalizeFirstLetter(firstName)} ${capitalizeFirstLetter(lastName)}`
    : "N/A";
  return name;
};

const formatPhoneNumber = (countryCode, phoneNumber) => {
  if (countryCode) {
    if (!countryCode?.startsWith("+")) {
      countryCode = "+" + countryCode;
    }
  }
  return `${phoneNumber ? `${countryCode || ""} ${phoneNumber}` : "N/A"}`;
};

const getGender = (gender) => {
  if (gender === 1) {
    return "Male";
  } else if (gender === 2) {
    return "Female";
  } else if (gender === 3) {
    return "Other";
  } else {
    return "N/A";
  }
};

const convertDateToString = (inputDateStr) => {
  const date = new Date(inputDateStr);
  const formattedDate = date.toISOString().split("T")[0];
  return formattedDate;
};

export const today = new Date().toISOString().split("T")[0];

const convertDateToStringNew = (inputDate) => {
  if (!inputDate) return null;
  const date = new Date(inputDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const convertTimeToUTC = (time) => {
  let utcTime = moment(time, "HH:mm").utc().format("HH:mm");
  return utcTime;
};

const convertUTCToLocal = (utcTime) => {
  let localTime = moment.utc(utcTime, "HH:mm").local().format("HH:mm");
  return localTime;
};

const downloadFile = (file_path) => {
  var a = document.createElement("a");
  a.href = file_path;
  a.target = "_blank";
  a.download = file_path.substring(file_path.lastIndexOf("/") + 1);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const createCsv = async (data) => {
  let keys = Object?.keys(data[0]);
  let result = "";
  result += keys.join(",");
  result += "\n";
  data?.forEach((element) => {
    keys.forEach((key) => {
      result += `${element[key] ? element[key] : "N/A"},`;
    });
    result += "\n";
  });
  return result;
};
const downloadCSV = async (name, array) => {
  if (array?.length > 0) {
    let csv = "data:text/csv;charset=utf-8," + (await createCsv(array));
    let excel = encodeURI(csv);
    let link = document.createElement("a");
    link.setAttribute("href", excel);
    link.setAttribute("download", `${name}.csv`);
    link.click();
  }
  return;
};

const downloadURL = (url) => {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.download = "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const formatTimeAgo = (timestamp) => {
  const now = moment();
  const time = moment(timestamp);

  const diffInMinutes = now.diff(time, "minutes");
  const diffInHours = now.diff(time, "hours");
  const diffInDays = now.diff(time, "days");

  if (diffInMinutes < 1) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInDays < 2) {
    return "1 day ago";
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return time.format("MMM DD, YYYY");
  }
};

const convertTo12HourFormat = (time) => {
  if (time) {
    let [hours, minutes] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    minutes = minutes.toString().padStart(2, "0");

    return `${hours}:${minutes} ${ampm}`;
  }
};

const downloadInvoiceUrl = (relativeUrl) => {
  const baseUrl = "https://fifty-shades-api.bosselt.com/";
  const fullUrl = `${baseUrl}${relativeUrl}`;

  const link = document.createElement("a");
  link.href = fullUrl;
  link.download = relativeUrl.split("/").pop();
  document.body.appendChild(link);

  link.click();
  document.body.removeChild(link);
};

/**
 * Format seeker task `when_done` for UI. API uses `MM-DD-YYYY` (see PostTask); avoids moment deprecation from implicit parsing.
 * @param {string | Date | null | undefined} whenDone
 * @param {string} [outFormat]
 * @returns {string}
 */
const formatTaskWhenDoneDisplay = (whenDone, outFormat = "DD MMM") => {
  if (whenDone === null || whenDone === undefined || whenDone === "") {
    return "N/A";
  }
  if (moment.isMoment(whenDone)) {
    return whenDone.isValid() ? whenDone.format(outFormat) : "N/A";
  }
  if (whenDone instanceof Date) {
    const d = moment(whenDone);
    return d.isValid() ? d.format(outFormat) : "N/A";
  }
  const str = String(whenDone).trim();
  const usMdY = moment(str, "MM-DD-YYYY", true);
  if (usMdY.isValid()) {
    return usMdY.format(outFormat);
  }
  const iso = moment(str, moment.ISO_8601, true);
  if (iso.isValid()) {
    return iso.format(outFormat);
  }
  const ymd = moment(str, "YYYY-MM-DD", true);
  if (ymd.isValid()) {
    return ymd.format(outFormat);
  }
  return "N/A";
};

const getStatusLabel = (status) => {
  const s = Number(status);
  const statusMap = {
    0: "Pending",
    1: "Requested",
    2: "Accepted",
    3: "Canceled",
    4: "Completed",
    5: "Rejected",
    6: "On the way",
    7: "In progress",
  };
  return statusMap[s] || "N/A";
};

const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

export {
  useQuery,
  constructQueryString,
  fullName,
  capitalizeFirstLetter,
  formatPhoneNumber,
  getGender,
  serialNumber,
  convertTimeToUTC,
  convertUTCToLocal,
  downloadCSV,
  downloadFile,
  downloadURL,
  formatTimeAgo,
  convertTo12HourFormat,
  downloadInvoiceUrl,
  convertDateToString,
  getStatusLabel,
  convertDateToStringNew,
  expiresAt,
  formatTaskWhenDoneDisplay,
};
