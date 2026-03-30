import { google } from "googleapis";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/auth/google/callback"
  );
}

export function getAuthUrl(): string {
  const auth = getOAuthClient();
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

export async function exchangeCode(code: string): Promise<string> {
  const auth = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  return JSON.stringify(tokens);
}

export async function getUpcomingEvents(
  tokensJson: string,
  maxResults = 10
): Promise<CalendarEvent[]> {
  const auth = getOAuthClient();
  auth.setCredentials(JSON.parse(tokensJson));

  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items || []).map((e) => ({
    id: e.id!,
    summary: e.summary || "(No title)",
    start: e.start?.dateTime || e.start?.date || "",
    end: e.end?.dateTime || e.end?.date || "",
    location: e.location,
    description: e.description,
  }));
}
