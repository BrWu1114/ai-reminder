import { Router } from "express";
import { getAuthUrl, exchangeCode } from "../tools/calendar.js";
import { setContext } from "../tools/userContext.js";

const router = Router();

router.get("/google", (_req, res) => {
  res.redirect(getAuthUrl());
});

router.get("/google/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code");
  try {
    const tokens = await exchangeCode(code);
    setContext("google_tokens", tokens);
    res.send(`
      <html><body style="font-family:sans-serif;padding:2rem">
        <h2>✅ Google Calendar connected!</h2>
        <p>You can close this tab and return to the app.</p>
        <script>window.opener?.postMessage('calendar_connected', '*'); window.close();</script>
      </body></html>
    `);
  } catch (err: any) {
    res.status(500).send("OAuth error: " + err.message);
  }
});

router.get("/status", (_req, res) => {
  const { getAllContext } = require("../tools/userContext.js");
  const ctx = getAllContext();
  res.json({ google_calendar: !!ctx.google_tokens });
});

export default router;
