import type { ErrorKey } from "common/admin";

/**
 * Admin actions behind the commands and the quick menu. The caller already checked the admin; each returns null
 * when it ran, else the lang key of the error. Every action that changes something is logged.
 */
export type Result = ErrorKey | null;
