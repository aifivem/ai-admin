import { readSettings } from "common/admin";
import { readControls } from "common/controls";
import { AdminPanel } from "@aicore-fivem/lib/server";
import { adminSchema } from "./schema";

export const panel = new AdminPanel(adminSchema);

/** Panel content, kept current by the panel. */
const settings = panel.view("settings", readSettings);
const controls = panel.view("controls", readControls);
export const content = {
  get settings() {
    return settings.value;
  },
  get controls() {
    return controls.value;
  },
};

/** Stores fields of the Messages / World form the script changed itself (the panel shows them); unchanged ones are skipped. */
export function commitControls(change: Partial<Record<string, unknown>>): void {
  const current = panel.get<Record<string, unknown>>("controls");
  if (Object.entries(change).every(([k, v]) => current[k] === v)) return;
  panel.commit("controls", undefined, { ...current, ...change });
}
