import crypto from "node:crypto";

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

/**
 * Validates that the input is a valid 6-digit numeric string.
 */
export function isValid6DigitPin(pin: string): boolean {
  return /^\d{6}$/.test(pin.trim());
}

/**
 * Hashes a 6-digit PIN using PBKDF2-HMAC-SHA256 with 100,000 iterations and a cryptographically secure 16-byte salt.
 * Never stores plain text PINs.
 */
export function hashPin(pin: string): string {
  const trimmed = pin.trim();
  if (!isValid6DigitPin(trimmed)) {
    throw new Error("El PIN debe contener exactamente 6 dígitos numéricos.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .pbkdf2Sync(trimmed, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");

  return `pbkdf2$${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${derivedKey}`;
}

/**
 * Verifies a PIN against a stored hash using timing-safe comparison to prevent side-channel attacks.
 * Also supports legacy SHA-256 or plain text fallback for backward compatibility if any existed.
 */
export function verifyPin(pin: string, storedHash: string): boolean {
  if (!pin || !storedHash) return false;
  const trimmedPin = pin.trim();

  // Modern PBKDF2 format: pbkdf2$sha256$100000$salt$hash
  if (storedHash.startsWith("pbkdf2$")) {
    try {
      const parts = storedHash.split("$");
      if (parts.length === 5) {
        const [, digest, iterationsStr, salt, expectedHashHex] = parts;
        const iterations = parseInt(iterationsStr, 10);
        if (isNaN(iterations) || iterations < 1000) return false;

        const computedKey = crypto
          .pbkdf2Sync(trimmedPin, salt, iterations, PBKDF2_KEYLEN, digest)
          .toString("hex");

        const expectedBuf = Buffer.from(expectedHashHex, "hex");
        const computedBuf = Buffer.from(computedKey, "hex");

        if (expectedBuf.length !== computedBuf.length) return false;
        return crypto.timingSafeEqual(expectedBuf, computedBuf);
      }
    } catch {
      return false;
    }
  }

  // Fallback 1: Plain SHA-256 (64 hex characters)
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const computed = crypto.createHash("sha256").update(trimmedPin).digest("hex");
    const expectedBuf = Buffer.from(storedHash, "hex");
    const computedBuf = Buffer.from(computed, "hex");
    if (expectedBuf.length !== computedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, computedBuf);
  }

  // Fallback 2: Legacy raw equality comparison with timing safety
  const rawExpected = Buffer.from(storedHash);
  const rawActual = Buffer.from(trimmedPin);
  if (rawExpected.length !== rawActual.length) return false;
  return crypto.timingSafeEqual(rawExpected, rawActual);
}

/**
 * Resolves the signing secret for portal session tokens.
 */
function getSessionSecret(): string {
  return (
    process.env.PORTAL_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "pixy-portal-secure-salt-key-2026"
  );
}

/**
 * Creates a tamper-proof HMAC-SHA256 signed session signature bound to the portal token and staff ID.
 */
export function createPortalSessionSignature(
  token: string,
  staffId: string,
  expiresAt: number
): string {
  const secret = getSessionSecret();
  const payload = `${token}:${staffId}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${hmac}`;
}

/**
 * Verifies a portal session signature with expiration check and timing-safe comparison.
 */
export function verifyPortalSessionSignature(
  signatureValue: string,
  token: string,
  staffId: string
): boolean {
  if (!signatureValue) return false;
  const parts = signatureValue.split(":");
  if (parts.length !== 4) return false;

  const [cookieToken, cookieStaffId, expiresAtStr, receivedHmac] = parts;
  if (cookieToken !== token || cookieStaffId !== staffId) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const secret = getSessionSecret();
  const expectedPayload = `${cookieToken}:${cookieStaffId}:${expiresAtStr}`;
  const expectedHmac = crypto.createHmac("sha256", secret).update(expectedPayload).digest("hex");

  const receivedBuf = Buffer.from(receivedHmac, "hex");
  const expectedBuf = Buffer.from(expectedHmac, "hex");

  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}
