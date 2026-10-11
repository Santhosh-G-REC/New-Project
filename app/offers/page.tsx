"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "../../lib/store";
import { OutcomeChip } from "../../components/OutcomeChip";
import type { Application } from "../../lib/types";
import {
  cx,
  deadlineLabel,
  formatMonthly,
  parseCtcMonthly,
} from "../../lib/utils";

const MODE_LABEL: Record<string, string> = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" };

const COMP_KEYS = ["base", "bonus", "signing", "equity"] as const;
const COMP_LABEL: Record<(typeof COMP_KEYS)[number], string> = {
  base: "Base",
  bonus: "Bonus",
  signing: "Signing",
  equity: "Equity",
};

function BestBadge() {
  return (
    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
      Best
    </span>
  );
}

function OfferRow({
  app,
  monthly,
  isBest,
  compMonthly,
  compBest,
}: {
  app: Application;
  monthly: number | null;
  isBest: boolean;
  compMonthly: Record<(typeof COMP_KEYS)[number], number | null>;
  compBest: Record<(typeof COMP_KEYS)[number], boolean>;
}) {
  return (
    <tr className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/60">
      <td className="px-4 py-3">
        <Link href={`/applications/${app.id}`} className="font-semibold text-zinc-900 hover:text-emerald-700">
          {app.company}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600">{app.role}</td>
      <td className="px-4 py-3">
        {app.ctc ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-sm font-semibold text-zinc-900">{app.ctc}</span>
            {monthly !== null && (
              <span className="text-xs text-zinc-400">({formatMonthly(monthly)})</span>
            )}
            {isBest && <BestBadge />}
          </span>
        ) : (
          <span className="text-sm text-zinc-400">—</span>
        )}
      </td>
      {COMP_KEYS.map((k) => (
        <td key={k} className="px-4 py-3">
          {app.compBreakdown?.[k] ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-sm font-semibold text-zinc-900">{app.compBreakdown[k]}</span>
              {compBest[k] && <BestBadge />}
            </span>
          ) : (
            <span className="text-sm text-zinc-300">—</span>
          )}
        </td>
      ))}
      <td className="px-4 py-3 text-sm text-zinc-600">{app.location ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">
        {app.workMode ? MODE_LABEL[app.workMode] : "—"}
      </td>
      <td className="px-4 py-3">
        <OutcomeChip outcome={app.outcome} />
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600">
        {app.deadline ? deadlineLabel(app.deadline) : <span className="text-zinc-400">No deadline</span>}
      </td>
    </tr>
  );
}

export default function Offers() {
  const { data, loaded } = useStore();

  const offers = useMemo(() => {
    const rows = data.applications
      .filter((a) => a.stage === "offer")
      .map((app) => ({
        app,
        monthly: app.ctc ? parseCtcMonthly(app.ctc) : null,
        compMonthly: Object.fromEntries(
          COMP_KEYS.map((k) => [
            k,
            app.compBreakdown?.[k] ? parseCtcMonthly(app.compBreakdown[k]!) : null,
          ])
        ) as Record<(typeof COMP_KEYS)[number], number | null>,
      }));
    const max = Math.max(0, ...rows.map((r) => r.monthly ?? 0));
    const compMax = Object.fromEntries(
      COMP_KEYS.map((k) => [k, Math.max(0, ...rows.map((r) => r.compMonthly[k] ?? 0))])
    ) as Record<(typeof COMP_KEYS)[number], number>;
    const hasBreakdown = rows.some((r) =>
      COMP_KEYS.some((k) => r.app.compBreakdown?.[k])
    );
    return {
      rows: rows
        .sort((x, y) => (y.monthly ?? -1) - (x.monthly ?? -1))
        .map((r) => ({
          ...r,
          isBest: r.monthly !== null && max > 0 && r.monthly === max,
          compBest: Object.fromEntries(
            COMP_KEYS.map((k) => [
              k,
              r.compMonthly[k] !== null && compMax[k] > 0 && r.compMonthly[k] === compMax[k],
            ])
          ) as Record<(typeof COMP_KEYS)[number], boolean>,
        })),
      hasBreakdown,
    };
  }, [data.applications]);

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Offers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {loaded
            ? `${offers.rows.length} ${offers.rows.length === 1 ? "offer" : "offers"} on the table`
            : "Loading…"}
        </p>
      </div>

      {!loaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-64 rounded-xl bg-zinc-100" />
        </div>
      ) : offers.rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">No offers yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your pipeline will show up here — compare CTC, outcomes, and deadlines side by side.
          </p>
          <Link
            href="/pipeline"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to pipeline
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70">
                {[
                  "Company",
                  "Role",
                  "CTC",
                  ...(offers.hasBreakdown ? COMP_KEYS.map((k) => COMP_LABEL[k]) : []),
                  "Location",
                  "Mode",
                  "Outcome",
                  "Deadline",
                ].map((h) => (
                  <th
                    key={h}
                    className={cx(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500",
                      h === "Outcome" && "whitespace-nowrap"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offers.rows.map((r) => (
                <OfferRow
                  key={r.app.id}
                  app={r.app}
                  monthly={r.monthly}
                  isBest={r.isBest}
                  compMonthly={r.compMonthly}
                  compBest={r.compBest}
                />
              ))}
            </tbody>
          </table>
          {offers.hasBreakdown && (
            <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-400">
              Comp breakdowns come from each offer's detail page — the{" "}
              <span className="font-semibold text-emerald-700">Best</span> badge marks the
              highest parseable value in its column.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
