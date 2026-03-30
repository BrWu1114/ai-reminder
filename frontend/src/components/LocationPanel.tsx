import { useState, useEffect } from "react";
import { getLocation, setLocation } from "../api";
import { useGeolocation } from "../hooks/useGeolocation";
import WeatherWidget from "./WeatherWidget";

const QUICK_LOCATIONS = ["Home", "Office", "San Francisco", "Grocery Store", "Gym"];

interface Props {
  /** Called when location_change SSE events arrive, so parent can surface toasts */
  onLocationEvent?: (event: unknown) => void;
}

export default function LocationPanel({ onLocationEvent: _ }: Props) {
  const [current, setCurrent] = useState<{ name: string } | null>(null);
  const [input, setInput] = useState("");
  const [setAsHome, setSetAsHome] = useState(false);
  const [weatherRefresh, setWeatherRefresh] = useState(0);
  const { state: geo, startTracking, stopTracking } = useGeolocation();

  useEffect(() => { getLocation().then(setCurrent); }, []);

  // Refresh displayed location + weather when tracker sends an update
  useEffect(() => {
    if (geo.lastSent) {
      getLocation().then(setCurrent);
      setWeatherRefresh((n) => n + 1);
    }
  }, [geo.lastSent]);

  const update = async (name: string, lat?: number, lng?: number, asHome = false) => {
    const body: Record<string, unknown> = { name, lat, lng };
    if (asHome) body.setAsHome = true;
    const res = await fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const loc = await res.json();
    setCurrent(loc);
    setInput("");
    setSetAsHome(false);
    setWeatherRefresh((n) => n + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) update(input.trim(), undefined, undefined, setAsHome);
  };

  const timeSince = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>📍 Location</span>
        {/* Live-tracking pill */}
        <button
          onClick={geo.tracking ? stopTracking : startTracking}
          style={{
            ...styles.trackPill,
            background: geo.tracking ? "#2a3a2a" : "#1e1e2a",
            borderColor: geo.tracking ? "#5cd05c" : "#3e3e5e",
            color: geo.tracking ? "#5cd05c" : "#888",
          }}
        >
          <span style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: geo.tracking ? "#5cd05c" : "#555",
            marginRight: 6,
            animation: geo.tracking ? "pulse 1.4s infinite" : "none",
          }} />
          {geo.tracking ? "Tracking" : "Track GPS"}
        </button>
      </div>

      {/* Current location */}
      <div style={styles.current}>
        <span style={styles.pin}>📌</span>
        <div>
          <div style={styles.locationName}>{current?.name ?? "Unknown"}</div>
          {geo.tracking && geo.lastSent && (
            <div style={styles.lastSent}>Updated {timeSince(geo.lastSent)}</div>
          )}
          {geo.error && <div style={styles.errorText}>{geo.error}</div>}
        </div>
      </div>

      {/* Weather widget */}
      <div style={{ padding: "0 12px 10px" }}>
        <WeatherWidget refreshKey={weatherRefresh} />
      </div>

      {/* Quick-pick buttons */}
      <div style={styles.quickRow}>
        {QUICK_LOCATIONS.map((loc) => (
          <button
            key={loc}
            onClick={() => update(loc)}
            style={{
              ...styles.quickBtn,
              background: current?.name === loc ? "#6c6cf0" : "#1e1e2a",
            }}
          >
            {loc}
          </button>
        ))}
      </div>

      {/* Manual input */}
      <form onSubmit={handleSubmit} style={styles.inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Custom location…"
          style={{ flex: 1 }}
        />
        <button type="submit" style={styles.setBtn}>Set</button>
      </form>

      {/* Set as home checkbox */}
      <label style={styles.homeLabel}>
        <input
          type="checkbox"
          checked={setAsHome}
          onChange={(e) => setSetAsHome(e.target.checked)}
          style={{ marginRight: 6 }}
        />
        <span style={{ fontSize: 12, color: "#888" }}>
          Set this as 🏠 home (for geofencing)
        </span>
      </label>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#13131a",
    borderRadius: 12,
    border: "1px solid #2e2e3e",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #2e2e3e",
  },
  title: { fontWeight: 600, fontSize: 15 },
  trackPill: {
    fontSize: 11,
    padding: "4px 10px",
    border: "1px solid",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  current: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 16px",
  },
  pin: { fontSize: 20 },
  locationName: { fontSize: 15, fontWeight: 600, color: "#a0a0f0" },
  lastSent: { fontSize: 11, color: "#5cd05c", marginTop: 2 },
  errorText: { fontSize: 11, color: "#e05c5c", marginTop: 2 },
  quickRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    padding: "0 16px 10px",
  },
  quickBtn: {
    color: "#e8e8f0",
    padding: "5px 10px",
    fontSize: 12,
    borderRadius: 20,
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "0 16px 10px",
  },
  setBtn: { background: "#6c6cf0", color: "#fff", padding: "8px 14px" },
  homeLabel: {
    display: "flex",
    alignItems: "center",
    padding: "0 16px 14px",
    cursor: "pointer",
  },
};
