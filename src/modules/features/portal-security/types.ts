export interface PortalSecurityState {
  isLocked: boolean;
  hasPin: boolean;
  token: string;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
    role?: string | null;
  };
  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
    isotipoUrl?: string | null;
    primaryColor?: string;
  };
}

export interface VerifyPinResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  lockedUntil?: string;
}

export interface SetupPinResult {
  success: boolean;
  error?: string;
}

export interface RemovePinResult {
  success: boolean;
  error?: string;
}

export type PortalSecurityModalMode = "setup" | "change" | "remove";
