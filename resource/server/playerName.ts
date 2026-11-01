/** A player's name (the server id while it has none). */
export const playerName = (source: number) =>
  GetPlayerName(String(source)) || String(source);
/** "name (id)" for notifications and logs. */
export const playerLabel = (target: number) =>
  `${playerName(target)} (${target})`;
