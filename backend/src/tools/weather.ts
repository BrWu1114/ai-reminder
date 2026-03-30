// OpenWeatherMap free tier — 1,000 calls/day.
// Sign up at https://openweathermap.org/api and add OPENWEATHER_API_KEY to .env

export interface WeatherData {
  location: string;
  tempF: number;
  feelsLikeF: number;
  condition: string;       // e.g. "Clear", "Rain", "Clouds"
  description: string;     // e.g. "light rain", "overcast clouds"
  humidity: number;
  windMph: number;
  icon: string;            // emoji representation
  advisory: string[];      // actionable hints: ["Bring a jacket", "Carry an umbrella"]
}

interface OWMResponse {
  name: string;
  main: { temp: number; feels_like: number; humidity: number };
  weather: { main: string; description: string }[];
  wind: { speed: number };
  cod: number;
  message?: string;
}

const API_KEY = () => process.env.OPENWEATHER_API_KEY ?? "";

// In-memory cache: key → { data, expiresAt }
const weatherCache = new Map<string, { data: WeatherData; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function conditionIcon(main: string): string {
  const map: Record<string, string> = {
    Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
    Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Fog: "🌫️",
    Haze: "🌫️", Dust: "💨", Sand: "💨", Tornado: "🌪️",
  };
  return map[main] ?? "🌡️";
}

function buildAdvisory(data: OWMResponse): string[] {
  const hints: string[] = [];
  const tempF = kelvinToF(data.main.temp);
  const feelsF = kelvinToF(data.main.feels_like);
  const cond = data.weather[0]?.main ?? "";
  const windMph = data.wind.speed * 2.237;

  if (feelsF < 50) hints.push("🧥 Bring a jacket — it feels cold outside");
  else if (feelsF < 60) hints.push("🧣 A light jacket or layer is a good idea");
  if (["Rain", "Drizzle"].includes(cond)) hints.push("☂️ Carry an umbrella");
  if (cond === "Thunderstorm") hints.push("⛈️ Thunderstorms likely — limit outdoor time");
  if (cond === "Snow") hints.push("🧤 Dress warmly and watch for icy roads");
  if (windMph > 25) hints.push("💨 Very windy — secure loose items");
  if (data.main.humidity > 85) hints.push("💧 High humidity today");

  return hints;
}

function kelvinToF(k: number) {
  return Math.round((k - 273.15) * 9 / 5 + 32);
}

export async function getWeatherByCoords(lat: number, lng: number): Promise<WeatherData> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const apiKey = API_KEY();
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not set in .env");

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
  const raw: OWMResponse = await res.json();

  if (raw.cod !== 200) throw new Error(`OpenWeatherMap: ${raw.message ?? raw.cod}`);

  const data: WeatherData = {
    location: raw.name,
    tempF: kelvinToF(raw.main.temp),
    feelsLikeF: kelvinToF(raw.main.feels_like),
    condition: raw.weather[0]?.main ?? "Unknown",
    description: raw.weather[0]?.description ?? "",
    humidity: raw.main.humidity,
    windMph: Math.round(raw.wind.speed * 2.237),
    icon: conditionIcon(raw.weather[0]?.main ?? ""),
    advisory: buildAdvisory(raw),
  };

  weatherCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export async function getWeatherByCity(city: string): Promise<WeatherData> {
  const key = `city:${city.toLowerCase()}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const apiKey = API_KEY();
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not set in .env");

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
  const raw: OWMResponse = await res.json();

  if (raw.cod !== 200) throw new Error(`OpenWeatherMap: ${raw.message ?? raw.cod}`);

  const data: WeatherData = {
    location: raw.name,
    tempF: kelvinToF(raw.main.temp),
    feelsLikeF: kelvinToF(raw.main.feels_like),
    condition: raw.weather[0]?.main ?? "Unknown",
    description: raw.weather[0]?.description ?? "",
    humidity: raw.main.humidity,
    windMph: Math.round(raw.wind.speed * 2.237),
    icon: conditionIcon(raw.weather[0]?.main ?? ""),
    advisory: buildAdvisory(raw),
  };

  weatherCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

/** Format weather for injection into prompts */
export function formatWeatherSummary(w: WeatherData): string {
  const lines = [
    `${w.icon} ${w.location}: ${w.tempF}°F (feels like ${w.feelsLikeF}°F), ${w.description}`,
    `Humidity ${w.humidity}%, Wind ${w.windMph} mph`,
  ];
  if (w.advisory.length > 0) lines.push(`Tips: ${w.advisory.join(" · ")}`);
  return lines.join("\n");
}
