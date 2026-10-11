"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import { STAGE_META, type Application } from "../../lib/types";
import { cx } from "../../lib/utils";

interface Row {
  app: Application;
  name: string;
  detail: string;
  metHow?: string;
  followUpAt?: string;
}

/** "YYYY-MM-DD" in local time — read client-side so prerender stays stable. */
function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function followUpTone(followUpAt: string | undefined, today: string | null): "overdue" | "due" | "none" {
  if (!followUpAt || today === null) return "none";
  if (followUpAt < today) return "overdue";
  if (followUpAt <= addDays(today, 3)) return "due";
  return "none";
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function lastTouchedAt(app: Application, activity: { applicationId?: string; at: string }[]): string | null {
  const hit = activity.find((e) => e.applicationId === app.id);
  return hit ? hit.at : null;
}

export default function ContactsPage() {
  const { data, loaded } = useStore();
  const [query, setQuery] = useState("");
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(todayLocal());
  }, []);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Row[] = [];
    for (const app of data.applications) {
      for (const c of app.contacts) {
        if (
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.detail.toLowerCase().includes(q) ||
          (c.metHow ?? "").toLowerCase().includes(q) ||
          app.company.toLowerCase().includes(q)
        ) {
          out.push({ app, name: c.name, detail: c.detail, metHow: c.metHow, followUpAt: c.followUpAt });
        }
      }
    }
    // People with a pending follow-up float to the top, most urgent first.
    return out.sort((a, b) => {
      const fa = a.followUpAt ?? "";
      const fb = b.followUpAt ?? "";
      if (fa && fb) return fa.localeCompare(fb);
      if (fa) return -1;
      if (fb) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [data.applications, query]);

  const totalPeople = rows.length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loaded
              ? `${totalPeople} ${totalPeople === 1 ? "person" : "people"} across your applications — recruiters, referrers, hiring managers`
              : "Loading…"}
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, companies, notes…"
          aria-label="Search contacts"
          className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        />
      </div>

      {!loaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-48 rounded-xl bg-zinc-100" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">
            {query ? "No contacts match your search" : "No contacts yet"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            {query
              ? "Try a different name, company or keyword."
              : "Hiring is about people, not portals. Add recruiters, referrers and hiring managers from each application's detail page and they'll show up here."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {rows.map((r, i) => (
              <li key={`${r.app.id}-${i}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-zinc-50">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800"
                >
                  {r.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-zinc-900">{r.name}</span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <span className={cx("h-1.5 w-1.5 rounded-full", STAGE_META[r.app.stage].dot)} aria-hidden="true" />
                      {r.app.company} · {r.app.role}
                    </span>
                  </div>
                  {r.detail && <p className="mt-0.5 truncate text-sm text-zinc-500">{r.detail}</p>}
                  {r.metHow && (
                    <p className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      Met via {r.metHow}
                    </p>
                  )}
                  {(() => {
                    const tone = followUpTone(r.followUpAt, today);
                    if (tone === "none") return null;
                    const date = new Date(`${r.followUpAt}T00:00:00`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    });
                    return (
                      <p
                        className={cx(
                          "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                          tone === "overdue" ? "bg-rose-100 text-rose-700" : "bg-amber-50 text-amber-700"
                        )}
                      >
                        {tone === "overdue" ? `Follow-up overdue · was ${date}` : `Follow up by ${date}`}
                      </p>
                    );
                  })()}
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {(() => {
                      const at = lastTouchedAt(r.app, data.activity);
                      return at
                        ? `Last activity ${new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : "No activity recorded yet";
                    })()}
                  </p>
                </div>
                <Link
                  href={`/applications/${r.app.id}`}
                  className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
