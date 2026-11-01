import { keyHints } from "@aicore-fivem/lib/client";
import { Locale } from "common";

/** The noclip controls in the HUD's key hints while flying. */
const NOCLIP_HINTS = [
  ["WASD", "HINT_NOCLIP_MOVE", "arrows-up-down-left-right"],
  ["Q/E", "HINT_NOCLIP_UPDOWN", "up-down"],
  ["SHIFT", "HINT_NOCLIP_FAST", "forward"],
  ["CTRL", "HINT_NOCLIP_SLOW", "backward"],
  ["SPACE", "HINT_NOCLIP_GROUND", "arrow-down"],
  ["V", "HINT_NOCLIP_VIEW", "eye"],
] as const;
export function noclipHints(on: boolean): void {
  NOCLIP_HINTS.forEach(([key, label, icon], i) =>
    on
      ? keyHints.show(`noclip${i}`, { key, label: Locale(label), icon })
      : keyHints.hide(`noclip${i}`),
  );
}
