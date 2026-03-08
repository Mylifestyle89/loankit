import { runDeadlineCheck } from "./deadline-check-logic";

const ONE_HOUR = 60 * 60 * 1000;
const SCHEDULER_KEY = "__deadline_scheduler_started__";

export function startDeadlineScheduler() {
  // Skip if external cron is configured (avoids duplicate notifications)
  if (process.env.CRON_SECRET) {
    console.log("[deadline-scheduler] Skipped — external cron configured (CRON_SECRET set).");
    return;
  }
  if ((globalThis as Record<string, unknown>)[SCHEDULER_KEY]) return;
  (globalThis as Record<string, unknown>)[SCHEDULER_KEY] = true;
  console.log("[deadline-scheduler] Starting hourly invoice deadline check...");

  void checkDeadlines();
  setInterval(() => void checkDeadlines(), ONE_HOUR);
}

async function checkDeadlines() {
  try {
    const result = await runDeadlineCheck();
    console.log(
      `[deadline-scheduler] Checked ${result.dueSoonChecked} due-soon, ${result.totalOverdue} overdue, ${result.emailsSent} emails sent.`,
    );
  } catch (err) {
    console.error("[deadline-scheduler] Error:", err);
  }
}
