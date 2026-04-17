import { Router } from "express";
import { getAllContext } from "../tools/userContext.js";
import { getUpcomingEvents } from "../tools/calendar.js";

const router = Router();

// GET /api/calendar - fetch upcoming calendar events
router.get("/", async (req, res) => {
  try {
    const context = getAllContext();
    const tokensJson = context["google_tokens"];
    if (!tokensJson) {
      res
        .status(401)
        .json({ connected: false, error: "Google Calendar not connected" });
      return;
    }
    const maxResults = Math.min(
      parseInt((req.query.maxResults as string) ?? "10", 10) || 10,
      50
    );
    const events = await getUpcomingEvents(tokensJson, maxResults);
    res.json({ connected: true, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
