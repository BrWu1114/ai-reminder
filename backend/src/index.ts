import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";
import todosRouter from "./routes/todos.js";
import locationRouter from "./routes/location.js";
import contextRouter from "./routes/context.js";
import authRouter from "./routes/auth.js";
import notificationsRouter from "./routes/notifications.js";
import weatherRouter from "./routes/weather.js";
import calendarRouter from "./routes/calendar.js";
import { startScheduler } from "./scheduler.js";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(__dirname, "../../data"), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/chat", chatRouter);
app.use("/api/todos", todosRouter);
app.use("/api/location", locationRouter);
app.use("/api/context", contextRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/calendar", calendarRouter);
app.use("/auth", authRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`AI Reminder backend running on http://localhost:${PORT}`);
  startScheduler();
});
