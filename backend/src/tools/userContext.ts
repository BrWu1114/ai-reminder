import db from "../db.js";

export function getContext(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM user_context WHERE key = ?")
    .get(key) as any;
  return row?.value ?? null;
}

export function setContext(key: string, value: string): void {
  db.prepare(
    "INSERT OR REPLACE INTO user_context (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  ).run(key, value);
}

export function getAllContext(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM user_context").all() as any[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
