"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { cx } from "../lib/utils";

const GOAL_KEY = "placetrack.goal.v1";
const DEFAULT_TARGET = 3;

/**
 * Weekly application goal (pacing pattern). Target lives in its own
 * localStorage key — the versioned store schema is untouched.
 * "Now" is read in useEffect so Next 16's prerender stays stable.
 */
export function WeeklyGoal() {
  const { data } = useStore();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [target, setTarget] = useState(DEFAULT_TARGET);

  useEffect(() => {
    setNowMs(Date.now());
    try {
      const raw = localStorage.getItem(GOAL_KEY);
      if (raw !== null) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 100) setTarget(n);
      }
    } catch {
      // storage unavailable — fall back to default
    }
  }, []);

  const save = (n: number) => {
    setTarget(n);
    try {
      localStorage.setItem(GOAL_KEY, String(n));
    } catch {
      // storage unavailable — session-only
    }
  };

  const count = useMemo(() => {
    if (nowMs === null) return 0;
    const now = new Date(nowMs);
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7)); // Monday 00:00
    return data.applications.filter(
      (a) => new Date(a.createdAt).getTime() >= monday.getTime()
    ).length;
  }, [data.applications, nowMs]);

  /** Streak: consecutive COMPLETED weeks (Mon–Sun) that hit the current
   *  target (researched: visual progress keeps the search motivated).
   *  Counts applications created inside each week; unbounded lookback,
   *  stops at the first miss. */
  const streak = useMemo(() => {
    if (nowMs === null) return 0;
    const now = new Date(nowMs);
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    thisMonday.setDate(thisMonday.getDate() - ((now.getDay() + 6) % 7));
    let s = 0;
    for (let w = 1; ; w++) {
      const start = new Date(thisMonday.getTime() - w * 7 * 86400000);
      const end = new Date(thisMonday.getTime() - (w - 1) * 7 * 86400000);
      const n = data.applications.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= start.getTime() && t < end.getTime();
      }).length;
      if (n >= target) s++;
      else break;
      if (w > 104) break; // safety cap: two years of history
    }
    return s;
  }, [data.applications, nowMs, target]);

  const met = nowMs !== null && count >= target;
  const pct = Math.min(100, Math.round((count / target) * 100));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">This week&apos;s goal</h2>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
          Target
          <input
            type="number"
            min={1}
            max={50}
            value={target}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n >= 1 && n <= 50) save(n);
            }}
            className="w-14 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-center text-sm font-semibold text-zinc-900 focus:border-emerald-600 focus:outline-none"
            aria-label="Weekly application goal"
          />
        </label>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cx("h-full rounded-full", met ? "bg-emerald-600" : "bg-zinc-800")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2.5 text-sm text-zinc-600">
        {met ? (
          <span className="font-semibold text-emerald-700">
            Goal smashed 🎯 — {count} of {target} done. Keep the pace.
          </span>
        ) : nowMs === null ? (
          "Counting…"
        ) : (
          <>
            <span className="font-semibold text-zinc-900">{count}</span> of{" "}
            <span className="font-semibold text-zinc-900">{target}</span> applications this week
            <span className="text-zinc-400"> (Mon–Sun)</span>
          </>
        )}
        {streak > 0 && (
          <span
            className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
            title={`${streak} consecutive week${streak === 1 ? "" : "s"} hitting the target`}
          >
            🔥 {streak}-week streak
          </span>
        )}
      </p>
    </section>
  );
}
