"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import { STAGE_META, type Application } from "../../lib/types";
import { cx, deadlineLabel, daysUntilDeadline, formatDeadline, isOverdue } from "../../lib/utils";
import { downloadIcs } from "../../lib/ics";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bucket(apps: Application[]) {
  const overdue: Application[] = [];
  const today: Application[] = [];
  const tomorrow: Application[] = [];
  const thisWeek: Application[] = [];
  const later: Application[] = [];
  for (const a of apps) {
    const n = daysUntilDeadline(a.deadline!);
    if (n < 0) overdue.push(a);
    else if (n === 0) today.push(a);
    else if (n === 1) tomorrow.push(a);
    else if (n <= 7) thisWeek.push(a);
    else later.push(a);
  }
  return [
    { title: "Overdue", apps: overdue, tone: "rose" as const },
    { title: "Today", apps: today, tone: "amber" as const },
    { title: "Tomorrow", apps: tomorrow, tone: "zinc" as const },
    { title: "Next 7 days", apps: thisWeek, tone: "zinc" as const },
    { title: "Later", apps: later, tone: "zinc" as const },
  ].filter((g) => g.apps.length > 0);
}

function DeadlineRow({ app }: { app: Application }) {
  const overdue = isOverdue(app.deadline!);
  const { snoozeDeadline } = useStore();
  return (
    <li
      className={cx(
        "flex items-center rounded-lg border transition-colors",
        overdue
          ? "border-rose-200 bg-rose-50"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      )}
    >
      <Link href={`/applications/${app.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
        <span className={cx("h-2 w-2 shrink-0 rounded-full", STAGE_META[app.stage].dot)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-900">
            {app.company} <span className="font-normal text-zinc-500">· {app.role}</span>
          </span>
          <span className={cx("text-xs", overdue ? "font-semibold text-rose-600" : "text-zinc-500")}>
            {deadlineLabel(app.deadline!)}
          </span>
        </span>
        <span
          className={cx(
            "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
            overdue ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-600"
          )}
        >
          {formatDeadline(app.deadline!)}
        </span>
      </Link>
      <button
        onClick={() => snoozeDeadline(app.id, 1)}
        aria-label={`Snooze ${app.company} deadline by a day`}
        title="Snooze deadline by 1 day"
        className="mr-1 shrink-0 rounded-lg border border-zinc-200 px-2 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800"
      >
        +1d
      </button>
      <button
        onClick={() => snoozeDeadline(app.id, 7)}
        aria-label={`Snooze ${app.company} deadline by a week`}
        title="Snooze deadline by 1 week"
        className="mr-2 shrink-0 rounded-lg border border-zinc-200 px-2 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800"
      >
        +1w
      </button>
      <button
        onClick={() => downloadIcs(app)}
        aria-label={`Add ${app.company} deadline to calendar`}
        title="Add to calendar (.ics)"
        className="mr-2 shrink-0 rounded-lg border border-zinc-200 p-2 text-zinc-400 transition-colors hover:border-zinc-300 hover:text-emerald-700"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4" aria-hidden="true">
          <path d="M4 6h12v10H4zM4 9h12M7 3v4M13 3v4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  );
}

function WeekView({ apps }: { apps: Application[] }) {
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        key,
        label: WEEKDAYS[d.getDay()],
        num: d.getDate(),
        isToday: i === 0,
        apps: apps.filter((a) => a.deadline === key),
      };
    });
  }, [apps]);

  return (
    <div className="grid grid-cols-7 gap-2 overflow-x-auto">
      {days.map((d) => (
        <div
          key={d.key}
          className={cx(
            "min-w-[120px] rounded-xl border p-2.5",
            d.isToday ? "border-emerald-300 bg-emerald-50/50" : "border-zinc-200 bg-white"
          )}
        >
          <div className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{d.label}</div>
            <div className={cx("text-lg font-semibold", d.isToday ? "text-emerald-700" : "text-zinc-900")}>
              {d.num}
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {d.apps.map((a) => (
              <Link
                key={a.id}
                href={`/applications/${a.id}`}
                className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[11px] font-medium text-zinc-800 hover:bg-zinc-200"
                title={`${a.company} · ${a.role}`}
              >
                <span className="block truncate">{a.company}</span>
                <span className="block truncate font-normal text-zinc-500">{a.role}</span>
              </Link>
            ))}
            {d.apps.length === 0 && <div className="py-2 text-center text-[11px] text-zinc-300">—</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Month calendar view: application deadlines + scheduled interview rounds on a
 *  real month grid. Uses the same render-time `new Date()` pattern as WeekView
 *  (proven prerender-safe in this codebase). */
function MonthView({ apps }: { apps: Application[] }) {
  const [offset, setOffset] = useState(0);

  const cells = useMemo(() => {
    const now = new Date();
    const anchor = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay(); // Sun start
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const deadlinesByDate = new Map<string, Application[]>();
    for (const a of apps) {
      if (!a.deadline) continue;
      const list = deadlinesByDate.get(a.deadline) ?? [];
      list.push(a);
      deadlinesByDate.set(a.deadline, list);
    }
    const roundsByDate = new Map<string, { app: Application; label: string }[]>();
    for (const a of apps) {
      for (const r of a.interviews ?? []) {
        if (!r.at) continue;
        const key = r.at.slice(0, 10);
        const list = roundsByDate.get(key) ?? [];
        list.push({ app: a, label: r.label });
        roundsByDate.set(key, list);
      }
    }

    const out: { key: string; num: number | null; isToday: boolean; isCurrentMonth: boolean; deadlines: Application[]; rounds: { app: Application; label: string }[] }[] = [];
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstWeekday + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        out.push({ key: `blank-${i}`, num: null, isToday: false, isCurrentMonth: false, deadlines: [], rounds: [] });
      } else {
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        out.push({
          key,
          num: dayNum,
          isToday: key === todayKey,
          isCurrentMonth: true,
          deadlines: deadlinesByDate.get(key) ?? [],
          rounds: roundsByDate.get(key) ?? [],
        });
      }
    }
    return {
      cells: out,
      title: anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    };
  }, [apps, offset]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">{cells.title}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous month"
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            ←
          </button>
          <button
            onClick={() => setOffset(0)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Today
          </button>
          <button
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Next month"
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            →
          </button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-zinc-50 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {w}
          </div>
        ))}
        {cells.cells.map((c) =>
          c.num === null ? (
            <div key={c.key} className="min-h-[76px] bg-zinc-50/60" />
          ) : (
            <div
              key={c.key}
              className={cx("min-h-[76px] bg-white p-1.5", c.isToday && "bg-emerald-50/60")}
            >
              <div
                className={cx(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  c.isToday ? "bg-emerald-600 font-semibold text-white" : "text-zinc-700"
                )}
              >
                {c.num}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {c.deadlines.slice(0, 2).map((a) => {
                  const overdue = isOverdue(a.deadline!);
                  return (
                    <Link
                      key={`d-${a.id}`}
                      href={`/applications/${a.id}`}
                      className={cx(
                        "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                        overdue ? "bg-rose-100 text-rose-700" : "bg-amber-50 text-amber-700"
                      )}
                      title={`${a.company} · ${a.role} — deadline`}
                    >
                      ⏰ {a.company}
                    </Link>
                  );
                })}
                {c.rounds.slice(0, 2).map((r, i) => (
                  <Link
                    key={`r-${r.app.id}-${i}`}
                    href={`/applications/${r.app.id}`}
                    className="truncate rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"
                    title={`${r.app.company} · ${r.label}`}
                  >
                    🎙 {r.label.split("—")[0].trim()}
                  </Link>
                ))}
                {c.deadlines.length + c.rounds.length > 4 && (
                  <span className="text-[10px] text-zinc-400">
                    +{c.deadlines.length + c.rounds.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        <span className="text-amber-700">⏰</span> deadlines · <span className="text-violet-700">🎙</span> interview rounds — click any item to open the application.
      </p>
    </div>
  );
}

export default function Deadlines() {
  const { data, loaded } = useStore();
  const [view, setView] = useState<"list" | "week" | "month">("list");

  const apps = useMemo(
    () =>
      data.applications
        .filter((a) => a.deadline && !["offer", "rejected"].includes(a.stage))
        .sort((a, b) => daysUntilDeadline(a.deadline!) - daysUntilDeadline(b.deadline!)),
    [data.applications]
  );
  const groups = useMemo(() => bucket(apps), [apps]);
  const overdueCount = useMemo(() => apps.filter((a) => isOverdue(a.deadline!)).length, [apps]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Deadlines</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loaded
              ? `${apps.length} upcoming${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`
              : "Loading…"}
          </p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5" role="tablist" aria-label="View">
          {(["list", "week", "month"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cx(
                "rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-64 rounded-xl bg-zinc-100" />
        </div>
      ) : apps.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">All clear</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No upcoming deadlines. Set deadlines on applications to track them here.
          </p>
          <Link
            href="/pipeline"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to pipeline
          </Link>
        </div>
      ) : view === "week" ? (
        <div className="mt-6">
          <WeekView apps={apps} />
        </div>
      ) : view === "month" ? (
        <div className="mt-6">
          <MonthView apps={apps} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.title}>
              <div className="flex items-center gap-2">
                <h2
                  className={cx(
                    "text-xs font-semibold uppercase tracking-wide",
                    g.tone === "rose" ? "text-rose-600" : g.tone === "amber" ? "text-amber-600" : "text-zinc-500"
                  )}
                >
                  {g.title}
                </h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                  {g.apps.length}
                </span>
              </div>
              <ul className="mt-2 flex flex-col gap-2">
                {g.apps.map((a) => (
                  <DeadlineRow key={a.id} app={a} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
