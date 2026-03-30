import { Router } from "express";
import { getWeatherByCoords, getWeatherByCity } from "../tools/weather.js";
import { getCurrentLocation } from "../tools/location.js";

const router = Router();

// GET /api/weather?city=San+Francisco  OR  ?lat=37.77&lng=-122.41
// Falls back to current saved location if no params given
router.get("/", async (req, res) => {
  try {
    const { city, lat, lng } = req.query;

    if (lat && lng) {
      const data = await getWeatherByCoords(Number(lat), Number(lng));
      return res.json(data);
    }
    if (city) {
      const data = await getWeatherByCity(String(city));
      return res.json(data);
    }

    // Use current location
    const loc = getCurrentLocation();
    if (loc?.lat != null && loc?.lng != null) {
      return res.json(await getWeatherByCoords(loc.lat, loc.lng));
    }
    if (loc?.name && loc.name !== "Unknown") {
      return res.json(await getWeatherByCity(loc.name));
    }

    res.status(400).json({ error: "No location available. Pass ?city= or ?lat=&lng=" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
