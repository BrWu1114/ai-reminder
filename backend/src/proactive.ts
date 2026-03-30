import Anthropic from "@anthropic-ai/sdk";
import { getTodos } from "./tools/todos.js";
import { getCurrentLocation } from "./tools/location.js";
import { getAllContext } from "./tools/userContext.js";
import { getWeatherByCoords, getWeatherByCity, formatWeatherSummary } from "./tools/weather.js";
import db from "./db.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Reminder {
  message: string;
  type: "reminder" | "tip" | "warning";
}

export async function runProactiveCheck(): Promise<Reminder | null> {
  const todos = getTodos(false);
  const location = getCurrentLocation();
  const context = getAllContext();
  const now = new Date();

  // Don't bother if no todos and no context
  if (todos.length === 0 && !context.health_notes && !context.routines) return null;

  // Check last notification time — don't spam
  const lastNotif = db
    .prepare("SELECT timestamp FROM notifications ORDER BY id DESC LIMIT 1")
    .get() as { timestamp: string } | undefined;

  if (lastNotif) {
    const diffMs = now.getTime() - new Date(lastNotif.timestamp).getTime();
    if (diffMs < 10 * 60 * 1000) return null; // min 10 min between reminders
  }

  // Fetch weather if we have coordinates or a known location name
  let weatherBlock = "";
  try {
    if (location?.lat != null && location?.lng != null) {
      const w = await getWeatherByCoords(location.lat, location.lng);
      weatherBlock = `Current weather:\n${formatWeatherSummary(w)}`;
    } else if (location?.name && location.name !== "Unknown") {
      const w = await getWeatherByCity(location.name);
      weatherBlock = `Current weather:\n${formatWeatherSummary(w)}`;
    }
  } catch {
    // Weather unavailable — proceed without it
  }

  const prompt = `You are a proactive personal reminder assistant. Based on the user's current context, decide if there's a useful, timely reminder to send RIGHT NOW.

Current time: ${now.toLocaleString()}
Day of week: ${now.toLocaleDateString("en-US", { weekday: "long" })}
Current location: ${location?.name ?? "Unknown"}
${weatherBlock ? `\n${weatherBlock}\n` : ""}
Pending to-dos (${todos.length}):
${todos.map((t) => `- ${t.text}`).join("\n") || "None"}

User background:
- Health notes: ${context.health_notes || "None"}
- Routines: ${context.routines || "None"}
- Preferences: ${context.preferences || "None"}

Rules:
1. Only send a reminder if it is genuinely useful RIGHT NOW based on the time, location, weather, or routine.
2. Be specific — reference actual todos, weather conditions, or routines.
3. If weather is relevant (cold, rain, wind), mention it with actionable advice.
4. Keep it to 1-2 sentences max, friendly tone.
5. If there's nothing useful to say, respond with exactly: NO_REMINDER

Respond with ONLY the reminder message, or NO_REMINDER.`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 120,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content.find((b): b is Anthropic.TextBlock => b.type === "text")
      ?.text.trim() ?? "";

  if (!text || text === "NO_REMINDER" || text.startsWith("NO_")) return null;

  // Classify type
  const type: Reminder["type"] = text.toLowerCase().includes("medicine") ||
    text.toLowerCase().includes("medication") ||
    text.toLowerCase().includes("health")
    ? "warning"
    : "reminder";

  return { message: text, type };
}

export function saveNotification(message: string, type: string): number {
  const info = db
    .prepare("INSERT INTO notifications (message, type) VALUES (?, ?)")
    .run(message, type);
  return info.lastInsertRowid as number;
}

export function getNotifications(limit = 30) {
  return db
    .prepare(
      "SELECT * FROM notifications ORDER BY id DESC LIMIT ?"
    )
    .all(limit);
}

export function markRead(id: number) {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
}

export function markAllRead() {
  db.prepare("UPDATE notifications SET read = 1").run();
}
