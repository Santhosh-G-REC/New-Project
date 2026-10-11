"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import { STAGE_META, STAR_TAG_SUGGESTIONS, type StarStory } from "../../lib/types";
import { cx } from "../../lib/utils";
import { MockTimer } from "../../components/MockTimer";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

/**
 * Curated questions to ask the interviewer (researched: the candidates who
 * ask sharp questions get remembered). Grouped by angle, one-click copy.
 */
const ASK_THEM: { group: string; questions: string[] }[] = [
  {
    group: "The role",
    questions: [
      "What does a strong first 90 days look like in this role?",
      "What are the hardest problems this team is working on right now?",
      "How is success measured for this position in the first year?",
    ],
  },
  {
    group: "The team",
    questions: [
      "How does the team handle disagreements on technical decisions?",
      "What's the on-call / support rotation like?",
      "How do juniors here get mentored — formal buddy system or ad hoc?",
    ],
  },
  {
    group: "Growth",
    questions: [
      "What did the last person who grew quickly in this role do differently?",
      "Are there internal mobility options after a year?",
      "How are promotions decided — what does the bar look like?",
    ],
  },
  {
    group: "The company",
    questions: [
      "What's something about working here that surprised you?",
      "How did the company handle the last big setback or pivot?",
      "What keeps you here instead of anywhere else?",
    ],
  },
];

function AskThemBank() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (q: string) => {
    try {
      await navigator.clipboard.writeText(q);
      setCopied(q);
      setTimeout(() => setCopied((c) => (c === q ? null : c)), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Questions to ask them</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Always have 2–3 ready. Sharp questions get you remembered.
      </p>
      <div className="mt-3 flex flex-col gap-4">
        {ASK_THEM.map((g) => (
          <div key={g.group}>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {g.group}
            </div>
            <ul className="mt-1.5 flex flex-col gap-1">
              {g.questions.map((q) => (
                <li
                  key={q}
                  className="group flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <span>{q}</span>
                  <button
                    onClick={() => copy(q)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-700 group-hover:opacity-100"
                    aria-label={`Copy question: ${q}`}
                  >
                    {copied === q ? "Copied ✓" : "Copy"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function PrepGroup({ applicationId }: { applicationId: string }) {
  const { data, togglePrepItem, addPrepItem, deletePrepItem } = useStore();
  const app = data.applications.find((a) => a.id === applicationId);
  const [label, setLabel] = useState("");

  const items = useMemo(
    () => data.prepItems.filter((p) => p.applicationId === applicationId),
    [data.prepItems, applicationId]
  );
  const done = items.filter((p) => p.done).length;

  if (!app) return null;

  const add = () => {
    if (!label.trim()) return;
    addPrepItem(applicationId, label.trim());
    setLabel("");
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/applications/${app.id}`} className="hover:underline">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            {app.company} <span className="font-normal text-zinc-500">· {app.role}</span>
          </h2>
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
            <span className={cx("h-2 w-2 rounded-full", STAGE_META[app.stage].dot)} />
            {STAGE_META[app.stage].label}
          </span>
          {items.length > 0 && (
            <span className="text-xs font-medium text-zinc-500">
              {done}/{items.length} done
            </span>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((p) => (
          <li
            key={p.id}
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50"
          >
            <button
              onClick={() => togglePrepItem(p.id)}
              role="checkbox"
              aria-checked={p.done}
              aria-label={p.label}
              className={cx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                p.done
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-300 bg-white hover:border-emerald-500"
              )}
            >
              {p.done && (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M2 6.5 5 9.5 10 2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={cx("flex-1 text-sm", p.done ? "text-zinc-400 line-through" : "text-zinc-800")}>
              {p.label}
            </span>
            <button
              onClick={() => deletePrepItem(p.id)}
              className="shrink-0 rounded px-1.5 text-sm leading-none text-zinc-300 opacity-0 hover:bg-zinc-200 hover:text-rose-600 group-hover:opacity-100"
              aria-label={`Delete "${p.label}"`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          className={inputCls}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. Revise OOP + OOAD parking-lot design"
          aria-label="New prep item"
        />
        <button
          onClick={add}
          disabled={!label.trim()}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </section>
  );
}

/** STAR story bank: competency-tagged stories + a practice mode that hides the notes. */
function StarBank({ loaded }: { loaded: boolean }) {
  const { data, addStarStory, deleteStarStory } = useStore();
  const [practice, setPractice] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [situation, setSituation] = useState("");
  const [task, setTask] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    data.starStories.forEach((st) => st.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [data.starStories]);

  const stories = useMemo(
    () => (tagFilter ? data.starStories.filter((s) => s.tags.includes(tagFilter)) : data.starStories),
    [data.starStories, tagFilter]
  );

  const toggleTag = (t: string) => {
    const norm = t.trim();
    if (!norm) return;
    setTags((prev) => (prev.includes(norm) ? prev.filter((x) => x !== norm) : [...prev, norm]));
  };

  const save = () => {
    if (!title.trim() || !situation.trim() || !task.trim() || !action.trim() || !result.trim()) return;
    addStarStory({
      title: title.trim(),
      situation: situation.trim(),
      task: task.trim(),
      action: action.trim(),
      result: result.trim(),
      tags,
    });
    setTitle(""); setSituation(""); setTask(""); setAction(""); setResult(""); setTags([]); setTagInput("");
    setFormOpen(false);
  };

  const reveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const starField =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">STAR story bank</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Reusable stories, tagged by competency. Flip on practice mode to rehearse out loud.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPractice((p) => !p)}
            aria-pressed={practice}
            className={cx(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              practice ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            )}
          >
            <span className={cx("h-2 w-2 rounded-full", practice ? "bg-emerald-400" : "bg-zinc-400")} />
            Practice mode {practice ? "on" : "off"}
          </button>
          <button
            onClick={() => setFormOpen((o) => !o)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            {formOpen ? "Close" : "+ Add story"}
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setTagFilter(null)}
            className={cx(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              tagFilter === null ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter((f) => (f === t ? null : t))}
              className={cx(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                tagFilter === t ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <input
            className={starField}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Story title — e.g. Led the campus fest website team"
            aria-label="Story title"
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["Situation", "Task", "Action", "Result"] as const).map((field) => {
              const val = { Situation: situation, Task: task, Action: action, Result: result }[field];
              const set = { Situation: setSituation, Task: setTask, Action: setAction, Result: setResult }[field];
              return (
                <div key={field}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{field}</div>
                  <textarea
                    className={starField}
                    rows={3}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={field === "Result" ? "Quantify it if you can — %, ₹, days, people" : `What happened…`}
                    aria-label={field}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Competency tags</div>
            <div className="flex flex-wrap gap-1.5">
              {STAR_TAG_SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={cx(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    tags.includes(t) ? "bg-emerald-600 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              className={cx(starField, "mt-2")}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  toggleTag(tagInput);
                  setTagInput("");
                }
              }}
              placeholder="Custom tag + Enter"
              aria-label="Custom tag"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={save}
              disabled={!title.trim() || !situation.trim() || !task.trim() || !action.trim() || !result.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              Save story
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {loaded && stories.length === 0 && (
          <p className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">
            {tagFilter
              ? `No stories tagged “${tagFilter}” yet.`
              : "No stories yet — add your first one. Two or three strong stories cover most HR rounds."}
          </p>
        )}
        {stories.map((s: StarStory) => {
          const hidden = practice && !revealed.has(s.id);
          return (
            <article key={s.id} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">{s.title}</h3>
                <div className="flex items-center gap-2">
                  {s.tags.map((t) => (
                    <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      {t}
                    </span>
                  ))}
                  <button
                    onClick={() => deleteStarStory(s.id)}
                    className="rounded px-1.5 text-sm leading-none text-zinc-300 hover:bg-zinc-100 hover:text-rose-600"
                    aria-label={`Delete story "${s.title}"`}
                  >
                    ×
                  </button>
                </div>
              </div>
              {hidden ? (
                <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-zinc-600">Say it out loud from memory.</p>
                  <p className="mt-0.5 text-xs text-zinc-400">Situation → Task → Action → Result, then check yourself.</p>
                  <button
                    onClick={() => reveal(s.id)}
                    className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
                  >
                    Reveal my notes
                  </button>
                </div>
              ) : (
                <>
                  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(["Situation", "Task", "Action", "Result"] as const).map((field) => (
                      <div key={field}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{field}</dt>
                        <dd className="mt-1 text-sm text-zinc-700">
                          {{ Situation: s.situation, Task: s.task, Action: s.action, Result: s.result }[field]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {practice && (
                    <button
                      onClick={() => reveal(s.id)}
                      className="mt-3 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                    >
                      Hide again
                    </button>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Prep() {
  const { data, loaded } = useStore();

  /** Applications worth prepping for: in assessment/interview, or already have items. */
  const targets = useMemo(() => {
    const withItems = new Set(data.prepItems.map((p) => p.applicationId));
    return data.applications.filter(
      (a) => withItems.has(a.id) || ["assessment", "interview"].includes(a.stage)
    );
  }, [data.applications, data.prepItems]);

  /** Question bank: questions from company notes of companies with active applications. */
  const bank = useMemo(() => {
    const activeCompanies = new Set(
      data.applications
        .filter((a) => !["offer", "rejected"].includes(a.stage))
        .map((a) => a.company.toLowerCase())
    );
    return data.companyNotes
      .filter((n) => activeCompanies.has(n.company.toLowerCase()) && n.questions.length > 0)
      .map((n) => ({ company: n.company, questions: n.questions }));
  }, [data.applications, data.companyNotes]);

  /** Lessons learned: every round debrief with wentWell/improve notes, grouped
   *  by company — the reflection loop that makes each interview better. */
  const lessons = useMemo(() => {
    const out: Array<{ company: string; role: string; label: string; rating: number; wentWell?: string; improve?: string }> = [];
    for (const a of data.applications) {
      for (const r of a.interviews ?? []) {
        if (!r.debrief || (!r.debrief.wentWell && !r.debrief.improve)) continue;
        out.push({
          company: a.company,
          role: a.role,
          label: r.label,
          rating: r.debrief.rating,
          wentWell: r.debrief.wentWell,
          improve: r.debrief.improve,
        });
      }
    }
    return out;
  }, [data.applications]);

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Interview prep</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {loaded
            ? "Checklists for every live process, plus the questions companies actually asked"
            : "Loading…"}
        </p>
      </div>

      {!loaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-48 rounded-xl bg-zinc-100" />
        </div>
      ) : targets.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">Nothing to prep for yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Move an application to Online Assessment or Interview and a checklist will appear here.
          </p>
          <Link
            href="/pipeline"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to pipeline
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {targets.map((a) => (
              <PrepGroup key={a.id} applicationId={a.id} />
            ))}
          </div>
          <aside className="flex flex-col gap-4">
            <MockTimer />
            {lessons.length > 0 && (
              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-zinc-900">Lessons learned</h2>
                <p className="mt-0.5 text-xs text-zinc-500">From your interview debriefs.</p>
                <div className="mt-3 flex flex-col gap-3">
                  {lessons.map((l, i) => (
                    <div key={i} className="rounded-lg bg-zinc-50 px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-zinc-800">
                          {l.company} · {l.label}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-zinc-500" title="Debrief rating">
                          {"★".repeat(l.rating)}
                          <span className="text-zinc-300">{"★".repeat(5 - l.rating)}</span>
                        </span>
                      </div>
                      {l.wentWell && (
                        <p className="mt-1 text-xs text-zinc-600">
                          <span className="font-medium text-emerald-700">✓ </span>{l.wentWell}
                        </p>
                      )}
                      {l.improve && (
                        <p className="mt-0.5 text-xs text-zinc-600">
                          <span className="font-medium text-amber-700">→ </span>{l.improve}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Question bank</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Real questions, from your company notes.</p>
              {bank.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">
                  No questions yet — add them under Companies.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-4">
                  {bank.map((b) => (
                    <div key={b.company}>
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {b.company}
                      </div>
                      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
                        {b.questions.map((q, i) => (
                          <li key={i} className="text-sm text-zinc-700">{q}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <AskThemBank />
          </aside>
        </div>
      )}
      <StarBank loaded={loaded} />
    </div>
  );
}
