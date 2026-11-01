import { addCommand } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import type { TeleportPoint } from "common/admin";
import { actions } from "../actions";
import { id } from "../commandParams";
import { answer, self } from "../commandReply";

/** "x y z", "x, y, z", "vector3(x, y, z)" or "x y" (onto the ground); a fourth number (heading) is ignored. */
function parsePoint(text: string): TeleportPoint | null {
  const numbers = (
    text.replace(/vec(tor)?[234]/gi, "").match(/-?\d+(\.\d+)?/g) ?? []
  ).map(Number);
  const [x, y, z] = numbers;
  if (x === undefined || y === undefined || numbers.length > 4) return null;
  return z === undefined ? { x, y } : { x, y, z };
}

addCommand(
  "noclip",
  { help: Locale("COMMAND_NOCLIP"), restricted: true },
  (source) =>
    answer(
      source,
      self(source, () => actions.noclip(source)),
    ),
);
addCommand("tpm", { help: Locale("COMMAND_TPM"), restricted: true }, (source) =>
  answer(
    source,
    self(source, () => actions.tpm(source)),
  ),
);
addCommand(
  "tp",
  {
    help: Locale("COMMAND_TP"),
    restricted: true,
    params: [
      { name: "coords", type: "longString", help: Locale("COMMAND_P_COORDS") },
    ],
  },
  (source, args) => {
    const point = parsePoint(args.coords);
    return answer(
      source,
      point ? self(source, () => actions.tp(source, point)) : "ERR_COORDS",
    );
  },
);
addCommand(
  "goto",
  { help: Locale("COMMAND_GOTO"), restricted: true, params: [id] },
  (source, args) =>
    answer(
      source,
      self(source, () => actions.goto(source, args.id)),
    ),
);
addCommand(
  "bring",
  { help: Locale("COMMAND_BRING"), restricted: true, params: [id] },
  (source, args) =>
    answer(
      source,
      self(source, () => actions.bring(source, args.id)),
    ),
);
addCommand(
  "coords",
  { help: Locale("COMMAND_COORDS"), restricted: true },
  (source) =>
    answer(
      source,
      self(source, () => actions.coords(source)),
    ),
);
