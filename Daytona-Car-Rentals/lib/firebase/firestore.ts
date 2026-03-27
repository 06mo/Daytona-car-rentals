import "server-only";

import {
  FieldPath,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Transaction,
  type WhereFilterOp,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { deserializeFirestoreData, serializeFirestoreData } from "@/lib/firebase/converters";

export class FirebaseConfigError extends Error {
  constructor(message = "Firebase Admin credentials are not configured.") {
    super(message);
    this.name = "FirebaseConfigError";
  }
}

type QueryDirection = "asc" | "desc";

export type QueryConstraint = {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
};

export type QueryOrder = {
  field: string;
  direction?: QueryDirection;
};

export function requireDb(): Firestore {
  const db = getAdminDb();

  if (!db) {
    throw new FirebaseConfigError();
  }

  return db;
}

function mapSnapshot<T>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  return deserializeFirestoreData({
    id: snapshot.id,
    ...snapshot.data(),
  } as T);
}

export async function getDocument<T>(path: string): Promise<T | null> {
  const snapshot = await requireDb().doc(path).get();

  if (!snapshot.exists) {
    return null;
  }

  return mapSnapshot<T>(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function setDocument<T extends DocumentData>(
  path: string,
  data: T,
  options?: { merge?: boolean },
) {
  const reference = requireDb().doc(path);

  if (options) {
    await reference.set(serializeFirestoreData(data), options);
    return;
  }

  await reference.set(serializeFirestoreData(data));
}

export async function updateDocument<T extends DocumentData>(path: string, data: Partial<T>) {
  await requireDb().doc(path).update(serializeFirestoreData(data));
}

export async function deleteDocument(path: string) {
  await requireDb().doc(path).delete();
}

export async function addDocument<T extends DocumentData>(collectionPath: string, data: T) {
  const reference = await requireDb().collection(collectionPath).add(serializeFirestoreData(data));
  return reference.id;
}

export async function listDocuments<T>(
  collectionPath: string,
  options?: {
    filters?: QueryConstraint[];
    orderBy?: QueryOrder[];
    limit?: number;
  },
) {
  let query: Query<DocumentData> | CollectionReference<DocumentData> = requireDb().collection(collectionPath);

  for (const filter of options?.filters ?? []) {
    query = query.where(filter.field, filter.operator, serializeFirestoreData(filter.value));
  }

  for (const order of options?.orderBy ?? []) {
    query = query.orderBy(order.field, order.direction ?? "asc");
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => mapSnapshot<T>(doc));
}

export async function getDocumentByField<T>(collectionPath: string, field: string, value: unknown) {
  const snapshot = await requireDb()
    .collection(collectionPath)
    .where(field, "==", serializeFirestoreData(value))
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return mapSnapshot<T>(snapshot.docs[0]);
}

export async function runTransaction<T>(handler: Parameters<ReturnType<typeof requireDb>["runTransaction"]>[0]) {
  return requireDb().runTransaction(handler) as Promise<T>;
}

export function documentId() {
  return FieldPath.documentId();
}

export function toFirestoreTimestamp(value: Date) {
  return Timestamp.fromDate(value);
}

export type FirestoreTransaction = Transaction;
