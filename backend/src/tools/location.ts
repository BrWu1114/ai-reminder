import db from "../db.js";

export interface Location {
  name: string;
  lat?: number;
  lng?: number;
  timestamp: string;
}

export function getCurrentLocation(): Location | null {
  const row = db
    .prepare("SELECT * FROM location_history ORDER BY timestamp DESC LIMIT 1")
    .get() as any;
  return row || null;
}

export function setLocation(name: string, lat?: number, lng?: number): Location {
  db.prepare(
    "INSERT INTO location_history (name, lat, lng) VALUES (?, ?, ?)"
  ).run(name, lat ?? null, lng ?? null);
  return getCurrentLocation()!;
}

export function getLocationHistory(limit = 10): Location[] {
  return db
    .prepare("SELECT * FROM location_history ORDER BY timestamp DESC LIMIT ?")
    .all(limit) as Location[];
}
