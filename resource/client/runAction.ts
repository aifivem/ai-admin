import { callAction } from "@aicore-fivem/lib/client";
import { EVENTS, type MenuAction } from "common/admin";

/** Asks the server to run an action (it checks the admin again and logs); only failures are shown here. */
export async function run(
  action: MenuAction,
  target: number | null = null,
  value: string | null = null,
): Promise<void> {
  await callAction(EVENTS.action, [action, target, value], {
    fallback: "ERR_NOT_ALLOWED",
  });
}
