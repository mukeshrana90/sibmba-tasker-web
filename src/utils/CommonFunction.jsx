import moment from "moment";
import { useLocation } from "react-router-dom";

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const serialNumber = (currentPage, limit, index) => {
  return (currentPage - 1) * limit + index + 1;
};

const constructQueryString = (obj) => {
  if (obj) {
    const queryString = Object.keys(obj)
      .filter(
        (key) => obj[key] !== "" && obj[key] !== null && obj[key] !== undefined
      )
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`
      )
      .join("&");
    return queryString;
  } else {
    return "";
  }
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
  if (gender == 1) {
    return "Male";
  } else if (gender == 2) {
    return "Female";
  } else if (gender == 3) {
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
      result += `${element[key] ? element[key] : "N/A"}` + ",";
    });
    result += "\n";
  });
  return result;
};
const downloadCSV = async (name, array) => {
  console.log("array", array);
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

const getStatusLabel = (status) => {
  const statusMap = {
    1: 'Pending',
    2: 'Confirmed',
    3: 'Canceled',
    4: 'Completed',
    5: 'Rejected',
  };

  return statusMap[status] || 'N/A';
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
  expiresAt
};
