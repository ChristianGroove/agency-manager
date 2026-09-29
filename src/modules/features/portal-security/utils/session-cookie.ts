import { cookies } from "next/headers";
import {
  createPortalSessionSignature,
  verifyPortalSessionSignature,
} from "./pin-crypto";

export const PORTAL_COOKIE_PREFIX = "pixy_portal_pin_";

/**
 * Returns whether the portal session cookie exists, is valid, and matches the staff ID.
 */
export async function isPortalSessionUnlocked(
  token: string,
  staffId: string
): Promise<boolean> {
  if (!token || !staffId) return false;

  try {
    const cookieStore = await cookies();
    const cookieName = `${PORTAL_COOKIE_PREFIX}${token}`;
    const cookie = cookieStore.get(cookieName);

    if (!cookie || !cookie.value) return false;

    return verifyPortalSessionSignature(cookie.value, token, staffId);
  } catch (err) {
    console.error("Portal security: Error reading session cookie:", err);
    return false;
  }
}

/**
 * Sets a secure HttpOnly cookie upon successful PIN verification.
 */
export async function setPortalSessionCookie(
  token: string,
  staffId: string,
  rememberDevice: boolean
): Promise<void> {
  try {
    const cookieStore = await cookies();
    const cookieName = `${PORTAL_COOKIE_PREFIX}${token}`;

    // 30 days if remember device, otherwise 12 hours
    const durationMs = rememberDevice
      ? 30 * 24 * 60 * 60 * 1000
      : 12 * 60 * 60 * 1000;
    const expiresAt = Date.now() + durationMs;

    const signature = createPortalSessionSignature(token, staffId, expiresAt);

    cookieStore.set(cookieName, signature, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(durationMs / 1000),
      expires: new Date(expiresAt),
    });
  } catch (err) {
    console.error("Portal security: Error setting session cookie:", err);
  }
}

/**
 * Clears the portal session cookie when user locks or removes PIN.
 */
export async function clearPortalSessionCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    const cookieName = `${PORTAL_COOKIE_PREFIX}${token}`;
    cookieStore.delete(cookieName);
  } catch (err) {
    console.error("Portal security: Error clearing session cookie:", err);
  }
}
