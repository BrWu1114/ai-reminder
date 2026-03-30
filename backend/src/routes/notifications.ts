import { Router } from "express";
import { v4 as uuid } from "crypto";
import { sseManager } from "../sse.js";
import { getNotifications, markRead, markAllRead } from "../proactive.js";
import { triggerCheck } from "../scheduler.js";

const router = Router();

// SSE stream endpoint
router.get("/stream", (req, res) => {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sseManager.add(clientId, res);
  console.log(`[sse] Client connected (${sseManager.count()} total)`);

  // Send welcome ping so the client knows it's connected
  res.write(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);
});

// Notification history
router.get("/", (_req, res) => {
  res.json(getNotifications());
});

// Mark one as read
router.patch("/:id/read", (req, res) => {
  markRead(Number(req.params.id));
  res.json({ success: true });
});

// Mark all as read
router.patch("/read-all", (_req, res) => {
  markAllRead();
  res.json({ success: true });
});

// Manual trigger (for testing)
router.post("/trigger", async (_req, res) => {
  res.json({ success: true, message: "Proactive check triggered." });
  await triggerCheck();
});

export default router;
