"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import { STAGE_META, type Application } from "../../lib/types";
import { cx, timeAgo } from "../../lib/utils";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

function NoteEditor({ company }: { company: string }) {
  const { data, upsertCompanyNote, addQuestion, deleteQuestion } = useStore();
  const note = data.companyNotes.find((n) => n.company.toLowerCase() === company.toLowerCase());
  const [about, setAbout] = useState(note?.about ?? "");
  const [process, setProcess] = useState(note?.process ?? "");
  const [industry, setIndustry] = useState(note?.industry ?? "");
  const [rating, setRating] = useState(note?.rating ?? 0);
  const [question, setQuestion] = useState("");
  const [saved, setSaved] = useState(false);

  // Refresh local fields when switching companies
  const key = company;
  const dirty =
    about !== (note?.about ?? "") ||
    process !== (note?.process ?? "") ||
    industry !== (note?.industry ?? "") ||
    rating !== (note?.rating ?? 0);

  const save = () => {
    upsertCompanyNote(company, {
      about: about.trim() || undefined,
      process: process.trim() || undefined,
      industry: industry.trim() || undefined,
      rating: rating || undefined,
    });
    setSaved(true);
  };

  const addQ = () => {
    if (!question.trim()) return;
    addQuestion(company, question.trim());
    setQuestion("");
  };

  const apps: Application[] = useMemo(
    () => data.applications.filter((a) => a.company.toLowerCase() === company.toLowerCase()),
    [data.applications, company]
  );

  return (
    <div key={key} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{company}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {apps.length === 0
            ? "No applications yet"
            : `${apps.length} application${apps.length > 1 ? "s" : ""}`}
          {note?.updatedAt ? ` · notes updated ${timeAgo(note.updatedAt)}` : ""}
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Your rating</h3>
            <div className="mt-1.5 flex items-center gap-0.5" role="radiogroup" aria-label="Company rating">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={rating === v}
                  aria-label={`${v} star${v === 1 ? "" : "s"}`}
                  onClick={() => {
                    setRating(v === rating ? 0 : v);
                    setSaved(false);
                  }}
                  className={cx(
                    "rounded p-0.5 text-xl leading-none transition-transform",
                    v <= rating ? "text-amber-400" : "text-zinc-200 hover:text-zinc-300"
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-48 flex-1">
            <label className={labelCls} htmlFor="co-industry">Industry</label>
            <input
              id="co-industry"
              className={inputCls}
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); setSaved(false); }}
              placeholder="e.g. Fintech, SaaS, E-commerce"
            />
          </div>
        </div>
        <h3 className="mt-4 text-sm font-semibold text-zinc-900">About the company</h3>
        <textarea
          className={cx(inputCls, "mt-2")}
          rows={3}
          value={about}
          onChange={(e) => { setAbout(e.target.value); setSaved(false); }}
          placeholder="What do they do, culture, pay bands, locations…"
        />
        <h3 className="mt-4 text-sm font-semibold text-zinc-900">Interview process</h3>
        <textarea
          className={cx(inputCls, "mt-2")}
          rows={2}
          value={process}
          onChange={(e) => { setProcess(e.target.value); setSaved(false); }}
          placeholder="e.g. Aptitude → Programming (5 problems) → Technical HR → HR"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty}
            className={cx(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              dirty ? "bg-emerald-600 text-white hover:bg-emerald-700" : "cursor-default bg-zinc-100 text-zinc-400"
            )}
          >
            Save notes
          </button>
          {saved && !dirty && <span className="text-xs font-medium text-emerald-700">Saved</span>}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-900">Questions asked</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Collect real questions from interviews and OAs.</p>
        {(note?.questions.length ?? 0) === 0 && (
          <p className="mt-2 text-sm text-zinc-400">No questions recorded yet.</p>
        )}
        <ul className="mt-2 flex flex-col gap-2">
          {(note?.questions ?? []).map((q, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
              <span className="text-sm text-zinc-800">{q}</span>
              <button
                onClick={() => deleteQuestion(company, i)}
                className="shrink-0 rounded px-1.5 text-sm leading-none text-zinc-300 hover:bg-zinc-200 hover:text-rose-600"
                aria-label="Delete question"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            className={inputCls}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addQ()}
            placeholder="e.g. Reverse a linked list without extra space"
            aria-label="New question"
          />
          <button
            onClick={addQ}
            disabled={!question.trim()}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </section>

      {apps.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-zinc-900">Your applications here</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {apps.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/applications/${a.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <span className={cx("h-2 w-2 shrink-0 rounded-full", STAGE_META[a.stage].dot)} />
                  <span className="font-medium">{a.role}</span>
                  <span className="text-zinc-400">· {STAGE_META[a.stage].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Companies() {
  const { data, loaded } = useStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const companies = useMemo(() => {
    const counts = new Map<string, { n: number; stages: Set<string>; rating?: number; industry?: string }>();
    for (const a of data.applications) {
      const key = a.company;
      const found = [...counts.keys()].find((k) => k.toLowerCase() === key.toLowerCase());
      const entry = counts.get(found ?? key) ?? { n: 0, stages: new Set<string>() };
      entry.n += 1;
      entry.stages.add(a.stage);
      counts.set(found ?? key, entry);
    }
    for (const n of data.companyNotes) {
      const found = [...counts.keys()].find((k) => k.toLowerCase() === n.company.toLowerCase());
      const entry = counts.get(found ?? n.company) ?? { n: 0, stages: new Set<string>() };
      entry.rating = n.rating;
      entry.industry = n.industry;
      counts.set(found ?? n.company, entry);
    }
    const q = query.trim().toLowerCase();
    return [...counts.entries()]
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
  }, [data.applications, data.companyNotes, query]);

  const active = selected ?? companies[0]?.[0] ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Companies</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loaded ? `${companies.length} companies in your orbit` : "Loading…"}
          </p>
        </div>
        <input
          className="w-64 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          aria-label="Search companies"
        />
      </div>

      {!loaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-64 rounded-xl bg-zinc-100" />
        </div>
      ) : companies.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">No companies yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add an application and it will appear here for research notes.
          </p>
          <Link
            href="/pipeline"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to pipeline
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="flex flex-col gap-1">
            {companies.map(([name, info]) => {
              const isActive = name === active;
              return (
                <li key={name}>
                  <button
                    onClick={() => setSelected(name)}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isActive ? "bg-emerald-50 font-semibold text-emerald-800" : "text-zinc-700 hover:bg-zinc-100"
                    )}
                  >
                    <span className="flex-1 truncate">
                      {name}
                      {info.industry && (
                        <span className="block truncate text-[11px] font-normal text-zinc-400">
                          {info.industry}
                        </span>
                      )}
                    </span>
                    {info.rating ? (
                      <span
                        className="text-xs font-semibold text-amber-500"
                        title={`Your rating: ${info.rating} of 5`}
                        aria-label={`Rated ${info.rating} of 5`}
                      >
                        {"★".repeat(info.rating)}
                      </span>
                    ) : null}
                    {info.stages.size > 0 && (
                      <span
                        className="flex items-center gap-1"
                        title={`Stages: ${[...info.stages].map((s) => STAGE_META[s as keyof typeof STAGE_META].label).join(", ")}`}
                      >
                        {[...info.stages].map((s) => (
                          <span
                            key={s}
                            className={cx("h-2 w-2 rounded-full", STAGE_META[s as keyof typeof STAGE_META].dot)}
                          />
                        ))}
                      </span>
                    )}
                    {info.n > 0 && (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                        {info.n}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {active ? <NoteEditor key={active} company={active} /> : null}
        </div>
      )}
    </div>
  );
}
