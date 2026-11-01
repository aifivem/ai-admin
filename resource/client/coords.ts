import { notify, onServerEvent, player } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/admin";

onServerEvent(EVENTS.coords, () => {
  const { x, y, z } = player.coords();
  const f = (n: number) => n.toFixed(2);
  const text = `vector4(${f(x)}, ${f(y)}, ${f(z)}, ${f(player.heading())})`;
  console.log(text);
  notify(Locale("NOTIFY_COORDS", text), "info", 15_000);
});
