export type CalendarEventType =
  | "class"
  | "meeting"
  | "office_hour"
  | "custom"
  | "quiz"
  | "assignment"
  | "interview";

export interface CalendarEventItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string | null;
  type: CalendarEventType;
  startAt: string;
  endAt?: string | null;
  courseName?: string | null;
  courseCode?: string | null;
  location?: string | null;
  status?: string | null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function localDateTimeToIso(value: string) {
  if (!value) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date/time");
  }

  return date.toISOString();
}

export function formatDateKey(dateInput: string) {
  const date = new Date(dateInput);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function eventTypeLabel(type: CalendarEventType) {
  switch (type) {
    case "class":
      return "Class";
    case "meeting":
      return "Meeting";
    case "office_hour":
      return "Office Hour";
    case "quiz":
      return "Quiz";
    case "assignment":
      return "Assignment";
    case "interview":
      return "Interview";
    default:
      return "Event";
  }
}

export function eventTypeStyle(type: CalendarEventType) {
  switch (type) {
    case "class":
      return { bg: "#dbeafe", color: "#1d4ed8" };
    case "meeting":
      return { bg: "#ede9fe", color: "#6d28d9" };
    case "office_hour":
      return { bg: "#dcfce7", color: "#166534" };
    case "quiz":
      return { bg: "#fef3c7", color: "#92400e" };
    case "assignment":
      return { bg: "#fee2e2", color: "#991b1b" };
    case "interview":
      return { bg: "#eef1f9", color: "#1a2b5e" };
    default:
      return { bg: "#f1f5f9", color: "#475569" };
  }
}

export function formatEventDateTime(startAt: string, endAt?: string | null) {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const date = start.toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!end) return `${date} · ${startTime}`;
  const endTime = end.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${startTime} - ${endTime}`;
}

export function groupEventsByDay(events: CalendarEventItem[]) {
  const grouped = new Map<string, CalendarEventItem[]>();
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  for (const event of sorted) {
    const key = formatDateKey(event.startAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  return Array.from(grouped.entries()).map(([date, items]) => ({
    date,
    items,
  }));
}
