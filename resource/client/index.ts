import { Keybind, notify, onServerEvent, player } from "@aicore-fivem/lib/client";
import { Locale, ResourceName } from "common";
import { EVENTS, toTeleportPoint } from "common/admin";
import { openMenu } from "./menu";
import { noclip, setNoclip, teleport } from "./tools";

onServerEvent(
  EVENTS.teleport,
  {
    args: ([p]) => {
      const point = toTeleportPoint(p);
      return point === undefined ? null : [point];
    },
  },
  (point) => void teleport(point),
);

onServerEvent(EVENTS.toggleNoclip, () => void setNoclip(!noclip.on));
onServerEvent(EVENTS.openMenu, () => void openMenu());

onServerEvent(EVENTS.coords, () => {
  const { x, y, z } = player.coords();
  const f = (n: number) => n.toFixed(2);
  const text = `vector4(${f(x)}, ${f(y)}, ${f(z)}, ${f(player.heading())})`;
  console.log(text);
  notify(Locale("NOTIFY_COORDS", text), "info", 15_000);
});

new Keybind({
  name: "admin_menu",
  description: Locale("KEYBIND_MENU"),
  defaultKey: "F9",
  onPressed: () => void openMenu(),
});
// No default key: every player gets the mapping in their settings; admins bind it (or the owner sets one in ai-core's Keybinds tab).
new Keybind({
  name: "admin_noclip",
  description: Locale("KEYBIND_NOCLIP"),
  onPressed: () => void setNoclip(!noclip.on),
});

on("onResourceStop", (resource: string) => {
  if (resource === ResourceName) noclip.reset();
});
