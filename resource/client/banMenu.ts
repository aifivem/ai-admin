import { BAN_DURATIONS, MENU_BACK } from "@aicore-fivem/shared";
import { menu } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { run } from "./tools";
import { typed } from "./worldMenu";

/**
 * Bans an online player: the length from a menu, then the reason; the server bans through ai-core (the player is
 * dropped at once). True = back to the player's menu (Escape on the lengths).
 */
export async function banPlayer(
  target: number,
  name: string,
): Promise<boolean> {
  const picked = await menu({
    title: Locale("BAN_TITLE", name),
    back: true,
    items: BAN_DURATIONS.map((d) => ({
      id: d.id,
      label: Locale(`BAN_D_${d.id}`),
      icon: d.minutes === null ? "gavel" : "clock",
    })),
  });
  if (picked === MENU_BACK) return true;
  const length = BAN_DURATIONS.find((d) => d.id === picked);
  if (!length) return false;
  const reason = await typed(
    Locale("BAN_TITLE", name),
    Locale("BAN_REASON"),
    Locale("BAN_CONFIRM"),
  );
  if (reason) await run("ban", target, `${length.minutes ?? 0}:${reason}`);
  return false;
}
