import { Locale } from "common";
import { run } from "../runAction";
import { typed } from "./typed";

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
