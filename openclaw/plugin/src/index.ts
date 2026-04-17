/**
 * OpenClaw Plugin: AI Personal Reminder
 *
 * Registers all tools with the OpenClaw agent so it can manage todos,
 * track location, read weather/calendar, and trigger proactive reminders —
 * all backed by the Express API server.
 *
 * The API server URL is read from the AI_REMINDER_API_URL environment variable
 * (default: http://localhost:3001). Start the backend before loading this plugin.
 */

const BACKEND_URL =
  process.env.AI_REMINDER_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function fetchBackend<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI Reminder API error ${res.status} for ${path}: ${body}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

// OpenClaw passes an API object when loading the plugin.
// The exact type is not yet published in a public @types package, so we use
// a local interface that mirrors the documented registerTool shape.
interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<string>;
}

interface OpenClawPluginApi {
  registerTool(def: ToolDef): void;
}

export function register(api: OpenClawPluginApi): void {
  // ── Todos ────────────────────────────────────────────────────────────────

  api.registerTool({
    name: "get_todos",
    description:
      "Get the user's current todo / task list. Returns all incomplete items by default.",
    inputSchema: {
      type: "object",
      properties: {
        include_completed: {
          type: "boolean",
          description: "Set true to also return completed tasks (default false)",
        },
      },
    },
    handler: async ({ include_completed = false }) => {
      const todos = await fetchBackend<unknown[]>(
        `/api/todos${include_completed ? "?include_completed=true" : ""}`
      );
      return JSON.stringify(todos);
    },
  });

  api.registerTool({
    name: "add_todo",
    description: "Add a new task to the user's todo list.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The task to add" },
      },
      required: ["text"],
    },
    handler: async ({ text }) => {
      const todo = await fetchBackend("/api/todos", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      return JSON.stringify(todo);
    },
  });

  api.registerTool({
    name: "complete_todo",
    description: "Mark a todo as done. Use get_todos first to find the id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "The numeric todo id" },
      },
      required: ["id"],
    },
    handler: async ({ id }) => {
      await fetchBackend(`/api/todos/${id}/complete`, { method: "PATCH" });
      return `Todo ${id} marked complete.`;
    },
  });

  api.registerTool({
    name: "delete_todo",
    description:
      "Permanently delete a todo. Prefer complete_todo unless the user explicitly wants it gone.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "The numeric todo id" },
      },
      required: ["id"],
    },
    handler: async ({ id }) => {
      await fetchBackend(`/api/todos/${id}`, { method: "DELETE" });
      return `Todo ${id} deleted.`;
    },
  });

  // ── Location ─────────────────────────────────────────────────────────────

  api.registerTool({
    name: "get_location",
    description:
      "Get the user's current location (name, lat, lng) and recent location history.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const location = await fetchBackend("/api/location");
      return JSON.stringify(location);
    },
  });

  api.registerTool({
    name: "set_location",
    description:
      "Update the user's current location. Triggers geofence checks (left home / arrived home) and a proactive reminder sweep.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Human-readable location name" },
        lat: { type: "number", description: "Latitude (optional)" },
        lng: { type: "number", description: "Longitude (optional)" },
        isHome: {
          type: "boolean",
          description: "If true, save this as the home location for geofencing",
        },
      },
      required: ["name"],
    },
    handler: async ({ name, lat, lng, isHome }) => {
      const result = await fetchBackend("/api/location", {
        method: "POST",
        body: JSON.stringify({ name, lat, lng, isHome }),
      });
      return JSON.stringify(result);
    },
  });

  // ── Weather ───────────────────────────────────────────────────────────────

  api.registerTool({
    name: "get_weather",
    description:
      "Get current weather. Pass city name or lat/lng. Omit both to use the user's current saved location.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name, e.g. 'San Francisco'" },
        lat: { type: "number", description: "Latitude" },
        lng: { type: "number", description: "Longitude" },
      },
    },
    handler: async ({ city, lat, lng }) => {
      const params = new URLSearchParams();
      if (city) params.set("city", String(city));
      if (lat !== undefined) params.set("lat", String(lat));
      if (lng !== undefined) params.set("lng", String(lng));
      const qs = params.toString();
      const weather = await fetchBackend(`/api/weather${qs ? `?${qs}` : ""}`);
      return JSON.stringify(weather);
    },
  });

  // ── User Context ──────────────────────────────────────────────────────────

  api.registerTool({
    name: "get_context",
    description:
      "Get the user's full profile: health notes, daily routines, preferences, and home location. Read this before giving personalised advice.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const context = await fetchBackend("/api/context");
      return JSON.stringify(context);
    },
  });

  api.registerTool({
    name: "update_context",
    description:
      "Update one field in the user's profile. Use this to remember new routines, health info, or preferences the user mentions.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Field to update",
          enum: ["health_notes", "routines", "preferences", "home_location"],
        },
        value: { type: "string", description: "New value (appends by convention; replace only if user asks)" },
      },
      required: ["key", "value"],
    },
    handler: async ({ key, value }) => {
      await fetchBackend("/api/context", {
        method: "PATCH",
        body: JSON.stringify({ key, value }),
      });
      return `Profile field "${key}" updated.`;
    },
  });

  // ── Calendar ──────────────────────────────────────────────────────────────

  api.registerTool({
    name: "get_calendar_events",
    description:
      "Get upcoming Google Calendar events. Returns an error if the user hasn't connected their calendar via the web dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        max_results: {
          type: "number",
          description: "Max events to return (default 10, max 50)",
        },
      },
    },
    handler: async ({ max_results = 10 }) => {
      try {
        const data = await fetchBackend<{ connected: boolean; events?: unknown[]; error?: string }>(
          `/api/calendar?maxResults=${max_results}`
        );
        if (!data.connected) {
          return "Google Calendar is not connected. Ask the user to click 'Connect Calendar' in the web dashboard at http://localhost:5173.";
        }
        return JSON.stringify(data.events ?? []);
      } catch (err: any) {
        return `Could not fetch calendar: ${err.message}`;
      }
    },
  });

  // ── Notifications ─────────────────────────────────────────────────────────

  api.registerTool({
    name: "get_notifications",
    description: "Get the user's recent reminder notification history.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of recent notifications to return (default 10)",
        },
      },
    },
    handler: async ({ limit = 10 }) => {
      const notifications = await fetchBackend(`/api/notifications?limit=${limit}`);
      return JSON.stringify(notifications);
    },
  });

  api.registerTool({
    name: "trigger_reminder_check",
    description:
      "Run an immediate proactive reminder analysis. Checks todos, location, weather, calendar, and user context, then sends a reminder if warranted. Use when the user asks you to check if they're forgetting anything.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const result = await fetchBackend("/api/notifications/trigger", { method: "POST" });
      return JSON.stringify(result);
    },
  });
}
