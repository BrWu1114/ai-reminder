import { useState, useCallback, useEffect } from "react";
import ChatPanel from "./components/ChatPanel";
import TodoPanel from "./components/TodoPanel";
import LocationPanel from "./components/LocationPanel";
import ContextPanel from "./components/ContextPanel";
import ToastContainer, { ToastData } from "./components/Toast";
import NotificationBell from "./components/NotificationBell";
import { useSSE } from "./hooks/useSSE";

let toastIdCounter = 0;

export default function App() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [bellRefresh, setBellRefresh] = useState(0);

  // Request browser notification permission on load
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleReminder = useCallback((data: unknown) => {
    const d = data as { id: number; message: string; type: "reminder" | "tip" | "warning" };

    // In-app toast
    setToasts((prev) => [...prev, { id: ++toastIdCounter, message: d.message, type: d.type }]);

    // Browser notification (when tab is not focused)
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification("AI Reminder", {
        body: d.message,
        icon: "/favicon.ico",
      });
    }

    // Refresh bell panel
    setBellRefresh((n) => n + 1);
  }, []);

  const handleLocationChange = useCallback((data: unknown) => {
    const d = data as { event?: { type: string } | null };
    // A geofence transition happened — the backend already fired a "reminder" SSE,
    // but we also refresh the bell to catch the location_change notification.
    if (d.event) setBellRefresh((n) => n + 1);
  }, []);

  useSSE({ reminder: handleReminder, location_change: handleLocationChange });

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const connectCalendar = () => {
    window.open("/auth/google", "_blank", "width=500,height=600");
    window.addEventListener(
      "message",
      (e) => { if (e.data === "calendar_connected") alert("✅ Google Calendar connected!"); },
      { once: true }
    );
  };

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.logo}>🧠 AI Reminder</div>
        <div style={styles.headerRight}>
          <NotificationBell refreshKey={bellRefresh} />
          <button onClick={connectCalendar} style={styles.calBtn}>
            📅 Connect Calendar
          </button>
        </div>
      </header>

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <LocationPanel />
          <ContextPanel />
        </div>
        <div style={styles.chat}>
          <ChatPanel />
        </div>
        <div style={styles.todos}>
          <TodoPanel />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    background: "#0a0a10",
    borderBottom: "1px solid #2e2e3e",
    flexShrink: 0,
  },
  logo: { fontWeight: 700, fontSize: 18, color: "#a0a0f0" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  calBtn: {
    background: "#1e1e2a",
    color: "#a0a0f0",
    padding: "7px 14px",
    border: "1px solid #3e3e5e",
    fontSize: 13,
    borderRadius: 8,
  },
  layout: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "260px 1fr 260px",
    gap: 12,
    padding: 12,
    overflow: "hidden",
    minHeight: 0,
  },
  sidebar: { display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" },
  chat: { minHeight: 0, display: "flex", flexDirection: "column" },
  todos: { minHeight: 0 },
};
