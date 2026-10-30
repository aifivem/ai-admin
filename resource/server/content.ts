import { AdminPanel } from "@aicore-fivem/lib/server";
import { readSettings } from "common/admin";
import { adminSchema } from "./schema";

export const panel = new AdminPanel(adminSchema);

/** Panel content, parsed again after every change. */
export const content = { settings: readSettings(panel.get("settings")) };
panel.onChange(
  "settings",
  () => (content.settings = readSettings(panel.get("settings"))),
);
