import { characters, online, resourceExport } from "@aifivem/lib/server";
import type { CharacterResult } from "@aifivem/shared";
import type { Result } from "./actions/result";

const core = resourceExport("ai-core");

/** A character named by its citizenid, loaded or not. */
export interface Citizen {
  charId: number;
  citizenid: string;
  /** "Firstname Lastname (citizenid)" for notifications. */
  label: string;
  /** The player's server id while the character is loaded, else null. */
  source: number | null;
}

const citizen = (
  charId: number,
  citizenid: string,
  first: string,
  last: string,
  source: number | null,
): Citizen => ({
  charId,
  citizenid,
  label: `${first} ${last} (${citizenid})`,
  source,
});

/** A character by citizenid: a loaded one from memory, a stored one by its character id from ai-core. */
export async function findCitizen(text: string): Promise<Citizen | null> {
  const citizenid = text.trim();
  if (citizenid.length < 1 || citizenid.length > 16) return null;
  const source = core.GetSourceByCitizenId(citizenid);
  const loaded = source === null ? null : online.character(source);
  if (source !== null && loaded)
    return citizen(
      loaded.id,
      citizenid,
      loaded.firstname,
      loaded.lastname,
      source,
    );
  const charId = await characters.idOf(citizenid);
  const stored = charId === null ? null : await characters.get(charId);
  return stored
    ? citizen(
        stored.info.id,
        citizenid,
        stored.info.firstname,
        stored.info.lastname,
        stored.source,
      )
    : null;
}

/** ai-core's character write refusals (its lang keys) as this resource's error keys. */
const CORE_ERRORS: Record<string, Result> = {
  ADMIN_PLAYERS_ERR_GONE: "ERR_CITIZEN",
  ADMIN_PLAYERS_ERR_FUNDS: "ERR_FUNDS",
  ADMIN_PLAYERS_ERR_ACCOUNT: "ERR_ACCOUNT",
  ADMIN_PLAYERS_ERR_AMOUNT: "ERR_AMOUNT",
  ILLEGAL_ERR_OFF: "ERR_ILLEGAL_OFF",
};

/** null when ai-core took the write, else the matching error key. */
export const coreError = (result: CharacterResult): Result =>
  result.ok ? null : (CORE_ERRORS[result.error] ?? "ERR_CHARACTER_BUSY");
