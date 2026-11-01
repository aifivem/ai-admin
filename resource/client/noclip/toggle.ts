import {
  AdminWorld,
  callAction,
  notify,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, readSettings } from "common/admin";
import { noclipHints } from "./hints";
import { Noclip } from "./noclip";

const world = new AdminWorld(["settings"]);
const settings = world.view("settings", readSettings);
export const noclip = new Noclip(() => settings.value);

/** Noclip off is only reported (the server logs it); on is asked through `callAction`. */
export const reportNoclip = (on: boolean) =>
  triggerServerCallback(EVENTS.noclip, [on]).catch(() => null);

/** Noclip on asks the server first (admins only); off is always allowed and reported once the player landed. */
export async function setNoclip(on: boolean): Promise<void> {
  if (!on) {
    noclipHints(false);
    noclip.stop(() => void reportNoclip(false));
    notify(Locale("NOTIFY_NOCLIP_OFF"), "info");
    return;
  }
  const allowed = await callAction(EVENTS.noclip, [true], {
    fallback: "ERR_NOT_ALLOWED",
  });
  if (!allowed) return;
  noclip.start();
  noclipHints(true);
  notify(Locale("NOTIFY_NOCLIP_ON"), "success");
}
