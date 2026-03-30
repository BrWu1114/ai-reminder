import { Router } from "express";
import { getTodos, addTodo, completeTodo, deleteTodo } from "../tools/todos.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getTodos(false));
});

router.post("/", (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });
  res.json(addTodo(text.trim()));
});

router.patch("/:id/complete", (req, res) => {
  completeTodo(Number(req.params.id));
  res.json({ success: true });
});

router.delete("/:id", (req, res) => {
  deleteTodo(Number(req.params.id));
  res.json({ success: true });
});

export default router;
