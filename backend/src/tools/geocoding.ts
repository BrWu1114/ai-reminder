// Reverse geocoding via Nominatim (OpenStreetMap) — free, no API key required.
// Rate limit: 1 req/s. We cache results to stay well under that.

interface NominatimResponse {
  display_name: string;
  address?: {
    amenity?: string;
    shop?: string;
    cafe?: string;
    restaurant?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

// Simple in-process LRU-ish cache keyed by "lat2,lng2" (2 decimal places ≈ 1.1km)
const cache = new Map<string, string>();
const CACHE_KEY_PRECISION = 3; // ~110m grid

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(CACHE_KEY_PRECISION)},${lng.toFixed(CACHE_KEY_PRECISION)}`;
}

/** Returns a short human-readable place name for given coordinates. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = cacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lng}&format=json&zoom=17&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent
        "User-Agent": "AIReminderApp/1.0 (personal-project)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data: NominatimResponse = await res.json();

    const label = buildLabel(data);
    cache.set(key, label);

    // Evict if cache grows too large
    if (cache.size > 200) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    return label;
  } catch (err) {
    console.warn("[geocoding] Nominatim error:", err);
    // Fall back to coordinate string
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

function buildLabel(data: NominatimResponse): string {
  const a = data.address ?? {};

  // Priority: named place → road + city → city → display_name truncated
  const place =
    a.amenity || a.shop || a.cafe || a.restaurant;

  const city =
    a.city || a.town || a.village || a.suburb || a.neighbourhood || a.county;

  if (place && city) return `${place}, ${city}`;
  if (place) return place;

  const road = a.road;
  if (road && city) return `${road}, ${city}`;
  if (city && a.state) return `${city}, ${a.state}`;
  if (city) return city;

  // Last resort: first two parts of display_name
  const parts = data.display_name.split(",").map((s) => s.trim());
  return parts.slice(0, 2).join(", ");
}
