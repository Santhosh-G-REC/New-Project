"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import type { ActivityEvent } from "../../lib/types";
import { cx } from "../../lib/utils";

const DAY_MS = 86400000;

function weekStart(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  return s;
}

function classify(e: ActivityEvent): "new" | "move" | "interview" | "followup" | "offer" | null {
  const t = e.text;
  if (/^Added .+ \(.+\) to /.test(t)) return "new";
  if (t.includes(" moved to ")) return "move";
  if (t.startsWith("Scheduled interview round")) return "interview";
  if (t.startsWith("Completed follow-up")) return "followup";
  if (t.includes("Accepted offer")) return "offer";
  return null;
}

const METRICS = [
  { key: "new", label: "New applications", tone: "bg-sky-600" },
  { key: "move", label: "Stage moves", tone: "bg-amber-500" },
  { key: "interview", label: "Interviews scheduled", tone: "bg-violet-600" },
  { key: "followup", label: "Follow-ups completed", tone: "bg-emerald-600" },
  { key: "offer", label: "Offers accepted", tone: "bg-rose-500" },
] as const;

export default function Review() {
  const { data, loaded } = useStore();

  // nowMs is read in useEffect (client-only) — a direct Date.now() in the
  // render pass fails Next 16's prerender ("unstable value Date.now()").
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const review = useMemo(() => {
    if (nowMs === null) return null;
    const now = nowMs;
    const thisStart = weekStart(new Date(now)).getTime();
    const lastStart = thisStart - 7 * DAY_MS;
    const inThis = (at: string) => new Date(at).getTime() >= thisStart;
    const inLast = (at: string) => {
      const t = new Date(at).getTime();
      return t >= lastStart && t < thisStart;
    };

    const counts: Record<string, { thisW: number; lastW: number }> = {};
    for (const m of METRICS) counts[m.key] = { thisW: 0, lastW: 0 };
    const weekEvents: ActivityEvent[] = [];
    for (const e of data.activity) {
      const k = classify(e);
      if (!k) continue;
      if (inThis(e.at)) {
        counts[k].thisW += 1;
        weekEvents.push(e);
      } else if (inLast(e.at)) {
        counts[k].lastW += 1;
      }
    }

    // 14-day activity heat
    const days: { label: string; count: number; isToday: boolean }[] = [];
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStart = d.getTime();
      const count = data.activity.filter((e) => {
        const t = new Date(e.at).getTime();
        return t >= dStart && t < dStart + DAY_MS;
      }).length;
      days.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        count,
        isToday: i === 0,
      });
    }

    return { counts, weekEvents: weekEvents.slice(0, 15), days, thisWeekStart: thisStart };
  }, [data.activity, nowMs]);

  const [copied, setCopied] = useState(false);

  const copySummary = async () => {
    if (!review) return;
    const lines = [
      `PlaceTrack weekly review — week of ${fmt(review.thisWeekStart)}`,
      ...METRICS.map((m) => {
        const c = review.counts[m.key];
        const delta = c.thisW - c.lastW;
        const arrow = delta > 0 ? ` (+${delta} vs last week)` : delta < 0 ? ` (${delta} vs last week)` : " (same as last week)";
        return `• ${m.label}: ${c.thisW}${arrow}`;
      }),
      ...review.weekEvents.slice(0, 8).map((e) => `• ${e.text}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      // clipboard unavailable — nothing to fall back to for plain text here
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maxHeat = review ? Math.max(1, ...review.days.map((d) => d.count)) : 1;
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Weekly review</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loaded && review
              ? `Week of ${fmt(review.thisWeekStart)} — how the hunt is moving`
              : "Loading…"}
          </p>
        </div>
        {review && (
          <button
            onClick={copySummary}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
          >
            {copied ? "✓ Copied" : "Copy week summary"}
          </button>
        )}
      </div>

      {!loaded || !review ? (
        <div className="mt-6 animate-pulse">
          <div className="h-48 rounded-xl bg-zinc-100" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {METRICS.map((m) => {
              const c = review.counts[m.key];
              const delta = c.thisW - c.lastW;
              return (
                <div key={m.key} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span className={cx("h-2 w-2 rounded-full", m.tone)} aria-hidden="true" />
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{m.label}</div>
                  </div>
                  <div className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900">{c.thisW}</div>
                  <div
                    className={cx(
                      "mt-0.5 text-xs font-medium",
                      delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-600" : "text-zinc-400"
                    )}
                  >
                    {delta > 0 ? `+${delta}` : delta < 0 ? delta : "±0"} vs last week
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Activity heat</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Events logged per day, last 14 days.</p>
              <div className="mt-4 flex items-end gap-1.5">
                {review.days.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.count} events`}>
                    <div
                      className={cx(
                        "w-full rounded-sm",
                        d.isToday ? "bg-emerald-600" : d.count > 0 ? "bg-zinc-300" : "bg-zinc-100"
                      )}
                      style={{ height: `${Math.max(d.count > 0 ? (d.count / maxHeat) * 72 : 4, 4)}px` }}
                    />
                    <span className={cx("text-[9px]", d.isToday ? "font-semibold text-emerald-700" : "text-zinc-400")}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Consistency beats intensity — a little movement every day keeps the pipeline warm.
              </p>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900">This week&apos;s highlights</h2>
              <p className="mt-0.5 text-xs text-zinc-500">The moves that mattered.</p>
              {review.weekEvents.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Nothing logged this week yet. Add an application or log a stage move and it shows up here.
                </p>
              ) : (
                <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {review.weekEvents.map((e) => {
                    const k = classify(e);
                    const m = METRICS.find((x) => x.key === k);
                    return (
                      <li key={e.id} className="flex items-start gap-2.5 text-sm">
                        <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", m?.tone ?? "bg-zinc-300")} aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="text-zinc-800">{e.text}</div>
                          <div className="text-xs text-zinc-400">
                            {new Date(e.at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
