"use client";

export const MAGIC_LINK_EMAIL_STORAGE_KEY = "pendingMagicLinkEmail";

export function setSessionCookie(token: string) {
  document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;
}

export function clearSessionCookie() {
  document.cookie = "__session=; path=/; max-age=0; SameSite=Strict; Secure";
}

export function storePendingMagicLinkEmail(email: string) {
  window.localStorage.setItem(MAGIC_LINK_EMAIL_STORAGE_KEY, email);
}

export function getPendingMagicLinkEmail() {
  return window.localStorage.getItem(MAGIC_LINK_EMAIL_STORAGE_KEY);
}

export function clearPendingMagicLinkEmail() {
  window.localStorage.removeItem(MAGIC_LINK_EMAIL_STORAGE_KEY);
}
