import { useState, useEffect } from "react";
import { getContext, updateContext } from "../api";

const FIELDS = [
  { key: "health_notes", label: "Health Notes", placeholder: "e.g. take blood pressure meds at 8am" },
  { key: "routines", label: "Daily Routines", placeholder: "e.g. morning coffee, gym Mon/Wed/Fri" },
  { key: "preferences", label: "Preferences", placeholder: "e.g. prefer concise reminders" },
  { key: "home_location", label: "Home Location", placeholder: "e.g. Palo Alto, CA" },
];

export default function ContextPanel() {
  const [ctx, setCtx] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => { getContext().then(setCtx); }, []);

  const handleChange = (key: string, value: string) => {
    setCtx((c) => ({ ...c, [key]: value }));
  };

  const handleSave = async (key: string) => {
    await updateContext(key, ctx[key] ?? "");
    setSaved(key);
    setTimeout(() => setSaved(null), 1500);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>👤 Your Profile</span>
      </div>
      <div style={styles.fields}>
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} style={styles.field}>
            <label style={styles.label}>{label}</label>
            <div style={styles.row}>
              <input
                value={ctx[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                style={{ flex: 1 }}
                onBlur={() => handleSave(key)}
              />
              {saved === key && <span style={styles.savedBadge}>✓</span>}
            </div>
          </div>
        ))}
        <p style={styles.hint}>
          The assistant uses this to give you context-aware reminders.
        </p>
      </div>
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
    padding: "12px 16px",
    borderBottom: "1px solid #2e2e3e",
  },
  title: { fontWeight: 600, fontSize: 15 },
  fields: { padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: "#888", fontWeight: 500 },
  row: { display: "flex", alignItems: "center", gap: 8 },
  savedBadge: { color: "#5cdb5c", fontSize: 16 },
  hint: { fontSize: 11, color: "#555", marginTop: 4 },
};
