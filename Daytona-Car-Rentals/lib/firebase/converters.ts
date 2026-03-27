import { Timestamp } from "firebase-admin/firestore";

type UnknownRecord = Record<string, unknown>;

function isTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}

function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !isDate(value) && !isTimestamp(value);
}

export function serializeFirestoreData<T>(value: T): T {
  if (isDate(value)) {
    return Timestamp.fromDate(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreData(item)) as T;
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeFirestoreData(entry)]),
    ) as T;
  }

  return value;
}

export function deserializeFirestoreData<T>(value: T): T {
  if (isTimestamp(value)) {
    return value.toDate() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deserializeFirestoreData(item)) as T;
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deserializeFirestoreData(entry)]),
    ) as T;
  }

  return value;
}
