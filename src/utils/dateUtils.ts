/**
 * PawGuard Centralized Date & Time Formatter
 * Converts backend UTC timestamps to the user's local timezone.
 * Format requirement: DD MMM YYYY, HH:MM AM/PM
 * Example: 2026-08-15T19:16:15.141326Z -> "16 Aug 2026, 12:46 AM" (in IST UTC+5:30)
 */

export const formatDateTime = (input?: string | number | Date | null): string => {
  if (input === undefined || input === null || input === "") return "-";

  let dateObj: Date;

  if (input instanceof Date) {
    dateObj = input;
  } else if (typeof input === "number") {
    dateObj = new Date(input);
  } else if (typeof input === "string") {
    let str = input.trim();
    if (!str || str === "-") return "-";

    // If string is already formatted as "DD MMM YYYY, HH:MM AM/PM", return as is
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4},\s+\d{1,2}:\d{2}\s+(AM|PM)$/i.test(str)) {
      return str;
    }

    // Ensure ISO string lacking timezone offset is treated as UTC
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) && !/[Zz+-]\d{2}:?\d{2}$|[Zz]$/.test(str)) {
      str += "Z";
    }

    dateObj = new Date(str);
  } else {
    return "-";
  }

  if (isNaN(dateObj.getTime())) {
    return String(input);
  }

  const day = dateObj.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;

  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;

  return `${day} ${month} ${year}, ${hoursStr}:${minutesStr} ${ampm}`;
};

export const formatDateOnly = (input?: string | number | Date | null): string => {
  if (input === undefined || input === null || input === "") return "-";

  if (typeof input === "string") {
    const str = input.trim();
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/i.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d} ${monthNames[m - 1]} ${y}`;
    }
  }

  return formatDateTime(input).split(",")[0];
};

export default formatDateTime;
