export function toLocalDateTimeInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const DEFAULT_BOOKING_TIME = "10:00";

export function buildBookingTimeOptions(intervalMinutes = 30) {
  const options: string[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += intervalMinutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const remainder = String(minutes % 60).padStart(2, "0");
    options.push(`${hours}:${remainder}`);
  }

  return options;
}

export function getNextAvailableBookingTime(intervalMinutes = 30) {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const roundedMinutes = Math.ceil((totalMinutes + 1) / intervalMinutes) * intervalMinutes;
  const safeMinutes = Math.min(roundedMinutes, 23 * 60 + 30);
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const minutes = String(safeMinutes % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function getMinimumBookingDateTime() {
  return toLocalDateTimeInput(new Date());
}

export function normalizeBookingDateTimeInput(value: string, fallbackTime = "10:00") {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T${fallbackTime}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16);
  }

  return toLocalDateTimeInput(parsed);
}

export function addDaysToBookingDateTime(value: string, days: number) {
  const parsed = new Date(normalizeBookingDateTimeInput(value));

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setDate(parsed.getDate() + days);
  return toLocalDateTimeInput(parsed);
}

export function splitBookingDateTime(value: string) {
  const normalized = normalizeBookingDateTimeInput(value, DEFAULT_BOOKING_TIME);

  if (!normalized || !normalized.includes("T")) {
    return {
      date: "",
      time: DEFAULT_BOOKING_TIME,
    };
  }

  const [date, time] = normalized.split("T");

  return {
    date,
    time: time?.slice(0, 5) || DEFAULT_BOOKING_TIME,
  };
}

export function combineBookingDateAndTime(date: string, time: string) {
  if (!date) {
    return "";
  }

  return `${date}T${time || DEFAULT_BOOKING_TIME}`;
}

export function getMinimumBookingDate() {
  return toLocalDateTimeInput(new Date()).split("T")[0];
}

export function getAvailableBookingTimes(date: string, intervalMinutes = 30) {
  const options = buildBookingTimeOptions(intervalMinutes);

  if (!date) {
    return options;
  }

  const today = getMinimumBookingDate();

  if (date !== today) {
    return options;
  }

  const minTime = getNextAvailableBookingTime(intervalMinutes);
  return options.filter((option) => option >= minTime);
}

export function toBookingApiDateTime(value: string) {
  const parsed = new Date(normalizeBookingDateTimeInput(value));

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

export function formatBookingDateTime(value: Date | string) {
  const parsed = typeof value === "string" ? new Date(normalizeBookingDateTimeInput(value)) : value;

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
