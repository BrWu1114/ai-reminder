import { useState, useEffect } from "react";

interface Notif {
  id: number;
  message: string;
  type: string;
  read: number;
  timestamp: string;
}

async function fetchNotifs(): Promise<Notif[]> {
  const res = await fetch("/api/notifications");
  return res.json();
}

async function markAllRead() {
  await fetch("/api/notifications/read-all", { method: "PATCH" });
}

async function triggerCheck() {
  await fetch("/api/notifications/trigger", { method: "POST" });
}

interface Props {
  refreshKey: number; // increment externally to force a refresh
}

export default function NotificationBell({ refreshKey }: Props) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const refresh = () => fetchNotifs().then(setNotifs);

  useEffect(() => { refresh(); }, [refreshKey]);

  const unread = notifs.filter((n) => !n.read).length;

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      markAllRead().then(refresh);
    }
  };

  const handleTrigger = async () => {
    await triggerCheck();
    setTimeout(refresh, 2000);
  };

  const icon = (type: string) =>
    type === "warning" ? "⚠️" : type === "tip" ? "💡" : "🔔";

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={styles.wrap}>
      <button onClick={handleOpen} style={styles.bell} title="Notifications">
        🔔
        {unread > 0 && (
          <span style={styles.badge}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Reminders</span>
            <button onClick={handleTrigger} style={styles.triggerBtn} title="Run a check now">
              ▶ Check now
            </button>
          </div>

          <div style={styles.list}>
            {notifs.length === 0 && (
              <p style={styles.empty}>No reminders yet.</p>
            )}
            {notifs.map((n) => (
              <div
                key={n.id}
                style={{ ...styles.item, opacity: n.read ? 0.55 : 1 }}
              >
                <span>{icon(n.type)}</span>
                <div style={styles.itemContent}>
                  <p style={styles.itemMsg}>{n.message}</p>
                  <p style={styles.itemTime}>{timeAgo(n.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { position: "relative" },
  bell: {
    background: "#1e1e2a",
    color: "#fff",
    fontSize: 18,
    padding: "6px 10px",
    border: "1px solid #2e2e3e",
    borderRadius: 10,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    background: "#e05c5c",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 10,
    padding: "1px 5px",
    lineHeight: 1.4,
  },
  panel: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 320,
    background: "#1a1a24",
    border: "1px solid #2e2e3e",
    borderRadius: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    zIndex: 500,
    overflow: "hidden",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #2e2e3e",
  },
  panelTitle: { fontWeight: 600, fontSize: 14 },
  triggerBtn: {
    background: "#2e2e4e",
    color: "#a0a0f0",
    fontSize: 11,
    padding: "4px 8px",
    border: "1px solid #3e3e5e",
    borderRadius: 6,
  },
  list: { maxHeight: 320, overflowY: "auto", padding: "8px 0" },
  empty: { color: "#666", fontSize: 13, textAlign: "center", padding: "24px 0" },
  item: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "10px 16px",
    borderBottom: "1px solid #1e1e2a",
    fontSize: 13,
  },
  itemContent: { flex: 1 },
  itemMsg: { lineHeight: 1.45, color: "#e8e8f0" },
  itemTime: { color: "#666", fontSize: 11, marginTop: 3 },
};
