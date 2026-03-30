import { Router } from "express";
import { getCurrentLocation, setLocation, getLocationHistory } from "../tools/location.js";
import { detectGeofenceEvent, geofenceEventMessage } from "../geofence.js";
import { runProactiveCheck, saveNotification } from "../proactive.js";
import { sseManager } from "../sse.js";
import { setContext } from "../tools/userContext.js";
import { reverseGeocode } from "../tools/geocoding.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getCurrentLocation() ?? { name: "Unknown" });
});

router.post("/", async (req, res) => {
  let { name, lat, lng, setAsHome } = req.body;

  // Auto-resolve GPS coordinates to a human place name via Nominatim
  if (lat != null && lng != null) {
    const isRawCoord = !name?.trim() || /^📍\s*-?\d/.test(name);
    if (isRawCoord) {
      name = await reverseGeocode(lat, lng);
    }
  }

  if (!name?.trim()) return res.status(400).json({ error: "name is required" });

  // Detect geofence transition before saving (compares to previous position)
  const geofenceEvent =
    lat != null && lng != null
      ? detectGeofenceEvent({ lat, lng }, name.trim())
      : null;

  const loc = setLocation(name.trim(), lat, lng);

  if (setAsHome && lat != null && lng != null) {
    setContext("home_coords", `${lat},${lng}`);
    setContext("home_location", name.trim());
  }

  res.json(loc);

  // Fire SSE location_change immediately with the resolved place name
  sseManager.send("location_change", {
    location: loc,
    event: geofenceEvent,
    timestamp: new Date().toISOString(),
  });

  if (geofenceEvent) {
    const quickMsg = geofenceEventMessage(geofenceEvent);
    const id = saveNotification(quickMsg, "reminder");
    sseManager.send("reminder", {
      id,
      message: quickMsg,
      type: "reminder",
      timestamp: new Date().toISOString(),
    });

    runProactiveCheck().then((reminder) => {
      if (reminder) {
        const rid = saveNotification(reminder.message, reminder.type);
        sseManager.send("reminder", {
          id: rid,
          message: reminder.message,
          type: reminder.type,
          timestamp: new Date().toISOString(),
        });
      }
    }).catch(console.error);
  }
});

router.get("/history", (_req, res) => {
  res.json(getLocationHistory());
});

export default router;
