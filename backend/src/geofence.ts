import db from "./db.js";
import { getContext } from "./tools/userContext.js";

export interface Coords {
  lat: number;
  lng: number;
}

export type GeofenceEvent =
  | { type: "left_home"; from: string; to: string }
  | { type: "arrived_home"; from: string }
  | { type: "arrived_place"; place: string; from: string }
  | { type: "significant_move"; from: string; to: string; distanceM: number };

// Haversine distance in metres between two coordinates
export function haversineM(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

// Parse "lat,lng" string stored in user_context
function parseCoords(val: string | null): Coords | null {
  if (!val) return null;
  const parts = val.split(",").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return { lat: parts[0], lng: parts[1] };
}

// Get the last known GPS position from location_history
export function getLastGpsPosition(): (Coords & { name: string }) | null {
  const row = db
    .prepare(
      "SELECT name, lat, lng FROM location_history WHERE lat IS NOT NULL ORDER BY id DESC LIMIT 1"
    )
    .get() as { name: string; lat: number; lng: number } | undefined;
  return row ?? null;
}

// SIGNIFICANT_MOVE_M: minimum distance change to be considered a new location event
const SIGNIFICANT_MOVE_M = 150;
// HOME_RADIUS_M: within this radius = "at home"
const HOME_RADIUS_M = 100;

export function detectGeofenceEvent(
  newCoords: Coords,
  newName: string
): GeofenceEvent | null {
  const prev = getLastGpsPosition();
  const homeStr = getContext("home_coords"); // "lat,lng"
  const homeCoords = parseCoords(homeStr);

  // If no previous GPS position, nothing to compare
  if (!prev || prev.lat == null) return null;
  const prevCoords: Coords = { lat: prev.lat, lng: prev.lng };

  const distMoved = haversineM(prevCoords, newCoords);
  if (distMoved < SIGNIFICANT_MOVE_M) return null; // Not a meaningful move

  const wasHome = homeCoords ? haversineM(homeCoords, prevCoords) < HOME_RADIUS_M : false;
  const isHome = homeCoords ? haversineM(homeCoords, newCoords) < HOME_RADIUS_M : false;

  if (wasHome && !isHome) {
    return { type: "left_home", from: prev.name, to: newName };
  }
  if (!wasHome && isHome) {
    return { type: "arrived_home", from: prev.name };
  }
  if (isHome) {
    return null; // Just wandering near home
  }

  return {
    type: "significant_move",
    from: prev.name,
    to: newName,
    distanceM: Math.round(distMoved),
  };
}

export function geofenceEventMessage(event: GeofenceEvent): string {
  switch (event.type) {
    case "left_home":
      return `📍 You've left home — heading to ${event.to}. Checking your to-do list for errands…`;
    case "arrived_home":
      return `🏠 Welcome back home! (from ${event.from})`;
    case "arrived_place":
      return `📍 You've arrived at ${event.place}.`;
    case "significant_move":
      return `📍 You've moved from ${event.from} → ${event.to} (~${event.distanceM}m).`;
  }
}
