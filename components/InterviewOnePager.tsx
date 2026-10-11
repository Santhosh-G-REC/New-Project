"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { STAGE_META } from "../lib/types";
import {
  cx,
  deadlineLabel,
  formatDeadline,
  formatDateTime,
  parseCtcMonthly,
  formatMonthly,
} from "../lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-zinc-200 bg-white p-5 print:border-zinc-300 print:p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Interview-day one-pager: everything about one application on a single
 * printable page — rounds, contacts, prep checklist, company research.
 */
export function InterviewOnePager() {
  const params = useParams<{ id: string }>();
  const { data, loaded } = useStore();
  const app = data.applications.find((a) => a.id === params.id);

  // Prerender-safe "generated on" stamp (Next 16 rejects Date.now() in render).
  const [generated, setGenerated] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date();
    setGenerated(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`);
  }, []);

  const note = useMemo(
    () =>
      app
        ? data.companyNotes.find((n) => n.company.toLowerCase() === app.company.toLowerCase())
        : undefined,
    [data.companyNotes, app]
  );
  const prep = useMemo(
    () => (app ? data.prepItems.filter((p) => p.applicationId === app.id) : []),
    [data.prepItems, app]
  );
  const monthly = app?.ctc ? parseCtcMonthly(app.ctc) : null;

  if (!loaded) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded bg-zinc-100" />
        <div className="h-64 rounded-xl bg-zinc-100" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Application not found</h1>
        <Link
          href="/pipeline"
          className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Back to pipeline
        </Link>
      </div>
    );
  }

  const rounds = [...(app.interviews ?? [])].sort((a, b) =>
    (a.at ?? "9999").localeCompare(b.at ?? "9999")
  );
  const linkedResume = app.resumeId ? data.resumes.find((r) => r.id === app.resumeId) : undefined;

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href={`/applications/${app.id}`}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          ← Back to application
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Print one-pager
        </button>
      </div>

      <div className="border-b border-zinc-200 pb-4 print:pb-3">
        <div className="flex items-center gap-2">
          <span className={cx("h-2.5 w-2.5 rounded-full", STAGE_META[app.stage].dot)} />
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Interview one-pager · {STAGE_META[app.stage].label}
            {generated && ` · generated ${generated}`}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{app.company}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{app.role}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
        <Section title="Key facts">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {[
              ["CTC", app.ctc ? (monthly ? `${app.ctc} (${formatMonthly(monthly)})` : app.ctc) : "—"],
              ["Location", app.location ?? "—"],
              ["Work mode", app.workMode ? app.workMode[0].toUpperCase() + app.workMode.slice(1) : "—"],
              ["Deadline", app.deadline ? `${formatDeadline(app.deadline)} · ${deadlineLabel(app.deadline)}` : "—"],
              ["Applied via", app.source ?? "—"],
              ["Next action", app.nextAction ? `${app.nextAction}${app.nextActionDate ? ` (${formatDeadline(app.nextActionDate)})` : ""}` : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-zinc-500">{k}</dt>
                <dd className="font-medium text-zinc-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {rounds.length > 0 && (
          <Section title="Interview rounds">
            <ul className="flex flex-col gap-2.5">
              {rounds.map((r) => (
                <li key={r.id}>
                  <div className="text-sm font-semibold text-zinc-900">{r.label}</div>
                  <div className="text-xs text-zinc-500">
                    {r.at && formatDateTime(r.at) ? `${formatDateTime(r.at)}` : ""}
                    {r.interviewer ? ` · with ${r.interviewer}` : ""}
                    {r.link ? " · meeting link on the application page" : ""}
                  </div>
                  {r.notes && <div className="mt-0.5 text-xs text-zinc-600">{r.notes}</div>}
                  {r.debrief && (
                    <div className="mt-0.5 text-xs text-zinc-600">
                      <span className="font-medium">Debrief ({"★".repeat(r.debrief.rating)}):</span>
                      {r.debrief.wentWell ? ` went well — ${r.debrief.wentWell}` : ""}
                      {r.debrief.improve ? ` · improve — ${r.debrief.improve}` : ""}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {app.contacts.length > 0 && (
          <Section title="Contacts">
            <ul className="flex flex-col gap-2">
              {app.contacts.map((c, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-zinc-900">{c.name}</span>
                  {c.detail && <span className="text-zinc-500"> — {c.detail}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {prep.length > 0 && (
          <Section title="Prep checklist">
            <ul className="flex flex-col gap-2">
              {prep.map((p) => (
                <li key={p.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={cx(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                      p.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300"
                    )}
                  >
                    {p.done && "✓"}
                  </span>
                  <span className={p.done ? "text-zinc-400 line-through" : "text-zinc-800"}>{p.label}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(app.tailoredResume || linkedResume) && (
          <Section title="Resume to carry">
            <p className="text-sm text-zinc-700">
              {linkedResume ? <span className="font-medium text-zinc-900">{linkedResume.name}</span> : "Your linked resume"}
              {app.tailoredResume && " — tailored for this role"}
              . Bring a printed copy.
            </p>
          </Section>
        )}

        {data.starStories.length > 0 && (
          <Section title="STAR stories to tell">
            <ul className="flex flex-col gap-2">
              {data.starStories.slice(0, 4).map((s) => (
                <li key={s.id} className="text-sm">
                  <span className="font-medium text-zinc-900">{s.title}</span>
                  {s.tags.length > 0 && (
                    <span className="text-zinc-500"> — fits: {s.tags.join(", ")}</span>
                  )}
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {s.result}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {note && (
          <Section title={`Research — ${note.company}`}>
            {note.about && <p className="text-sm text-zinc-700">{note.about}</p>}
            {note.process && (
              <p className="mt-2 text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Process: </span>
                {note.process}
              </p>
            )}
            {note.questions.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-zinc-500">Questions asked</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {note.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {app.notes && (
          <Section title="Notes">
            <p className="whitespace-pre-wrap text-sm text-zinc-700">{app.notes}</p>
          </Section>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-400 print:hidden">
        Printed from PlaceTrack — your data never leaves this browser.
      </p>
    </div>
  );
}
