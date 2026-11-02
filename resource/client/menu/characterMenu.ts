import { MENU_BACK } from "@aifivem/shared";
import { input, menu } from "@aifivem/lib/client";
import { Locale } from "common";
import { run } from "../runAction";

const NEEDS = [
  { id: "all", icon: "utensils", label: "NEED_ALL" },
  { id: "hunger", icon: "utensils", label: "NEED_HUNGER" },
  { id: "thirst", icon: "droplet", label: "NEED_THIRST" },
] as const;

/** Hunger, thirst or both of a player to a typed value (0-100). True = back to the player's menu. */
export async function statusMenu(
  target: number,
  name: string,
): Promise<boolean> {
  const picked = await menu({
    title: Locale("STATUS_TITLE", name),
    back: true,
    items: NEEDS.map((n) => ({
      id: n.id,
      label: Locale(n.label),
      icon: n.icon,
    })),
  });
  if (picked === MENU_BACK) return true;
  const need = NEEDS.find((n) => n.id === picked);
  if (!need) return false;
  const values = await input({
    title: Locale("STATUS_TITLE", name),
    confirm: Locale("STATUS_CONFIRM"),
    fields: [
      {
        name: "value",
        label: Locale("STATUS_VALUE"),
        type: "number",
        min: 0,
        max: 100,
        placeholder: "100",
      },
    ],
  });
  const value = Number(values?.value);
  if (values && Number.isFinite(value))
    await run("status", target, `${need.id}:${value}`);
  return false;
}

/** Marks a player's character legal or illegal. True = back to the player's menu. */
export async function illegalMenu(
  target: number,
  name: string,
): Promise<boolean> {
  const picked = await menu({
    title: Locale("ILLEGAL_TITLE", name),
    back: true,
    items: [
      { id: "1", label: Locale("MENU_SET_ILLEGAL"), icon: "mask" },
      { id: "0", label: Locale("MENU_SET_LEGAL"), icon: "scale-balanced" },
    ],
  });
  if (picked === MENU_BACK) return true;
  if (picked === "1" || picked === "0") await run("illegal", target, picked);
  return false;
}
