import { storageGetJSON, storageSetJSON, storageRemove } from "../lib/storage.js";
import { createPeriod, KEYS } from "../lib/schema.js";
import { getWeekNumber } from "../lib/weeklyScore.js";
import { cycleProgress, cycleDaysRemaining, dateKey } from "../lib/time.js";

let period = $state(null);

export function periodState() {
  return {
    get period() { return period; },
    get weekNumber() {
      return period ? getWeekNumber(period.startDate) : 1;
    },
    get cyclePercent() {
      return period ? cycleProgress(period.startDate) : 0;
    },
    get daysRemaining() {
      return period ? cycleDaysRemaining(period.startDate) : 84;
    },
    get isComplete() {
      return period ? cycleProgress(period.startDate) >= 100 : false;
    },
  };
}

export async function loadPeriod() {
  period = await storageGetJSON(KEYS.PERIOD, null);
}

export async function createAndSavePeriod({ name = "", startDate = null } = {}) {
  period = createPeriod({ name, startDate });
  await storageSetJSON(KEYS.PERIOD, period);
  return period;
}

/** Restart: reset start date to today, keep goals/tactics. */
export async function restartPeriod(name = "") {
  period = createPeriod({ name: name || period?.name || "", startDate: dateKey(new Date()) });
  await storageSetJSON(KEYS.PERIOD, period);
  return period;
}

export async function wipePeriod() {
  await storageRemove(KEYS.PERIOD);
  period = null;
}
