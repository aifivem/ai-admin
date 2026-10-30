import { int, num, record, str } from "@aicore-fivem/lib/shared";
import type { NotificationKind } from "@aicore-fivem/shared";

/** ai-admin's contracts and panel content. No natives. */

export const EVENTS = {
  /** Callback: () -> boolean whether the caller is an admin (the quick menu opens only then). */
  access: "ai-admin:access",
  /** Callback: (on: boolean) -> { ok, error? } noclip on (admins) or off (always allowed: a rank taken away mid-flight). */
  noclip: "ai-admin:noclip",
  /** Callback: () -> PlayerEntry[] everyone online, for the menu's player list (admins). */
  players: "ai-admin:players",
  /** Callback: (action: MenuAction, target: number | null, value: string | null) -> { ok, error? } (admins). */
  action: "ai-admin:action",
  /** Server -> admin: () toggle noclip (the /noclip command, checked on the server). */
  toggleNoclip: "ai-admin:client:toggleNoclip",
  /** Server -> player: (point: TeleportPoint | null) move there; no `z` = onto the ground; null = to the waypoint. */
  teleport: "ai-admin:client:teleport",
  /** Server -> admin: () open the quick menu (the /adminmenu command). */
  openMenu: "ai-admin:client:openMenu",
  /** Server -> admin: () print and show the position (the /coords command). */
  coords: "ai-admin:client:coords",
} as const;

/** What the quick menu asks the server to do; the commands run the same actions. */
export const MENU_ACTIONS = [
  "tpm",
  "heal",
  "revive",
  "car",
  "dv",
  "goto",
  "bring",
  "panel",
] as const;
export type MenuAction = (typeof MENU_ACTIONS)[number];
export const isMenuAction = (v: unknown): v is MenuAction =>
  typeof v === "string" && (MENU_ACTIONS as readonly string[]).includes(v);

/** Lang key of an action's error (also the `error` of a callback answer). */
export type ErrorKey = Extract<
  keyof typeof import("../../locales/en.json"),
  `ERR_${string}`
>;

export interface TeleportPoint {
  x: number;
  y: number;
  z?: number;
}

export interface PlayerEntry {
  id: number;
  name: string;
}

/** A teleport target from the server: null (waypoint), a point, or undefined when the value is not one. */
export function toTeleportPoint(v: unknown): TeleportPoint | null | undefined {
  if (v == null) return null;
  const p = record(v);
  if (
    typeof p.x !== "number" ||
    typeof p.y !== "number" ||
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.y)
  )
    return undefined;
  return typeof p.z === "number" && Number.isFinite(p.z)
    ? { x: p.x, y: p.y, z: p.z }
    : { x: p.x, y: p.y };
}

export function toPlayerEntries(v: unknown): PlayerEntry[] {
  if (!Array.isArray(v)) return [];
  const out: PlayerEntry[] = [];
  for (const raw of v) {
    const p = record(raw);
    if (typeof p.id === "number" && Number.isInteger(p.id))
      out.push({ id: p.id, name: str(p.name, String(p.id), 64) });
  }
  return out;
}

export interface Settings {
  /** Noclip speed level at start and after a wheel click. */
  noclipSpeed: number;
  noclipMaxSpeed: number;
  /** Speed level change per mouse wheel step. */
  noclipStep: number;
  /** Held Shift / Alt / Ctrl multiply the speed. */
  noclipFast: number;
  noclipFaster: number;
  noclipSlow: number;
  announceKind: NotificationKind;
  /** Seconds an announcement stays on screen. */
  announceSeconds: number;
}

const KINDS: NotificationKind[] = ["info", "success", "warning", "error"];

export function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const kind = KINDS.find((k) => k === s.announceKind) ?? "warning";
  return {
    noclipSpeed: num(s.noclipSpeed, 1, 0.1, 50),
    noclipMaxSpeed: num(s.noclipMaxSpeed, 16, 1, 100),
    noclipStep: num(s.noclipStep, 0.5, 0.1, 10),
    noclipFast: num(s.noclipFast, 2, 1, 20),
    noclipFaster: num(s.noclipFaster, 4, 1, 50),
    noclipSlow: num(s.noclipSlow, 0.05, 0.01, 1),
    announceKind: kind,
    announceSeconds: int(s.announceSeconds, 10, 2, 60),
  };
}
