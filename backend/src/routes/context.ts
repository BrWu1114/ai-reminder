import { Router } from "express";
import { getAllContext, setContext } from "../tools/userContext.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getAllContext());
});

router.patch("/", (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: "key and value required" });
  setContext(key, String(value));
  res.json({ success: true });
});

export default router;
