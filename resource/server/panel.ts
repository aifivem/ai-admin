import { AdminPanel } from "@aicore-fivem/lib/server";
import type { AdminResult } from "@aicore-fivem/shared";

/**
 * The lib's panel plus the admin whose edit is being applied: `onChange` handlers run inside `apply`, so they read
 * `editor` (0 = a change the script made itself with `commit`).
 */
export class Panel extends AdminPanel {
  editor = 0;

  override apply(admin: number, raw: unknown): AdminResult {
    this.editor = admin;
    try {
      return super.apply(admin, raw);
    } finally {
      this.editor = 0;
    }
  }
}
