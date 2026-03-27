export function toLocalDateTimeInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
