import { Keybind, onServerEvent, onStop } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/admin";
import { noclip, setNoclip } from "./toggle";

onServerEvent(EVENTS.toggleNoclip, () => void setNoclip(!noclip.on));

// No default key: every player gets the mapping in their settings; admins bind it (or the owner sets one in ai-core's Keybinds tab).
new Keybind({
  name: "admin_noclip",
  description: Locale("KEYBIND_NOCLIP"),
  onPressed: () => void setNoclip(!noclip.on),
});

onStop(() => noclip.reset());
