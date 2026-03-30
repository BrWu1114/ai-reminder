import { useState, useEffect } from "react";
import { getTodos, addTodo, completeTodo, deleteTodo } from "../api";

interface Todo { id: number; text: string; done: boolean; created_at: string; }

export default function TodoPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const refresh = () => getTodos().then(setTodos);
  useEffect(() => { refresh(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await addTodo(input.trim());
    setInput("");
    refresh();
  };

  const handleComplete = async (id: number) => {
    await completeTodo(id);
    refresh();
  };

  const handleDelete = async (id: number) => {
    await deleteTodo(id);
    refresh();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>✅ To-Do List</span>
        <span style={styles.count}>{todos.length} remaining</span>
      </div>

      <form onSubmit={handleAdd} style={styles.addRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
          style={{ flex: 1 }}
        />
        <button type="submit" style={styles.addBtn}>Add</button>
      </form>

      <div style={styles.list}>
        {todos.length === 0 && (
          <p style={styles.empty}>No tasks — you're all caught up!</p>
        )}
        {todos.map((todo) => (
          <div key={todo.id} style={styles.item}>
            <button
              onClick={() => handleComplete(todo.id)}
              style={styles.checkBtn}
              title="Mark complete"
            >
              ○
            </button>
            <span style={styles.text}>{todo.text}</span>
            <button
              onClick={() => handleDelete(todo.id)}
              style={styles.deleteBtn}
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#13131a",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #2e2e3e",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #2e2e3e",
  },
  title: { fontWeight: 600, fontSize: 15 },
  count: { fontSize: 12, color: "#888" },
  addRow: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderBottom: "1px solid #2e2e3e",
  },
  addBtn: {
    background: "#6c6cf0",
    color: "#fff",
    padding: "8px 14px",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  empty: { color: "#666", fontSize: 13, textAlign: "center", marginTop: 20 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    background: "#1e1e2a",
  },
  checkBtn: {
    background: "transparent",
    color: "#6c6cf0",
    fontSize: 18,
    lineHeight: 1,
    padding: "0 2px",
    flexShrink: 0,
  },
  text: { flex: 1, fontSize: 14 },
  deleteBtn: {
    background: "transparent",
    color: "#666",
    fontSize: 18,
    lineHeight: 1,
    padding: "0 2px",
    flexShrink: 0,
  },
};
