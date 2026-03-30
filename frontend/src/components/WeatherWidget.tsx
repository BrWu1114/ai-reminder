import { useState, useEffect } from "react";

interface WeatherData {
  location: string;
  tempF: number;
  feelsLikeF: number;
  condition: string;
  description: string;
  humidity: number;
  windMph: number;
  icon: string;
  advisory: string[];
}

interface Props {
  /** Re-fetch when this changes (e.g. after location update) */
  refreshKey?: number;
}

export default function WeatherWidget({ refreshKey = 0 }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setWeather(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <div style={styles.placeholder}>Fetching weather…</div>;
  if (error)   return <div style={styles.placeholder}>🌡️ {error}</div>;
  if (!weather) return null;

  return (
    <div style={styles.widget}>
      <div style={styles.main}>
        <span style={styles.icon}>{weather.icon}</span>
        <div>
          <div style={styles.temp}>{weather.tempF}°F</div>
          <div style={styles.desc}>{weather.description}</div>
        </div>
        <div style={styles.extras}>
          <span>💧 {weather.humidity}%</span>
          <span>💨 {weather.windMph} mph</span>
          <span>Feels {weather.feelsLikeF}°F</span>
        </div>
      </div>

      {weather.advisory.length > 0 && (
        <div style={styles.advisories}>
          {weather.advisory.map((tip, i) => (
            <div key={i} style={styles.advisory}>{tip}</div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  widget: {
    background: "#16162a",
    border: "1px solid #2e2e3e",
    borderRadius: 10,
    padding: "10px 14px",
    margin: "0 0 0 0",
  },
  main: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  icon: { fontSize: 28, lineHeight: 1 },
  temp: { fontSize: 20, fontWeight: 700, color: "#e8e8f0" },
  desc: { fontSize: 12, color: "#888", textTransform: "capitalize" },
  extras: {
    marginLeft: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
    fontSize: 11,
    color: "#888",
  },
  advisories: {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  advisory: {
    fontSize: 12,
    color: "#a0d0f0",
    background: "#1a2a3a",
    borderRadius: 6,
    padding: "3px 8px",
  },
  placeholder: {
    fontSize: 12,
    color: "#666",
    padding: "6px 0",
  },
};
