import {
  definitions,
  isOnline,
  notify,
  online,
  resourceExport,
} from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "../actions/result";
import { playerLabel } from "../playerName";
import { tell } from "./tell";

const core = resourceExport("ai-core");

/** QB's job and gang commands on ai-core: set one, show the player's own. */
export const jobActions = {
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
    tell(source, Locale("NOTIFY_JOB_SET", playerLabel(target), job, grade));
    actionLog("set a job", source, target, { job, grade });
    return null;
  },

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
    tell(source, Locale("NOTIFY_GANG_SET", playerLabel(target), gang, grade));
    actionLog("set a gang", source, target, { gang, grade });
    return null;
  },

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
  },

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
  },
};
