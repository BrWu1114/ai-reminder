import Anthropic from "@anthropic-ai/sdk";
import { getTodos, addTodo, completeTodo } from "./tools/todos.js";
import { getCurrentLocation, setLocation } from "./tools/location.js";
import { getUpcomingEvents } from "./tools/calendar.js";
import { getAllContext, setContext } from "./tools/userContext.js";
import { getWeatherByCoords, getWeatherByCity } from "./tools/weather.js";
import db from "./db.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_todos",
    description: "Get the user's current to-do list. Use this to check what errands or tasks they have pending.",
    input_schema: {
      type: "object",
      properties: {
        include_completed: {
          type: "boolean",
          description: "Whether to include completed todos. Default false.",
        },
      },
      required: [],
    },
  },
  {
    name: "add_todo",
    description: "Add a new item to the user's to-do list.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The todo item text." },
      },
      required: ["text"],
    },
  },
  {
    name: "complete_todo",
    description: "Mark a todo item as completed by its ID.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "number", description: "The todo item ID." },
      },
      required: ["id"],
    },
  },
  {
    name: "get_current_location",
    description: "Get the user's current location.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_location",
    description: "Update the user's current location.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Location name (e.g. 'Home', 'San Francisco', 'Office')." },
        lat: { type: "number", description: "Latitude (optional)." },
        lng: { type: "number", description: "Longitude (optional)." },
      },
      required: ["name"],
    },
  },
  {
    name: "get_calendar_events",
    description: "Get the user's upcoming calendar events from Google Calendar. Only works if the user has connected their Google account.",
    input_schema: {
      type: "object",
      properties: {
        max_results: {
          type: "number",
          description: "Maximum number of events to return. Default 10.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_user_context",
    description: "Get the user's background information: health notes, routines, preferences, home location etc.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "update_user_context",
    description: "Update the user's background information (health, routines, preferences).",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Context key (e.g. 'health_notes', 'routines', 'preferences')." },
        value: { type: "string", description: "The value to store." },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather conditions for a location. Returns temperature, conditions, and actionable tips (e.g. bring a jacket, carry an umbrella). Use this when the user asks about weather, is heading somewhere, or when location context makes weather relevant.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name, e.g. 'San Francisco' or 'New York, NY'. Use this OR lat/lng." },
        lat: { type: "number", description: "Latitude for GPS-based lookup." },
        lng: { type: "number", description: "Longitude for GPS-based lookup." },
      },
      required: [],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case "get_todos":
      return getTodos(input.include_completed as boolean | undefined);
    case "add_todo":
      return addTodo(input.text as string);
    case "complete_todo":
      completeTodo(input.id as number);
      return { success: true };
    case "get_current_location":
      return getCurrentLocation() ?? { name: "Unknown" };
    case "set_location":
      return setLocation(input.name as string, input.lat as number | undefined, input.lng as number | undefined);
    case "get_calendar_events": {
      const tokens = db
        .prepare("SELECT value FROM user_context WHERE key = 'google_tokens'")
        .get() as any;
      if (!tokens) return { error: "Google Calendar not connected. Please connect via /auth/google." };
      return getUpcomingEvents(tokens.value, (input.max_results as number) ?? 10);
    }
    case "get_user_context":
      return getAllContext();
    case "update_user_context":
      setContext(input.key as string, input.value as string);
      return { success: true };
    case "get_weather": {
      try {
        if (input.lat != null && input.lng != null) {
          return await getWeatherByCoords(input.lat as number, input.lng as number);
        }
        if (input.city) {
          return await getWeatherByCity(input.city as string);
        }
        // Fall back to current location coords
        const loc = getCurrentLocation();
        if (loc?.lat != null && loc?.lng != null) {
          return await getWeatherByCoords(loc.lat, loc.lng);
        }
        return { error: "Provide a city name or GPS coordinates." };
      } catch (err: any) {
        return { error: err.message };
      }
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function getConversationHistory(limit = 20): Anthropic.MessageParam[] {
  const rows = db
    .prepare(
      "SELECT role, content FROM conversation_history ORDER BY id DESC LIMIT ?"
    )
    .all(limit) as { role: string; content: string }[];

  return rows
    .reverse()
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
}

function saveMessage(role: "user" | "assistant", content: string): void {
  db.prepare(
    "INSERT INTO conversation_history (role, content) VALUES (?, ?)"
  ).run(role, content);
}

export async function chat(userMessage: string): Promise<string> {
  saveMessage("user", userMessage);

  const history = getConversationHistory();
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(0, -1), // exclude the message we just saved (avoid duplicate)
    { role: "user", content: userMessage },
  ];

  const context = getAllContext();
  const location = getCurrentLocation();

  const systemPrompt = `You are a friendly AI personal assistant and reminder helper. You help the user remember things, manage their to-do list, and give helpful reminders based on their context.

Current date/time: ${new Date().toLocaleString()}
Current location: ${location?.name ?? "Unknown"}

User background:
- Health notes: ${context.health_notes || "None provided"}
- Daily routines: ${context.routines || "None provided"}
- Preferences: ${context.preferences || "None provided"}

Guidelines:
- Be conversational and warm, like a helpful friend
- Proactively suggest reminders based on context (location, time, todos, calendar)
- When the user mentions going somewhere, check their todos for relevant errands
- When relevant, check calendar events and suggest time-based reminders
- Keep responses concise — 1-3 sentences unless more detail is needed
- Remember and learn from the user's patterns`;

  let response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    tools: TOOLS,
    messages,
  });

  // Agentic loop
  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUses.map((tool) => ({
      type: "tool_result",
      tool_use_id: tool.id,
      content: JSON.stringify(executeTool(tool.name, tool.input as Record<string, unknown>)),
    }));

    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const reply = textBlock?.text ?? "I'm not sure how to respond to that.";

  saveMessage("assistant", reply);
  return reply;
}

export function clearHistory(): void {
  db.prepare("DELETE FROM conversation_history").run();
}
