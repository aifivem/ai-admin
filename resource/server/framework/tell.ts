import { notify } from "@aicore-fivem/lib/server";

/** A command's answer: a notification for a player, a console line for the server. */
export const tell = (source: number, text: string) => {
  if (source > 0) notify(source, text, "success");
  else console.log(text);
};
