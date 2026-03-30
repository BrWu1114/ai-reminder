import { Router } from "express";
import { chat, clearHistory } from "../agent.js";
import db from "../db.js";

const router = Router();

router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  try {
    const reply = await chat(message.trim());
    res.json({ reply });
  } catch (err: any) {
    console.error("Agent error:", err);
    res.status(500).json({ error: err.message || "Agent error" });
  }
});

router.get("/history", (_req, res) => {
  const rows = db
    .prepare("SELECT role, content, timestamp FROM conversation_history ORDER BY id ASC")
    .all();
  res.json(rows);
});

router.delete("/history", (_req, res) => {
  clearHistory();
  res.json({ success: true });
});

export default router;
