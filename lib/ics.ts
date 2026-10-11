import type { Application, InterviewRound } from "./types";

function slug(s: string): string {
  return (
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
    "application"
  );
}

/** Escape text for iCalendar property values. */
function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadCalendarFile(lines: string[], filename: string): void {
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Format a local Date as a floating-local iCalendar datetime (YYYYMMDDTHHMMSS). */
function localStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Downloads a .ics calendar file for an interview round.
 * Floating local time (no VTIMEZONE needed), default 1-hour duration,
 * called from a click handler. No-op when the round has no scheduled time.
 */
export function downloadRoundIcs(app: Application, round: InterviewRound): void {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(round.at ?? "");
  if (!m) return;
  const start = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const description = [
    `${app.company} — ${app.role}`,
    round.interviewer ? `Interviewer: ${round.interviewer}` : null,
    round.link ? `Meeting link: ${round.link}` : null,
    round.notes ? `Notes: ${round.notes}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlaceTrack//Interview Round//EN",
    "BEGIN:VEVENT",
    `UID:${round.id}@placetrack`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    `SUMMARY:${escapeIcs(`Interview: ${round.label} — ${app.company}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  downloadCalendarFile(lines, `placetrack-${slug(app.company)}-${slug(round.label)}.ics`);
}

/**
 * Downloads a .ics calendar file for the application's deadline.
 * All-day event (floating time, no VTIMEZONE needed), called from a click handler.
 */
export function downloadIcs(app: Application): void {
  if (!app.deadline) return;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const description = [
    `Role: ${app.role}`,
    app.link ? `Link: ${app.link}` : null,
    app.notes ? `Notes: ${app.notes}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlaceTrack//Deadline//EN",
    "BEGIN:VEVENT",
    `UID:${app.id}@placetrack`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${app.deadline.replace(/-/g, "")}`,
    `SUMMARY:${escapeIcs(`Application deadline: ${app.company} — ${app.role}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  downloadCalendarFile(lines, `placetrack-${slug(app.company)}-deadline.ics`);
}
