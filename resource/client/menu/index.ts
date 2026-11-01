import { Keybind, onServerEvent } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/admin";
import { giveItem, openMenu } from "./menu";

onServerEvent(EVENTS.openMenu, () => void openMenu());
onServerEvent(EVENTS.openItems, () => void giveItem(null));

new Keybind({
  name: "admin_menu",
  description: Locale("KEYBIND_MENU"),
  defaultKey: "F9",
  onPressed: () => void openMenu(),
});
