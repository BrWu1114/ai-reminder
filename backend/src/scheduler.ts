import cron from "node-cron";
import { runProactiveCheck, saveNotification } from "./proactive.js";
import { sseManager } from "./sse.js";

let isRunning = false;

async function doCheck() {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log(`[cron] Running proactive check at ${new Date().toLocaleTimeString()}`);
    const reminder = await runProactiveCheck();
    if (reminder) {
      const id = saveNotification(reminder.message, reminder.type);
      console.log(`[cron] Sending reminder: "${reminder.message}"`);
      sseManager.send("reminder", {
        id,
        message: reminder.message,
        type: reminder.type,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log("[cron] No reminder needed.");
    }
  } catch (err) {
    console.error("[cron] Error during proactive check:", err);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  // Check every 15 minutes
  cron.schedule("*/15 * * * *", doCheck);
  console.log("[cron] Scheduler started — checks every 15 minutes.");
}

// Also export for manual trigger via API
export { doCheck as triggerCheck };
