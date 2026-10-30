import {
  input,
  menu,
  notify,
  triggerServerCallback,
} from "@aicore-fivem/lib/client"
import { Locale } from "common"
import { EVENTS, toPlayerEntries, type MenuAction } from "common/admin"
import { waypoint } from "./teleport"
import { failure, noclip, setNoclip } from "./tools"

/** Asks the server to run an action (it checks the admin again and logs); only failures are shown here. */
async function run(
  action: MenuAction,
  target: number | null = null,
  value: string | null = null
): Promise<void> {
  const error = failure(
    await triggerServerCallback(EVENTS.action, [action, target, value]).catch(
      () => null
    )
  )
  if (error) notify(error, "error")
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
  })
  const model = values?.model
  if (typeof model === "string" && model.trim())
    await run("car", null, model.trim())
}

const PLAYER_ACTIONS = [
  { id: "goto", icon: "location-dot", label: "MENU_GOTO" },
  { id: "bring", icon: "hand-pointer", label: "MENU_BRING" },
  { id: "heal", icon: "heart-pulse", label: "MENU_HEAL" },
  { id: "revive", icon: "user", label: "MENU_REVIVE" },
] as const satisfies ReadonlyArray<{
  id: MenuAction
  icon: string
  label: string
}>

/** Everyone online (asked when the list opens), then what to do with the picked player. */
async function playerMenu(): Promise<void> {
  const players = toPlayerEntries(
    await triggerServerCallback(EVENTS.players).catch(() => null)
  )
  const picked = await menu({
    title: Locale("MENU_PLAYERS"),
    items: players.map((p) => ({
      id: String(p.id),
      label: Locale("MENU_PLAYER", p.id, p.name),
      icon: "user",
    })),
  })
  const player = players.find((p) => String(p.id) === picked)
  if (!player) return
  const action = await menu({
    title: Locale("MENU_PLAYER", player.id, player.name),
    items: PLAYER_ACTIONS.map((a) => ({
      id: a.id,
      label: Locale(a.label),
      icon: a.icon,
    })),
  })
  const chosen = PLAYER_ACTIONS.find((a) => a.id === action)
  if (chosen) await run(chosen.id, player.id)
}

/** The quick admin menu (F9 or /adminmenu); opens only when the server says the player is an admin. */
export async function openMenu(): Promise<void> {
  if ((await triggerServerCallback(EVENTS.access).catch(() => false)) !== true)
    return
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
      { id: "players", label: Locale("MENU_PLAYERS"), icon: "users" },
      { id: "panel", label: Locale("MENU_PANEL"), icon: "sliders" },
    ],
  })
  switch (picked) {
    case "noclip":
      return setNoclip(!noclip.on)
    case "car":
      return spawnVehicle()
    case "players":
      return playerMenu()
    case "tpm":
    case "heal":
    case "revive":
    case "dv":
    case "panel":
      return run(picked)
  }
}
