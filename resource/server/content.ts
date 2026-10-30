import { readSettings } from "common/admin";
import { readControls } from "common/controls";
import { Panel } from "./panel";
import { adminSchema } from "./schema";

export const panel = new Panel(adminSchema);

/** Panel content, parsed again after every change. */
export const content = {
  settings: readSettings(panel.get("settings")),
  controls: readControls(panel.get("controls")),
};
panel.onChange(
  "settings",
  () => (content.settings = readSettings(panel.get("settings"))),
);
panel.onChange(
  "controls",
  () => (content.controls = readControls(panel.get("controls"))),
);

/** Stores fields of the Messages / World form the script changed itself (the panel shows them); unchanged ones are skipped. */
export function commitControls(change: Partial<Record<string, unknown>>): void {
  const current = panel.get<Record<string, unknown>>("controls");
  if (Object.entries(change).every(([k, v]) => current[k] === v)) return;
  panel.commit("controls", undefined, { ...current, ...change });
}
