import { useEffect, useState } from "react";

export interface ToastData {
  id: number;
  message: string;
  type: "reminder" | "tip" | "warning";
}

interface Props {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div style={styles.container}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 8s
    const t = setTimeout(() => dismiss(), 8_000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const icon = toast.type === "warning" ? "⚠️" : toast.type === "tip" ? "💡" : "🔔";
  const accent = toast.type === "warning" ? "#e0854a" : toast.type === "tip" ? "#5cd0a0" : "#6c6cf0";

  return (
    <div
      style={{
        ...styles.toast,
        borderLeft: `4px solid ${accent}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(100%)",
      }}
    >
      <span style={styles.icon}>{icon}</span>
      <p style={styles.msg}>{toast.message}</p>
      <button onClick={dismiss} style={styles.close}>×</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    bottom: 24,
    right: 24,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 1000,
    maxWidth: 340,
  },
  toast: {
    background: "#1e1e2a",
    border: "1px solid #2e2e3e",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    transition: "opacity 0.3s, transform 0.3s",
  },
  icon: { fontSize: 18, flexShrink: 0 },
  msg: { flex: 1, fontSize: 13, lineHeight: 1.5, color: "#e8e8f0" },
  close: {
    background: "transparent",
    color: "#666",
    fontSize: 18,
    lineHeight: 1,
    flexShrink: 0,
    padding: 0,
  },
};
