"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "../../lib/store";
import { STAGE_META, type Application, type Stage } from "../../lib/types";
import { cx } from "../../lib/utils";

const FUNNEL_STAGES: Stage[] = ["wishlist", "applied", "assessment", "interview", "offer"];

function reachedStage(app: Application, stage: Stage): boolean {
  return app.stageHistory.some((h) => h.stage === stage);
}

/** Funnel: share of apps that ever reached each stage + step conversion. */
function Funnel({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const counts = FUNNEL_STAGES.map((s) => apps.filter((a) => reachedStage(a, s)).length);
    return FUNNEL_STAGES.map((s, i) => ({
      stage: s,
      count: counts[i],
      conv: i === 0 ? null : counts[i - 1] === 0 ? 0 : Math.round((counts[i] / counts[i - 1]) * 100),
      width: counts[0] === 0 ? 0 : Math.max((counts[i] / counts[0]) * 100, 4),
    }));
  }, [apps]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Pipeline funnel</h2>
      <p className="mt-0.5 text-xs text-zinc-500">How far applications get, stage by stage.</p>
      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.stage}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-zinc-800">
                <span className={cx("h-2 w-2 rounded-full", STAGE_META[r.stage].dot)} />
                {STAGE_META[r.stage].label}
              </span>
              <span className="text-zinc-500">
                <span className="font-semibold text-zinc-900">{r.count}</span>
                {r.conv !== null && <span> · {r.conv}% of previous</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cx("h-full rounded-full", STAGE_META[r.stage].dot)}
                style={{ width: `${r.width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const WEEK_MS = 7 * 86400000;

function WeeklyBars({ apps }: { apps: Application[] }) {
  const weeks = useMemo(() => {
    const now = Date.now();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
    return Array.from({ length: 8 }, (_, i) => {
      const wStart = start.getTime() - (7 - i) * WEEK_MS;
      const wEnd = wStart + WEEK_MS;
      const count = apps.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= wStart && t < wEnd;
      }).length;
      const d = new Date(wStart);
      return { count, label: `${d.getDate()}/${d.getMonth() + 1}` };
    });
  }, [apps]);

  const max = Math.max(1, ...weeks.map((w) => w.count));
  const W = 480;
  const H = 160;
  const pad = 28;
  const bw = (W - pad * 2) / weeks.length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Applications per week</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Last 8 weeks, by date added.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Bar chart of applications per week">
        {[0, 1, 2].map((g) => {
          const v = Math.round((max * g) / 2);
          const y = H - pad - ((H - pad * 2) * v) / max;
          return (
            <g key={g}>
              <line x1={pad} x2={W - pad} y1={y} y2={y} stroke="#f4f4f5" />
              <text x={pad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#a1a1aa">
                {v}
              </text>
            </g>
          );
        })}
        {weeks.map((w, i) => {
          const h = ((H - pad * 2) * w.count) / max;
          const x = pad + i * bw + bw * 0.22;
          return (
            <g key={i}>
              <rect
                x={x}
                y={H - pad - h}
                width={bw * 0.56}
                height={Math.max(h, w.count > 0 ? 3 : 0)}
                rx={3}
                fill={w.count > 0 ? "#059669" : "#e4e4e7"}
              />
              <text x={x + bw * 0.28} y={H - pad + 16} textAnchor="middle" fontSize="10" fill="#a1a1aa">
                {w.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

/** "Applied via" breakdown (Huntr pattern): which channels actually produce applications. */
function SourceBreakdown({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    let none = 0;
    for (const a of apps) {
      const s = a.source?.trim();
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
      else none += 1;
    }
    const list = [...counts.entries()].sort((x, y) => y[1] - x[1]);
    if (none > 0) list.push(["Not recorded", none]);
    return list;
  }, [apps]);

  const max = Math.max(1, ...rows.map((r) => r[1]));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Applications by source</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Where your applications came from.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No data yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map(([source, count]) => (
            <div key={source}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-800">{source}</span>
                <span className="font-semibold text-zinc-900">{count}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${Math.max((count / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** "Time in stage" (Teal pattern): median days applications spend in each stage,
 *  derived from stage-history transitions. Only completed dwells count. */
function StageDwell({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const dwells = new Map<Stage, number[]>();
    for (const a of apps) {
      const hist = [...a.stageHistory].sort(
        (x, y) => new Date(x.at).getTime() - new Date(y.at).getTime()
      );
      for (let i = 0; i < hist.length - 1; i++) {
        const days = Math.max(
          0,
          Math.round((new Date(hist[i + 1].at).getTime() - new Date(hist[i].at).getTime()) / 86400000)
        );
        const list = dwells.get(hist[i].stage) ?? [];
        list.push(days);
        dwells.set(hist[i].stage, list);
      }
    }
    return FUNNEL_STAGES.map((s) => ({ stage: s, days: median(dwells.get(s) ?? []) }));
  }, [apps]);

  const max = Math.max(1, ...rows.map((r) => r.days));
  const hasData = rows.some((r) => r.days > 0);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Median days in each stage</h2>
      <p className="mt-0.5 text-xs text-zinc-500">How long applications typically sit before moving on.</p>
      {!hasData ? (
        <p className="mt-3 text-sm text-zinc-500">Not enough stage movement yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.stage}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-zinc-800">
                  <span className={cx("h-2 w-2 rounded-full", STAGE_META[r.stage].dot)} />
                  {STAGE_META[r.stage].label}
                </span>
                <span className="font-semibold text-zinc-900">
                  {r.days > 0 ? `${r.days}d` : "—"}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cx("h-full rounded-full", STAGE_META[r.stage].dot)}
                  style={{ width: `${Math.max((r.days / max) * 100, r.days > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Rejection reasons: what rejected applications say about why (recorded on the detail page). */
function RejectionReasons({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const rejected = apps.filter((a) => a.stage === "rejected");
    const counts = new Map<string, number>();
    let none = 0;
    for (const a of rejected) {
      const r = a.rejectionReason?.trim();
      if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
      else none += 1;
    }
    const list = [...counts.entries()].sort((x, y) => y[1] - x[1]);
    if (none > 0) list.push(["Not recorded", none]);
    return { list, total: rejected.length };
  }, [apps]);

  const max = Math.max(1, ...rows.list.map((r) => r[1]));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Rejection reasons</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        {rows.total === 0 ? "Patterns in why applications get rejected." : `Patterns across ${rows.total} rejected application${rows.total === 1 ? "" : "s"}.`}
      </p>
      {rows.list.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No rejections recorded yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.list.map(([reason, count]) => (
            <div key={reason}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-800">{reason}</span>
                <span className="font-semibold text-zinc-900">{count}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${Math.max((count / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Outcomes (recruiting-funnel research pattern): interview→offer conversion,
 *  offer acceptance rate, and median days from first applied to offer. These are
 *  the metrics that tell you where the funnel is leaking — sourcing quality vs.
 *  interview performance vs. offer/comp stage. */
function Outcomes({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const interviewed = apps.filter((a) => reachedStage(a, "interview")).length;
    const offers = apps.filter((a) => reachedStage(a, "offer"));
    const accepted = apps.filter((a) => a.stage === "offer" && (a.outcome ?? "waiting") === "accepted").length;
    const decided = apps.filter(
      (a) => a.stage === "offer" && (a.outcome ?? "waiting") !== "waiting"
    ).length;

    const timesToOffer = offers
      .map((a) => {
        const hist = [...a.stageHistory].sort(
          (x, y) => new Date(x.at).getTime() - new Date(y.at).getTime()
        );
        const start = hist.find((h) => ["wishlist", "applied"].includes(h.stage));
        const got = hist.find((h) => h.stage === "offer");
        if (!start || !got) return null;
        return Math.max(0, Math.round((new Date(got.at).getTime() - new Date(start.at).getTime()) / 86400000));
      })
      .filter((n): n is number => n !== null);

    return [
      {
        label: "Interview → offer",
        value: interviewed === 0 ? "—" : `${Math.round((offers.length / interviewed) * 100)}%`,
        hint: `${offers.length} of ${interviewed} interviewed apps became offers`,
      },
      {
        label: "Offer acceptance",
        value: decided === 0 ? "—" : `${Math.round((accepted / decided) * 100)}%`,
        hint: `${accepted} accepted · ${decided - accepted} declined of ${decided} decided`,
      },
      {
        label: "Median time to offer",
        value: timesToOffer.length === 0 ? "—" : `${median(timesToOffer)}d`,
        hint: "first applied → offer received",
      },
    ];
  }, [apps]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Outcomes</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Where the funnel pays off — or leaks.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-zinc-50 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{r.label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{r.value}</div>
            <div className="mt-0.5 text-xs text-zinc-400">{r.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Which channels produce responses?" (Huntr pattern): SourceBreakdown shows where
 *  applications come from — this shows which sources actually get replies.
 *  Needs 2+ attempted applications per source before a rate means anything. */
function SourceResponseRate({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const by = new Map<string, { attempted: number; responded: number }>();
    for (const a of apps) {
      if (a.stage === "wishlist") continue;
      const s = a.source?.trim() || "Not recorded";
      const e = by.get(s) ?? { attempted: 0, responded: 0 };
      e.attempted += 1;
      if (reachedStage(a, "assessment") || reachedStage(a, "interview") || reachedStage(a, "offer")) {
        e.responded += 1;
      }
      by.set(s, e);
    }
    return [...by.entries()]
      .filter(([, e]) => e.attempted >= 2)
      .map(([source, e]) => ({
        source,
        rate: Math.round((e.responded / e.attempted) * 100),
        responded: e.responded,
        attempted: e.attempted,
      }))
      .sort((x, y) => y.rate - x.rate || y.attempted - x.attempted);
  }, [apps]);

  const max = Math.max(1, ...rows.map((r) => r.rate));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Response rate by source</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Which channels actually get replies back.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Not enough data yet — a source needs 2+ applications before its rate means anything.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.source}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-800">{r.source}</span>
                <span className="text-zinc-500">
                  <span className="font-semibold text-zinc-900">{r.rate}%</span>
                  <span> · {r.responded} of {r.attempted} responded</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${Math.max((r.rate / max) * 100, r.rate > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** "How fast does each channel reply?" Median days from applied → first
 *  response (assessment/interview/offer) per source. Needs 2+ responded
 *  applications per source before a median means anything. */
function ResponseTimeBySource({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const by = new Map<string, number[]>();
    for (const a of apps) {
      if (a.stage === "wishlist") continue;
      const start = a.stageHistory.find((h) => ["wishlist", "applied"].includes(h.stage));
      const first = a.stageHistory.find((h) => ["assessment", "interview", "offer"].includes(h.stage));
      if (!start || !first) continue;
      const days = Math.max(
        0,
        Math.round((new Date(first.at).getTime() - new Date(start.at).getTime()) / 86400000)
      );
      const src = a.source?.trim() || "Not recorded";
      by.set(src, [...(by.get(src) ?? []), days]);
    }
    return [...by.entries()]
      .filter(([, days]) => days.length >= 2)
      .map(([source, days]) => ({ source, days: median(days), n: days.length }))
      .sort((x, y) => x.days - y.days);
  }, [apps]);

  const max = Math.max(1, ...rows.map((r) => r.days));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Response time by source</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Median days until the first reply, per channel.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Not enough data yet — a source needs 2+ responded applications before its median means anything.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.source}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-800">{r.source}</span>
                <span className="text-zinc-500">
                  <span className="font-semibold text-zinc-900">{r.days}d</span>
                  <span> median · {r.n} replied</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cx("h-full rounded-full", r.days <= 7 ? "bg-emerald-600" : r.days <= 14 ? "bg-amber-500" : "bg-rose-500")}
                  style={{ width: `${Math.max((r.days / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function median(nums: number[]): number {  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

/**
 * You vs industry (Huntr 2025 job-search benchmarks): response rate ~15%,
 * median application → first interview ~5.6 days, typical volume ~16 applications/week.
 */
function Benchmarks({ apps }: { apps: Application[] }) {
  const rows = useMemo(() => {
    const attempted = apps.filter((a) => a.stage !== "wishlist");
    const responded = apps.filter((a) =>
      a.stageHistory.some((h) => ["assessment", "interview", "offer"].includes(h.stage))
    );
    const responseRate = attempted.length === 0 ? 0 : (responded.length / attempted.length) * 100;

    const responseTimes = responded
      .map((a) => {
        const start = a.stageHistory.find((h) => ["wishlist", "applied"].includes(h.stage));
        const first = a.stageHistory.find((h) => ["assessment", "interview", "offer"].includes(h.stage));
        if (!start || !first) return null;
        return Math.max(
          0,
          Math.round((new Date(first.at).getTime() - new Date(start.at).getTime()) / 86400000)
        );
      })
      .filter((n): n is number => n !== null);

    // Applications per week over the active hunt window (earliest createdAt → today)
    const starts = apps.map((a) => new Date(a.createdAt).getTime());
    const earliest = Math.min(...starts);
    const days = Math.max(1, Math.round((Date.now() - earliest) / 86400000));
    const appsPerWeek = (attempted.length / days) * 7;

    type Status = "Great" | "On track" | "Below";
    const pill: Record<Status, string> = {
      Great: "bg-emerald-100 text-emerald-800",
      "On track": "bg-sky-100 text-sky-800",
      Below: "bg-amber-100 text-amber-800",
    };

    const rows: { metric: string; you: string; benchmark: string; status: Status; enough: boolean }[] = [
      {
        metric: "Response rate",
        you: `${Math.round(responseRate)}%`,
        benchmark: "~15%",
        status: responseRate >= 15 ? "Great" : responseRate >= 8 ? "On track" : "Below",
        enough: attempted.length >= 5,
      },
      {
        metric: "Median time to response",
        you: responseTimes.length === 0 ? "—" : `${median(responseTimes)}d`,
        benchmark: "~5.6d",
        status: responseTimes.length === 0 ? "Below" : median(responseTimes) <= 5.6 ? "Great" : "On track",
        enough: responseTimes.length >= 3,
      },
      {
        metric: "Applications per week",
        you: appsPerWeek.toFixed(1),
        benchmark: "~16",
        status: appsPerWeek >= 16 ? "Great" : appsPerWeek >= 8 ? "On track" : "Below",
        enough: days >= 7,
      },
    ];
    return { rows, pill };
  }, [apps]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Industry benchmarks</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Your hunt vs typical job-seeker numbers (Huntr 2025).
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-2 font-semibold">Metric</th>
              <th className="pb-2 pr-2 font-semibold">You</th>
              <th className="pb-2 pr-2 font-semibold">Industry</th>
              <th className="pb-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.rows.map((r) => (
              <tr key={r.metric} className="border-b border-zinc-100 last:border-0">
                <td className="py-2.5 pr-2 font-medium text-zinc-800">{r.metric}</td>
                <td className="py-2.5 pr-2 font-semibold text-zinc-900">{r.you}</td>
                <td className="py-2.5 pr-2 text-zinc-500">{r.benchmark}</td>
                <td className="py-2.5 text-right">
                  {r.enough ? (
                    <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold", rows.pill[r.status])}>
                      {r.status}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400" title="Need a little more data">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Tailored vs generic resumes: response-rate comparison (researched: +35% interviews when tailored). */
function TailoredComparison({ apps }: { apps: Application[] }) {
  const { tailored, generic } = useMemo(() => {
    const attempted = apps.filter((a) => a.stage !== "wishlist");
    const responded = (a: Application) =>
      a.stageHistory.some((h) => ["assessment", "interview", "offer"].includes(h.stage));
    const t = attempted.filter((a) => a.tailoredResume);
    const g = attempted.filter((a) => !a.tailoredResume);
    const rate = (list: Application[]) =>
      list.length === 0 ? null : Math.round((list.filter(responded).length / list.length) * 100);
    return { tailored: { n: t.length, rate: rate(t) }, generic: { n: g.length, rate: rate(g) } };
  }, [apps]);

  const rows = [
    { label: "Tailored resumes", ...tailored, bar: "bg-emerald-500" },
    { label: "Generic resumes", ...generic, bar: "bg-zinc-300" },
  ];
  const max = Math.max(1, ...(rows.map((r) => r.rate ?? 0)));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Tailored vs generic</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Response rate by resume approach. Research says tailored resumes earn ~35% more interviews.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-zinc-800">{r.label}</span>
              <span className="text-xs text-zinc-500">
                {r.rate === null ? (
                  "no data yet"
                ) : (
                  <>
                    <span className="text-base font-semibold text-zinc-900">{r.rate}%</span> · {r.n} applications
                  </>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cx("h-full rounded-full", r.bar)}
                style={{ width: `${r.rate === null ? 0 : Math.max((r.rate / max) * 100, 3)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {tailored.rate !== null && generic.rate !== null && tailored.rate > generic.rate && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Tailoring is paying off for you: +{tailored.rate - generic.rate}pp response rate on tailored applications.
        </p>
      )}
    </section>
  );
}

export default function Analytics() {
  const { data, loaded } = useStore();

  const stats = useMemo(() => {
    const apps = data.applications;
    const attempted = apps.filter((a) => a.stage !== "wishlist");
    const responded = apps.filter((a) =>
      a.stageHistory.some((h) => ["assessment", "interview", "offer"].includes(h.stage))
    );
    const offers = apps.filter((a) => a.stage === "offer").length;
    const rejected = apps.filter((a) => a.stage === "rejected").length;
    const responseRate = attempted.length === 0 ? 0 : Math.round((responded.length / attempted.length) * 100);

    // Days from first applied/wishlist to first response stage
    const responseTimes = responded
      .map((a) => {
        const start = a.stageHistory.find((h) => ["wishlist", "applied"].includes(h.stage));
        const first = a.stageHistory.find((h) => ["assessment", "interview", "offer"].includes(h.stage));
        if (!start || !first) return null;
        return Math.max(
          0,
          Math.round((new Date(first.at).getTime() - new Date(start.at).getTime()) / 86400000)
        );
      })
      .filter((n): n is number => n !== null);

    return {
      total: apps.length,
      responseRate,
      offers,
      rejected,
      medianResponseDays: median(responseTimes),
      attempted: attempted.length,
    };
  }, [data.applications]);

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {loaded ? "What your hunt looks like in numbers" : "Loading…"}
        </p>
      </div>

      {!loaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-64 rounded-xl bg-zinc-100" />
        </div>
      ) : stats.total === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">Not enough data yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Add a few applications and the charts will appear.</p>
          <Link
            href="/pipeline"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to pipeline
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Response rate", value: `${stats.responseRate}%`, hint: `${stats.attempted} applications past wishlist` },
              { label: "Offers", value: String(stats.offers), hint: "in the bag" },
              { label: "Rejections", value: String(stats.rejected), hint: "part of the game" },
              { label: "Median time to response", value: stats.medianResponseDays === 0 && stats.responseRate === 0 ? "—" : `${stats.medianResponseDays}d`, hint: "applied → first response" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{s.value}</div>
                <div className="mt-0.5 text-xs text-zinc-400">{s.hint}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Funnel apps={data.applications} />
            <Outcomes apps={data.applications} />
            <Benchmarks apps={data.applications} />
            <WeeklyBars apps={data.applications} />
            <SourceBreakdown apps={data.applications} />
            <SourceResponseRate apps={data.applications} />
            <ResponseTimeBySource apps={data.applications} />
            <TailoredComparison apps={data.applications} />
            <StageDwell apps={data.applications} />
            <RejectionReasons apps={data.applications} />
          </div>
        </>
      )}
    </div>
  );
}
