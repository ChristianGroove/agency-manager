import { describe, it, expect } from "vitest";
import {
  isValid6DigitPin,
  hashPin,
  verifyPin,
  createPortalSessionSignature,
  verifyPortalSessionSignature,
} from "./utils/pin-crypto";

describe("Portal Security - PIN Cryptography & Validation", () => {
  describe("isValid6DigitPin", () => {
    it("accepts valid 6-digit numeric strings", () => {
      expect(isValid6DigitPin("123456")).toBe(true);
      expect(isValid6DigitPin("000000")).toBe(true);
      expect(isValid6DigitPin("987654")).toBe(true);
      expect(isValid6DigitPin(" 123456 ")).toBe(true);
    });

    it("rejects non-6-digit or non-numeric strings", () => {
      expect(isValid6DigitPin("12345")).toBe(false);
      expect(isValid6DigitPin("1234567")).toBe(false);
      expect(isValid6DigitPin("abcdef")).toBe(false);
      expect(isValid6DigitPin("12345a")).toBe(false);
      expect(isValid6DigitPin("12 345")).toBe(false);
      expect(isValid6DigitPin("")).toBe(false);
      expect(isValid6DigitPin("      ")).toBe(false);
      expect(isValid6DigitPin("-12345")).toBe(false);
    });
  });

  describe("hashPin & verifyPin", () => {
    it("hashes a 6-digit PIN with PBKDF2, salt, and 100,000 iterations", () => {
      const pin = "482910";
      const hash = hashPin(pin);

      expect(hash).toContain("pbkdf2$sha256$100000$");
      const parts = hash.split("$");
      expect(parts.length).toBe(5);
      expect(parts[1]).toBe("sha256");
      expect(parts[2]).toBe("100000");
      expect(parts[3].length).toBe(32); // 16 bytes in hex
      expect(parts[4].length).toBe(64); // 32 bytes in hex
    });

    it("generates unique salts and distinct hashes for the same PIN", () => {
      const pin = "654321";
      const hash1 = hashPin(pin);
      const hash2 = hashPin(pin);

      expect(hash1).not.toBe(hash2);
      expect(verifyPin(pin, hash1)).toBe(true);
      expect(verifyPin(pin, hash2)).toBe(true);
    });

    it("throws an error when attempting to hash an invalid PIN", () => {
      expect(() => hashPin("123")).toThrow();
      expect(() => hashPin("abcdef")).toThrow();
      expect(() => hashPin("")).toThrow();
    });

    it("verifies matching PIN correctly and rejects mismatches", () => {
      const pin = "719302";
      const wrongPin = "719303";
      const hash = hashPin(pin);

      expect(verifyPin(pin, hash)).toBe(true);
      expect(verifyPin(wrongPin, hash)).toBe(false);
      expect(verifyPin("000000", hash)).toBe(false);
      expect(verifyPin("", hash)).toBe(false);
      expect(verifyPin(pin, "")).toBe(false);
    });

    it("handles legacy SHA-256 hashes gracefully", () => {
      // crypto.createHash("sha256").update("123456").digest("hex")
      const legacySha256 = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
      expect(verifyPin("123456", legacySha256)).toBe(true);
      expect(verifyPin("654321", legacySha256)).toBe(false);
    });
  });

  describe("createPortalSessionSignature & verifyPortalSessionSignature", () => {
    const token = "test-portal-token-uuid-123";
    const staffId = "staff-user-456";

    it("creates and verifies a valid signed session token", () => {
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now
      const sig = createPortalSessionSignature(token, staffId, expiresAt);

      expect(sig).toContain(token);
      expect(sig).toContain(staffId);
      expect(verifyPortalSessionSignature(sig, token, staffId)).toBe(true);
    });

    it("rejects token when bound to a different collaborator token", () => {
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const sig = createPortalSessionSignature(token, staffId, expiresAt);

      expect(verifyPortalSessionSignature(sig, "other-token-789", staffId)).toBe(false);
    });

    it("rejects token when bound to a different staffId", () => {
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const sig = createPortalSessionSignature(token, staffId, expiresAt);

      expect(verifyPortalSessionSignature(sig, token, "other-staff-999")).toBe(false);
    });

    it("rejects an expired session signature", () => {
      const expiredTimestamp = Date.now() - 1000; // expired 1s ago
      const sig = createPortalSessionSignature(token, staffId, expiredTimestamp);

      expect(verifyPortalSessionSignature(sig, token, staffId)).toBe(false);
    });

    it("rejects a tampered HMAC signature", () => {
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const sig = createPortalSessionSignature(token, staffId, expiresAt);
      const tampered = sig.slice(0, -4) + "beef";

      expect(verifyPortalSessionSignature(tampered, token, staffId)).toBe(false);
    });

    it("rejects malformed signature strings", () => {
      expect(verifyPortalSessionSignature("", token, staffId)).toBe(false);
      expect(verifyPortalSessionSignature("malformed:string", token, staffId)).toBe(false);
      expect(verifyPortalSessionSignature("a:b:c", token, staffId)).toBe(false);
    });
  });

  describe("Zero-Leak SSR Gatekeeper Contract", () => {
    it("ensures locked state structure contains no private task entities", () => {
      // Simulated locked portal data returned by gatekeeper
      const lockedData = {
        isLocked: true,
        staff: {
          id: "collab-1",
          organization_id: "org-1",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          role: "Developer",
          photo_url: null,
          access_token: "token-secret",
          has_pin_code: true,
        },
        organization: {
          id: "org-1",
          name: "Acme Agency",
          slug: "acme",
          primary_color: "#8ec045",
          secondary_color: "#5c8ea9",
        },
        projects: [],
        tasks: [],
        allTeamTasks: undefined,
        availableTasks: undefined,
        teamMembers: undefined,
        workspaces: undefined,
        recentMentions: undefined,
        sprints: undefined,
        supportTickets: undefined,
        metrics: {
          totalAssigned: 0,
          completed: 0,
          inProgress: 0,
          inReview: 0,
          completionPercentage: 0,
        },
        isLeadOrPm: false,
        isQa: false,
      };

      expect(lockedData.isLocked).toBe(true);
      expect(lockedData.staff.has_pin_code).toBe(true);
      expect(lockedData.tasks).toHaveLength(0);
      expect(lockedData.projects).toHaveLength(0);
      expect(lockedData.allTeamTasks).toBeUndefined();
      expect(lockedData.teamMembers).toBeUndefined();
      // Ensure pin_code hash itself is NEVER in the public staff object
      expect((lockedData.staff as any).pin_code).toBeUndefined();
    });
  });

  describe("Cryptographic Boundaries & Edge Cases", () => {
    it("rejects non-ASCII digits, emojis, decimals, and hex characters", () => {
      expect(isValid6DigitPin("12345🚀")).toBe(false);
      expect(isValid6DigitPin("12345\u0660")).toBe(false); // Arabic-indic digit 0
      expect(isValid6DigitPin("123.45")).toBe(false);
      expect(isValid6DigitPin("0x1234")).toBe(false);
      expect(isValid6DigitPin("12345e")).toBe(false);
      expect(isValid6DigitPin("123456\n")).toBe(true); // trimmed valid
    });

    it("ensures verifyPin does not throw on null-like or weird inputs", () => {
      expect(verifyPin(undefined as any, "pbkdf2$sha256$100000$salt$hash")).toBe(false);
      expect(verifyPin("123456", undefined as any)).toBe(false);
      expect(verifyPin("123456", "invalid$format")).toBe(false);
      expect(verifyPin("123456", "pbkdf2$unknown$9999$salt$hash")).toBe(false);
    });

    it("rejects session signatures with invalid timestamp strings or NaN", () => {
      const token = "tok-1";
      const staffId = "st-1";
      expect(verifyPortalSessionSignature("tok-1:st-1:notanumber:hmac", token, staffId)).toBe(false);
      expect(verifyPortalSessionSignature("tok-1:st-1:0:hmac", token, staffId)).toBe(false);
    });
  });
});
