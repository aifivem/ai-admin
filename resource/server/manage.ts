import {
  aiLog,
  definitions,
  isOnline,
  notify,
  online,
  resourceExport,
} from "@aicore-fivem/lib/server";
import { ADMIN } from "@aicore-fivem/shared";
import { Locale } from "common";
import type { Result } from "./actions";

const core = resourceExport("ai-core");

const name = (source: number) =>
  `${GetPlayerName(String(source)) || source} (${source})`;
const log = (
  message: string,
  source: number,
  target?: number,
  metadata?: Record<string, unknown>,
) =>
  aiLog("actions", message, {
    source: source > 0 ? source : undefined,
    target,
    metadata,
  });
const tell = (source: number, text: string) => {
  if (source > 0) notify(source, text, "success");
  else console.log(text);
};
const isAdmin = (source: number) =>
  Boolean(IsPlayerAceAllowed(String(source), ADMIN.ace));
const PERMISSION = /^[a-z0-9_]{1,24}$/;

/** The QB / ESX admin commands on ai-core: jobs, gangs, money, server-wide cleanup, permissions, closing the server. */
class Manage {
  /** Refusal text while closed (`/closeserver`), null while open. */
  private closed: string | null = null;

  constructor() {
    core.AddConnectionCheck("ai-admin:closed", (source) =>
      this.closed !== null && !isAdmin(source)
        ? Locale("KICK_CLOSED", this.closed)
        : null,
    );
  }

  /** QB `setjob`: `unemployed` takes every job away. */
  setJob(source: number, target: number, job: string, grade: number): Result {
    if (!isOnline(target)) return "ERR_TARGET";
    if (job === "unemployed") {
      for (const m of core.GetJobs(target) ?? []) core.RemoveJob(target, m.job);
    } else {
      const def = definitions.job(job);
      if (!def) return "ERR_JOB";
      if (!def.grades[grade]) return "ERR_GRADE";
      if (!core.SetJob(target, job, grade)) return "ERR_JOB";
    }
    tell(source, Locale("NOTIFY_JOB_SET", name(target), job, grade));
    log("set a job", source, target, { job, grade });
    return null;
  }

  /** QB `setgang`: `none` takes every gang away. */
  setGang(source: number, target: number, gang: string, grade: number): Result {
    if (!isOnline(target)) return "ERR_TARGET";
    if (gang === "none") {
      for (const m of core.GetGangs(target) ?? [])
        core.RemoveGang(target, m.gang);
    } else {
      const def = definitions.gang(gang);
      if (!def) return "ERR_GANG";
      if (!def.grades[grade]) return "ERR_GRADE";
      if (!core.SetGang(target, gang, grade)) return "ERR_GANG";
    }
    tell(source, Locale("NOTIFY_GANG_SET", name(target), gang, grade));
    log("set a gang", source, target, { gang, grade });
    return null;
  }

  /** QB `givemoney` / `setmoney` (ESX `giveaccountmoney` / `setaccountmoney`). */
  money(
    source: number,
    target: number,
    account: string,
    amount: number,
    set: boolean,
  ): Result {
    if (!isOnline(target)) return "ERR_TARGET";
    if (!core.GetAccountTypes()[account]) return "ERR_ACCOUNT";
    if (!Number.isInteger(amount) || amount < (set ? 0 : 1) || amount > 1e9)
      return "ERR_AMOUNT";
    const ok = set
      ? core.SetMoney(target, account, amount, "admin")
      : core.AddMoney(target, account, amount, "admin");
    if (!ok) return "ERR_AMOUNT";
    tell(
      source,
      Locale(
        set ? "NOTIFY_MONEY_SET" : "NOTIFY_MONEY_GIVEN",
        name(target),
        account,
        amount,
      ),
    );
    log(set ? "set money" : "gave money", source, target, { account, amount });
    return null;
  }

  /** QB `job`: the player's own job, rank and duty. */
  showJob(source: number): Result {
    const current = core.GetCurrentJob(source);
    if (!current) return "ERR_PLAYER_ONLY";
    const def = definitions.job(current.job);
    const duty = online.dutyJob(source) === current.job;
    notify(
      source,
      Locale(
        "NOTIFY_JOB_INFO",
        def?.label ?? current.job,
        def?.grades[current.grade]?.label ?? String(current.grade),
        Locale(duty ? "NOTIFY_ON_DUTY" : "NOTIFY_OFF_DUTY"),
      ),
      "info",
    );
    return null;
  }

  /** QB `gang`: the player's active gang and rank. */
  showGang(source: number): Result {
    const active = core.GetActiveGang(source);
    const grade = active ? online.gangGrade(source, active) : null;
    if (!active || grade === null) {
      notify(source, Locale("NOTIFY_NO_GANG"), "info");
      return null;
    }
    const def = definitions.gang(active);
    notify(
      source,
      Locale(
        "NOTIFY_GANG_INFO",
        def?.label ?? active,
        def?.grades[grade]?.label ?? String(grade),
      ),
      "info",
    );
    return null;
  }

  /** QB `dvall` / `dvp` / `dvo`: every server-known vehicle / ped / object; players and the cars they sit in stay. */
  deleteAll(source: number, kind: "vehicles" | "peds" | "objects"): Result {
    const players = new Set<number>();
    const ridden = new Set<number>();
    for (const id of getPlayers()) {
      const ped = GetPlayerPed(id);
      players.add(ped);
      const vehicle = GetVehiclePedIsIn(ped, false);
      if (vehicle) ridden.add(vehicle);
    }
    const list: number[] =
      kind === "vehicles"
        ? GetAllVehicles()
        : kind === "peds"
          ? GetAllPeds()
          : GetAllObjects();
    let count = 0;
    for (const entity of list) {
      if (players.has(entity) || ridden.has(entity)) continue;
      DeleteEntity(entity);
      count++;
    }
    tell(source, Locale("NOTIFY_DELETED_ALL", count));
    log(`deleted every ${kind}`, source, undefined, { count });
    return null;
  }

  /** QB `addpermission` / `removepermission`: the player joins / leaves `group.<name>` until they leave. */
  permission(
    source: number,
    target: number,
    permission: string,
    add: boolean,
  ): Result {
    if (!isOnline(target)) return "ERR_TARGET";
    const group = permission.toLowerCase();
    if (!PERMISSION.test(group)) return "ERR_PERMISSION";
    ExecuteCommand(
      `${add ? "add_principal" : "remove_principal"} player.${target} group.${group}`,
    );
    tell(
      source,
      Locale(
        add ? "NOTIFY_PERMISSION_ADDED" : "NOTIFY_PERMISSION_REMOVED",
        name(target),
        group,
      ),
    );
    log(add ? "added a permission" : "removed a permission", source, target, {
      group,
    });
    return null;
  }

  /** QB `closeserver`: players without admin rights are kicked and refused until `openserver`. */
  close(source: number, reason: string | undefined): Result {
    if (this.closed !== null) return "ERR_ALREADY_CLOSED";
    this.closed = reason?.trim().slice(0, 200) || Locale("KICK_NO_REASON");
    for (const id of getPlayers())
      if (!isAdmin(Number(id)))
        DropPlayer(id, Locale("KICK_CLOSED", this.closed));
    tell(source, Locale("NOTIFY_SERVER_CLOSED"));
    log("closed the server", source, undefined, { reason: this.closed });
    return null;
  }

  open(source: number): Result {
    if (this.closed === null) return "ERR_ALREADY_OPEN";
    this.closed = null;
    tell(source, Locale("NOTIFY_SERVER_OPENED"));
    log("opened the server", source);
    return null;
  }
}

export const manage = new Manage();
