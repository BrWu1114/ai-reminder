import db from "../db.js";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  created_at: string;
}

export function getTodos(includeCompleted = false): Todo[] {
  const rows = includeCompleted
    ? db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all()
    : db.prepare("SELECT * FROM todos WHERE done = 0 ORDER BY created_at DESC").all();
  return (rows as any[]).map((r) => ({ ...r, done: r.done === 1 }));
}

export function addTodo(text: string): Todo {
  const info = db.prepare("INSERT INTO todos (text) VALUES (?)").run(text);
  return db.prepare("SELECT * FROM todos WHERE id = ?").get(info.lastInsertRowid) as Todo;
}

export function completeTodo(id: number): void {
  db.prepare("UPDATE todos SET done = 1 WHERE id = ?").run(id);
}

export function deleteTodo(id: number): void {
  db.prepare("DELETE FROM todos WHERE id = ?").run(id);
}
