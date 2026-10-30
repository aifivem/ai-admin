import { MENU_BACK } from "@aicore-fivem/shared";
import {
  input,
  menu,
  notify,
  optionalExport,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, toPlayerEntries, type MenuAction } from "common/admin";
import { waypoint } from "./teleport";
import { failure, noclip, setNoclip } from "./tools";

/** Asks the server to run an action (it checks the admin again and logs); only failures are shown here. */
async function run(
  action: MenuAction,
  target: number | null = null,
  value: string | null = null,
): Promise<void> {
  const error = failure(
    await triggerServerCallback(EVENTS.action, [action, target, value]).catch(
      () => null,
    ),
  );
  if (error) notify(error, "error");
}

async function spawnVehicle(): Promise<void> {
  const values = await input({
    title: Locale("CAR_TITLE"),
    confirm: Locale("CAR_CONFIRM"),
    fields: [
      {
        name: "model",
        label: Locale("CAR_MODEL"),
        type: "text",
        maxLength: 32,
        placeholder: "adder",
      },
    ],
  });
  const model = values?.model;
  if (typeof model === "string" && model.trim())
    await run("car", null, model.trim());
}

/** ai-hud's admin minimap toggle (the minimap on foot whatever the panel says), while ai-hud runs. */
const hudExports = () => optionalExport("ai-hud");
const mapAlways = () => hudExports()?.GetMinimapAlways() === true;

/** Item name and count; the server checks the item exists and gives it (to a player, else the admin). */
async function giveItem(target: number | null): Promise<void> {
  const values = await input({
    title: Locale("ITEM_TITLE"),
    confirm: Locale("ITEM_CONFIRM"),
    fields: [
      {
        name: "item",
        label: Locale("ITEM_NAME"),
        type: "text",
        maxLength: 48,
        placeholder: "water",
      },
      {
        name: "count",
        label: Locale("ITEM_COUNT"),
        type: "number",
        min: 1,
        max: 10_000,
      },
    ],
  });
  const item = values?.item;
  const count = values?.count;
  if (typeof item === "string" && item.trim() && typeof count === "number")
    await run("item", target, `${item.trim()}:${Math.floor(count)}`);
}

const PLAYER_ACTIONS = [
  { id: "goto", icon: "location-dot", label: "MENU_GOTO" },
  { id: "bring", icon: "hand-pointer", label: "MENU_BRING" },
  { id: "heal", icon: "heart-pulse", label: "MENU_HEAL" },
  { id: "revive", icon: "user", label: "MENU_REVIVE" },
  { id: "item", icon: "box", label: "MENU_GIVE_ITEM" },
  { id: "inventory", icon: "box-open", label: "MENU_OPEN_INVENTORY" },
] as const satisfies ReadonlyArray<{
  id: MenuAction;
  icon: string;
  label: string;
}>;

/**
 * Everyone online (asked when the list opens), then what to do with the picked player. Escape goes one menu back
 * (true = back to the main menu), holding it closes everything.
 */
async function playerMenu(): Promise<boolean> {
  for (;;) {
    const players = toPlayerEntries(
      await triggerServerCallback(EVENTS.players).catch(() => null),
    );
    const picked = await menu({
      title: Locale("MENU_PLAYERS"),
      back: true,
      items: players.map((p) => ({
        id: String(p.id),
        label: Locale("MENU_PLAYER", p.id, p.name),
        icon: "user",
      })),
    });
    if (picked === MENU_BACK) return true;
    const player = players.find((p) => String(p.id) === picked);
    if (!player) return false;
    const action = await menu({
      title: Locale("MENU_PLAYER", player.id, player.name),
      back: true,
      items: PLAYER_ACTIONS.map((a) => ({
        id: a.id,
        label: Locale(a.label),
        icon: a.icon,
      })),
    });
    if (action === MENU_BACK) continue;
    const chosen = PLAYER_ACTIONS.find((a) => a.id === action);
    if (chosen?.id === "item") await giveItem(player.id);
    else if (chosen) await run(chosen.id, player.id);
    return false;
  }
}

/** The quick admin menu (F9 or /adminmenu); opens only when the server says the player is an admin. */
export async function openMenu(): Promise<void> {
  if ((await triggerServerCallback(EVENTS.access).catch(() => false)) !== true)
    return;
  const picked = await menu({
    title: Locale("MENU_TITLE"),
    items: [
      {
        id: "noclip",
        label: Locale(noclip.on ? "MENU_NOCLIP_OFF" : "MENU_NOCLIP_ON"),
        icon: "eye",
      },
      {
        id: "tpm",
        label: Locale("MENU_TPM"),
        icon: "map-location-dot",
        disabled: waypoint() === null,
      },
      { id: "heal", label: Locale("MENU_HEAL_SELF"), icon: "heart-pulse" },
      { id: "revive", label: Locale("MENU_REVIVE_SELF"), icon: "user" },
      { id: "car", label: Locale("MENU_CAR"), icon: "car" },
      { id: "dv", label: Locale("MENU_DV"), icon: "car-rear" },
      { id: "item", label: Locale("MENU_GIVE_ITEM"), icon: "box" },
      { id: "players", label: Locale("MENU_PLAYERS"), icon: "users" },
      ...(hudExports()
        ? [
            {
              id: "map",
              label: Locale(mapAlways() ? "MENU_MAP_OFF" : "MENU_MAP_ON"),
              icon: "map",
            },
          ]
        : []),
      { id: "panel", label: Locale("MENU_PANEL"), icon: "sliders" },
    ],
  });
  switch (picked) {
    case "map":
      hudExports()?.SetMinimapAlways(!mapAlways());
      return;
    case "item":
      return giveItem(null);
    case "noclip":
      return setNoclip(!noclip.on);
    case "car":
      return spawnVehicle();
    case "players":
      if (await playerMenu()) return openMenu();
      return;
    case "tpm":
    case "heal":
    case "revive":
    case "dv":
    case "panel":
      return run(picked);
  }
}
