import type { PanelSchema } from "@aicore-fivem/shared";
import { controlsFile, messagesTab } from "./messages";
import { settingsFile, settingsTab } from "./settings";
import { worldTab } from "./world";

/** ai-admin's panel: noclip speeds and the admin car; messages and world controls. */
export const adminSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "user",
  files: {
    settings: settingsFile,
    controls: controlsFile,
  },
  tabs: [settingsTab, messagesTab, worldTab],
};
