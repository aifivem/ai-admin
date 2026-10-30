import { MENU_BACK } from "@aicore-fivem/shared";
import { input, menu, triggerServerCallback } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/admin";
import { toWorldState, WEATHERS } from "common/controls";
import { run } from "./tools";

/** A text typed in the input dialog (trimmed), or null when it was closed or left empty. */
async function typed(
  title: string,
  label: string,
  confirm: string,
): Promise<string | null> {
  const values = await input({
    title,
    confirm,
    fields: [
      { name: "text", label, type: "text", maxLength: 300, multiline: true },
    ],
  });
  const text = values?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

/** A message to everyone (style from the panel's Messages tab). */
export async function announce(): Promise<void> {
  const text = await typed(
    Locale("ANNOUNCE_TITLE"),
    Locale("ANNOUNCE_TEXT"),
    Locale("ANNOUNCE_CONFIRM"),
  );
  if (text) await run("announce", null, text);
}

/** A warning to one player with the reason they see. */
export async function warn(target: number, name: string): Promise<void> {
  const reason = await typed(
    Locale("WARN_SEND_TITLE", name),
    Locale("WARN_REASON"),
    Locale("WARN_SEND"),
  );
  if (reason) await run("warn", target, reason);
}

async function setTime(): Promise<void> {
  const values = await input({
    title: Locale("TIME_TITLE"),
    confirm: Locale("TIME_CONFIRM"),
    fields: [
      {
        name: "hour",
        label: Locale("TIME_HOUR"),
        type: "number",
        min: 0,
        max: 23,
      },
      {
        name: "minute",
        label: Locale("TIME_MINUTE"),
        type: "number",
        min: 0,
        max: 59,
        placeholder: "0",
      },
    ],
  });
  const hour = Number(values?.hour);
  const minute = Number(values?.minute ?? 0) || 0;
  if (values && Number.isInteger(hour))
    await run("time", null, `${hour}:${Math.floor(minute)}`);
}

/** The weather list; true = back to the world menu. */
async function weatherMenu(current: string | null): Promise<boolean> {
  const picked = await menu({
    title: Locale("MENU_WEATHER"),
    back: true,
    items: WEATHERS.map((w) => ({
      id: w,
      label: Locale(`WEATHER_${w}`),
      icon: "snowflake",
      description: w === current ? Locale("MENU_CURRENT") : undefined,
    })),
  });
  if (picked === MENU_BACK) return true;
  if (picked) await run("weather", null, picked);
  return false;
}

/**
 * Weather, time, clock and blackout for everyone (ai-core's world layer on the server). Escape goes back (true =
 * back to the main menu).
 */
export async function worldMenu(): Promise<boolean> {
  for (;;) {
    const state = toWorldState(
      await triggerServerCallback(EVENTS.worldState).catch(() => null),
    );
    const time = state.time
      ? `${state.time.hour}:${String(state.time.minute).padStart(2, "0")}`
      : "-";
    const picked = await menu({
      title: Locale("MENU_WORLD"),
      back: true,
      items: [
        {
          id: "weather",
          label: Locale("MENU_WEATHER"),
          icon: "snowflake",
          description: state.weather ?? Locale("MENU_NO_WEATHER"),
        },
        {
          id: "time",
          label: Locale("MENU_TIME"),
          icon: "gauge",
          description: time,
        },
        { id: "freeze_on", label: Locale("MENU_FREEZE_ON"), icon: "lock" },
        { id: "freeze_off", label: Locale("MENU_FREEZE_OFF"), icon: "key" },
        { id: "blackout_on", label: Locale("MENU_BLACKOUT_ON"), icon: "eye" },
        { id: "blackout_off", label: Locale("MENU_BLACKOUT_OFF"), icon: "eye" },
      ],
    });
    switch (picked) {
      case MENU_BACK:
        return true;
      case "weather":
        if (await weatherMenu(state.weather)) continue;
        return false;
      case "time":
        await setTime();
        return false;
      case "freeze_on":
      case "freeze_off":
        await run("freeze", null, picked === "freeze_on" ? "1" : "0");
        return false;
      case "blackout_on":
      case "blackout_off":
        await run("blackout", null, picked === "blackout_on" ? "1" : "0");
        return false;
      default:
        return false;
    }
  }
}
