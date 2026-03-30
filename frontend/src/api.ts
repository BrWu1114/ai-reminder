const BASE = "/api";

export async function sendChat(message: string): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Chat error");
  return data.reply;
}

export async function getChatHistory() {
  const res = await fetch(`${BASE}/chat/history`);
  return res.json();
}

export async function clearChatHistory() {
  await fetch(`${BASE}/chat/history`, { method: "DELETE" });
}

export async function getTodos() {
  const res = await fetch(`${BASE}/todos`);
  return res.json();
}

export async function addTodo(text: string) {
  const res = await fetch(`${BASE}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function completeTodo(id: number) {
  await fetch(`${BASE}/todos/${id}/complete`, { method: "PATCH" });
}

export async function deleteTodo(id: number) {
  await fetch(`${BASE}/todos/${id}`, { method: "DELETE" });
}

export async function getLocation() {
  const res = await fetch(`${BASE}/location`);
  return res.json();
}

export async function setLocation(name: string, lat?: number, lng?: number) {
  const res = await fetch(`${BASE}/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, lat, lng }),
  });
  return res.json();
}

export async function getContext() {
  const res = await fetch(`${BASE}/context`);
  return res.json();
}

export async function updateContext(key: string, value: string) {
  await fetch(`${BASE}/context`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}
