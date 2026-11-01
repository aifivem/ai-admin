import { resourceExport } from "@aicore-fivem/lib/server";
import { ADMIN } from "@aicore-fivem/shared";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "../actions/result";
import { tell } from "./tell";

const core = resourceExport("ai-core");
const isAdmin = (source: number) =>
  Boolean(IsPlayerAceAllowed(String(source), ADMIN.ace));
/** QB `closeserver` / `openserver`: while closed, players without admin rights are kicked and refused. */
class ServerLock {
  /** Refusal text while closed (`/closeserver`), null while open. */
  private closed: string | null = null;

  constructor() {
    core.AddConnectionCheck("ai-admin:closed", (source) =>
      this.closed !== null && !isAdmin(source)
        ? Locale("KICK_CLOSED", this.closed)
        : null,
    );
  }

  /** QB `closeserver`: players without admin rights are kicked and refused until `openserver`. */
  close(source: number, reason: string | undefined): Result {
    if (this.closed !== null) return "ERR_ALREADY_CLOSED";
    this.closed = reason?.trim().slice(0, 200) || Locale("KICK_NO_REASON");
    for (const id of getPlayers())
      if (!isAdmin(Number(id)))
        DropPlayer(id, Locale("KICK_CLOSED", this.closed));
    tell(source, Locale("NOTIFY_SERVER_CLOSED"));
    actionLog("closed the server", source, undefined, { reason: this.closed });
    return null;
  }

  open(source: number): Result {
    if (this.closed === null) return "ERR_ALREADY_OPEN";
    this.closed = null;
    tell(source, Locale("NOTIFY_SERVER_OPENED"));
    actionLog("opened the server", source);
    return null;
  }
}

export const serverLock = new ServerLock();
