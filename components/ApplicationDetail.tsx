"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useStore } from "../lib/store";
import { OutcomeChip } from "./OutcomeChip";
import {
  STAGE_META,
  STAGES,
  APPLICATION_SOURCES,
  fitScoreTotal,
  type Application,
  type Assessment,
  type FitScore,
  type InterviewRound,
  type OfferOutcome,
  type Stage,
  type WorkMode,
} from "../lib/types";
import { cx, deadlineLabel, formatDeadline, formatDateTime, formatMonthly, isOverdue, parseCtcMonthly, parseKeywords, scoreKeywords, extractJdKeywords, timeAgo } from "../lib/utils";
import { downloadIcs, downloadRoundIcs } from "../lib/ics";
import { announce } from "../lib/announce";
import { InterestStars } from "./InterestStars";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Apply-speed chip: how many days after posting the user applied.
 * Research says early applicants do better; stale listings (>30d) get flagged.
 */
function ApplyLagChip({ app }: { app: Application }) {
  const appliedAt = app.stageHistory.find((h) => h.stage === "applied")?.at ?? app.createdAt;
  const lagDays = Math.max(
    0,
    Math.round((new Date(appliedAt).getTime() - new Date(app.postedAt!).getTime()) / 86400000)
  );
  const stale = lagDays > 30;
  return (
    <span
      title={
        stale
          ? "This listing has been up a while — the role may already be filled. Research favours applying early."
          : "Days between the job posting and your application. Research favours applying early."
      }
      className={cx(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        stale
          ? "bg-zinc-200 text-zinc-600"
          : lagDays <= 3
            ? "bg-emerald-100 text-emerald-800"
            : lagDays <= 7
              ? "bg-amber-50 text-amber-700"
              : "bg-zinc-100 text-zinc-600"
      )}
    >
      {stale ? "⚠ Possibly stale listing" : lagDays === 0 ? "Applied the day it posted ⚡" : `Applied ${lagDays}d after posting`}
    </span>
  );
}

/**
 * Structured offer comp editor (offer stage only). Free-text fields parsed with
 * parseCtcMonthly for comparison on the Offers page.
 */
function CompBreakdownEditor({ app }: { app: Application }) {
  const { updateApplication } = useStore();
  const bd = app.compBreakdown ?? {};
  const [form, setForm] = useState({
    base: bd.base ?? "",
    bonus: bd.bonus ?? "",
    signing: bd.signing ?? "",
    equity: bd.equity ?? "",
  });
  const [saved, setSaved] = useState(false);
  const dirty =
    form.base !== (bd.base ?? "") ||
    form.bonus !== (bd.bonus ?? "") ||
    form.signing !== (bd.signing ?? "") ||
    form.equity !== (bd.equity ?? "");
  const annual = useMemo(() => {
    const parts = [form.base, form.bonus, form.signing, form.equity].map((s) =>
      s.trim() ? parseCtcMonthly(s.trim()) : null
    );
    if (parts.some((p) => p === null)) return null;
    return (parts as number[]).reduce((a, b) => a + b, 0);
  }, [form]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };
  const save = () => {
    const compBreakdown = {
      base: form.base.trim() || undefined,
      bonus: form.bonus.trim() || undefined,
      signing: form.signing.trim() || undefined,
      equity: form.equity.trim() || undefined,
    };
    updateApplication(app.id, { compBreakdown });
    announce(`Comp breakdown saved for ${app.company}`);
    setSaved(true);
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            ["base", "Base (annual)", "e.g. 8 LPA"],
            ["bonus", "Bonus", "e.g. 1 L"],
            ["signing", "Signing bonus", "e.g. 50,000"],
            ["equity", "Equity / ESOPs", "e.g. 2 L"],
          ] as const
        ).map(([k, label, ph]) => (
          <div key={k}>
            <label className={labelCls} htmlFor={`cb-${k}`}>
              {label}
            </label>
            <input id={`cb-${k}`} className={inputCls} value={form[k]} onChange={set(k)} placeholder={ph} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          {annual !== null && annual > 0 ? (
            <>Estimated total: <span className="font-semibold text-zinc-700">{formatMonthly(annual)}</span></>
          ) : (
            "Break base/bonus/signing/equity apart so offers compare cleanly."
          )}
        </p>
        <button
          onClick={save}
          disabled={!dirty}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {saved && !dirty ? "Saved ✓" : "Save breakdown"}
        </button>
      </div>
    </div>
  );
}

/**
 * Salary-negotiation prep (researched: negotiation talking points work best
 * anchored in quantified achievements). Free notes plus your STAR stories
 * surfaced as suggested anchors for the ask.
 */
function NegotiationPrep({ app }: { app: Application }) {
  const { data, updateApplication } = useStore();
  const [notes, setNotes] = useState(app.negotiationNotes ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = notes !== (app.negotiationNotes ?? "");
  const anchors = useMemo(
    () => [...data.starStories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3),
    [data.starStories]
  );

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder="Your ask, market range, non-salary levers (joining bonus, WFH, ESOPs)…"
        aria-label="Negotiation notes"
        className={inputCls}
      />
      <div className="mt-2">
        <button
          onClick={() => {
            updateApplication(app.id, { negotiationNotes: notes.trim() || undefined });
            announce(`Negotiation notes saved for ${app.company}`);
            setSaved(true);
          }}
          disabled={!dirty}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {saved && !dirty ? "Saved ✓" : "Save notes"}
        </button>
      </div>
      {anchors.length > 0 && (
        <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-zinc-700">Suggested anchors for your ask</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {anchors.map((s) => (
              <li key={s.id} className="text-xs text-zinc-600">
                <span className="font-medium text-zinc-800">{s.title}</span>
                {s.result && <span className="text-zinc-500"> — {s.result}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-zinc-400">
            Anchor the ask in a quantified win — negotiators respond to evidence, not adjectives.
          </p>
        </div>
      )}
    </div>
  );
}

/** Online-assessment score log (researched: skills-assessment logging — platform,
 *  subject, score/threshold). Shows on assessment/interview stages. */
function AssessmentLog({ app }: { app: Application }) {
  const { updateApplication } = useStore();
  const [platform, setPlatform] = useState("");
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState("");
  const [at, setAt] = useState("");

  const assessments = app.assessments ?? [];

  const add = () => {
    if (!platform.trim()) return;
    const entry: Assessment = {
      id: `assess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      platform: platform.trim(),
      subject: subject.trim() || undefined,
      score: score.trim() || undefined,
      at: at || undefined,
    };
    updateApplication(app.id, { assessments: [...assessments, entry] });
    announce(`Assessment on ${entry.platform} logged for ${app.company}`);
    setPlatform("");
    setSubject("");
    setScore("");
    setAt("");
  };

  const remove = (id: string) => {
    updateApplication(app.id, { assessments: assessments.filter((a) => a.id !== id) });
  };

  return (
    <div>
      {assessments.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No scores logged yet — record the platform, what was tested, and how it went.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assessments.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900">{a.platform}</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {[a.subject, a.score, a.at ? formatDeadline(a.at) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="shrink-0 rounded px-1.5 text-sm leading-none text-zinc-300 hover:bg-zinc-200 hover:text-rose-600"
                aria-label="Delete assessment"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          className={inputCls}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="Platform *"
          aria-label="Assessment platform"
        />
        <input
          className={inputCls}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          aria-label="Assessment subject"
        />
        <input
          className={inputCls}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Score"
          aria-label="Assessment score"
        />
        <input
          type="date"
          className={inputCls}
          value={at}
          onChange={(e) => setAt(e.target.value)}
          aria-label="Assessment date"
        />
      </div>
      <button
        onClick={add}
        disabled={!platform.trim()}
        className="mt-2.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        Log assessment
      </button>
    </div>
  );
}

/** Inline-editable details form. */
function DetailsForm({ app }: { app: Application }) {
  const { updateApplication, data } = useStore();
  const [form, setForm] = useState({
    role: app.role,
    ctc: app.ctc ?? "",
    location: app.location ?? "",
    workMode: app.workMode ?? "",
    link: app.link ?? "",
    deadline: app.deadline ?? "",
    postedAt: app.postedAt ?? "",
    resumeId: app.resumeId ?? "",
    tailoredResume: app.tailoredResume ?? false,
    notes: app.notes ?? "",
    source: app.source ?? "",
    loop: app.loop ?? "",
    referredBy: app.referredBy ?? "",
    tags: app.tags.join(", "),
    nextAction: app.nextAction ?? "",
    nextActionDate: app.nextActionDate ?? "",
    rejectionReason: app.rejectionReason ?? "",
    interest: app.interest ?? 0,
  });
  const [saved, setSaved] = useState(false);
  const dirty = useMemo(() => {
    return (
      form.role !== app.role ||
      form.ctc !== (app.ctc ?? "") ||
      form.location !== (app.location ?? "") ||
      form.workMode !== (app.workMode ?? "") ||
      form.link !== (app.link ?? "") ||
      form.deadline !== (app.deadline ?? "") ||
      form.postedAt !== (app.postedAt ?? "") ||
      form.resumeId !== (app.resumeId ?? "") ||
      form.tailoredResume !== (app.tailoredResume ?? false) ||
      form.notes !== (app.notes ?? "") ||
      form.source !== (app.source ?? "") ||
      form.loop !== (app.loop ?? "") ||
      form.referredBy !== (app.referredBy ?? "") ||
      form.tags !== app.tags.join(", ") ||
      form.nextAction !== (app.nextAction ?? "") ||
      form.nextActionDate !== (app.nextActionDate ?? "") ||
      form.rejectionReason !== (app.rejectionReason ?? "") ||
      form.interest !== (app.interest ?? 0)
    );
  }, [form, app]);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  const save = () => {
    updateApplication(app.id, {
      role: form.role.trim(),
      ctc: form.ctc.trim() || undefined,
      location: form.location.trim() || undefined,
      workMode: (form.workMode as WorkMode) || undefined,
      link: form.link.trim() || undefined,
      deadline: form.deadline || undefined,
      postedAt: form.postedAt || undefined,
      resumeId: form.resumeId || undefined,
      tailoredResume: form.resumeId ? form.tailoredResume || undefined : undefined,
      notes: form.notes.trim() || undefined,
      source: form.source.trim() || undefined,
      loop: form.loop.trim() || undefined,
      referredBy: form.referredBy.trim() || undefined,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      nextAction: form.nextAction.trim() || undefined,
      nextActionDate: form.nextActionDate || undefined,
      rejectionReason: form.rejectionReason.trim() || undefined,
      interest: form.interest || undefined,
    });
    setSaved(true);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="d-role">Role</label>
          <input id="d-role" className={inputCls} value={form.role} onChange={set("role")} />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-deadline">Deadline</label>
          <input id="d-deadline" type="date" className={inputCls} value={form.deadline} onChange={set("deadline")} />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-posted">Job posted on</label>
          <input id="d-posted" type="date" className={inputCls} value={form.postedAt} onChange={set("postedAt")} />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-ctc">CTC / stipend</label>
          <input id="d-ctc" className={inputCls} value={form.ctc} onChange={set("ctc")} placeholder="e.g. 8 LPA" />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-location">Location</label>
          <input id="d-location" className={inputCls} value={form.location} onChange={set("location")} placeholder="e.g. Chennai" />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-mode">Work mode</label>
          <select id="d-mode" className={inputCls} value={form.workMode} onChange={set("workMode")}>
            <option value="">Not specified</option>
            <option value="onsite">Onsite</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="d-resume">Resume version</label>
          <select id="d-resume" className={inputCls} value={form.resumeId} onChange={set("resumeId")}>
            <option value="">None linked</option>
            {data.resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={form.tailoredResume}
              onChange={(e) => {
                setForm((f) => ({ ...f, tailoredResume: e.target.checked }));
                setSaved(false);
              }}
              disabled={!form.resumeId}
              className="h-3.5 w-3.5 rounded accent-emerald-600"
            />
            <span className={form.resumeId ? "" : "text-zinc-400"}>Tailored for this role</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="d-link">Application link</label>
          <input id="d-link" type="url" className={inputCls} value={form.link} onChange={set("link")} placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="d-tags">Tags</label>
          <input id="d-tags" className={inputCls} value={form.tags} onChange={set("tags")} placeholder="High Priority, Referral — comma separated" />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-source">Applied via</label>
          <input
            id="d-source"
            list="d-source-suggestions"
            className={inputCls}
            value={form.source}
            onChange={set("source")}
            placeholder="e.g. Internshala, Referral"
          />
          <datalist id="d-source-suggestions">
            {APPLICATION_SOURCES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelCls} htmlFor="d-loop">Search loop</label>
          <input id="d-loop" className={inputCls} value={form.loop} onChange={set("loop")} placeholder="e.g. Summer SDE intern 2027" />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-referredby">Referred by</label>
          <input id="d-referredby" className={inputCls} value={form.referredBy} onChange={set("referredBy")} placeholder="e.g. Priya Sharma — LinkedIn" />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-action">Next action</label>
          <input id="d-action" className={inputCls} value={form.nextAction} onChange={set("nextAction")} placeholder="e.g. Send thank-you mail" />
        </div>
        <div>
          <label className={labelCls} htmlFor="d-actiondate">Action due</label>
          <input id="d-actiondate" type="date" className={inputCls} value={form.nextActionDate} onChange={set("nextActionDate")} />
        </div>
        <div>
          <span className={labelCls} id="d-interest-label">Interest</span>
          <div className="flex items-center pt-1.5" aria-labelledby="d-interest-label">
            <InterestStars value={form.interest} onChange={(v) => { setForm((f) => ({ ...f, interest: v })); setSaved(false); }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">How much you want this role — shown on cards.</p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="d-notes">Notes</label>
          <textarea id="d-notes" className={inputCls} rows={3} value={form.notes} onChange={set("notes")} placeholder="Referral source, what to prep, anything useful…" />
        </div>
        {app.stage === "rejected" && (
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="d-rejection">Rejection reason</label>
            <textarea
              id="d-rejection"
              className={inputCls}
              rows={2}
              value={form.rejectionReason}
              onChange={set("rejectionReason")}
              placeholder="e.g. Resume screen — needed more backend projects"
            />
            <p className="mt-1 text-xs text-zinc-400">Recording why helps you spot patterns across rejections.</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty}
          className={cx(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            dirty
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "cursor-default bg-zinc-100 text-zinc-400"
          )}
        >
          Save changes
        </button>
        {saved && !dirty && <span className="text-xs font-medium text-emerald-700">Saved</span>}
      </div>
    </div>
  );
}

function Contacts({ app }: { app: Application }) {
  const { addContact, removeContact, setContactFollowUp, setContactMetHow } = useStore();
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");

  const add = () => {
    if (!name.trim()) return;
    addContact(app.id, name.trim(), detail.trim());
    setName("");
    setDetail("");
  };

  return (
    <div>
      {app.contacts.length === 0 && (
        <p className="text-sm text-zinc-400">No contacts yet — add the recruiter or referral who matters here.</p>
      )}
      <ul className="flex flex-col gap-2">
        {app.contacts.map((c, i) => (
          <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-900">{c.name}</div>
              {c.detail && <div className="text-xs text-zinc-500">{c.detail}</div>}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Met via
                  <input
                    value={c.metHow ?? ""}
                    onChange={(e) => setContactMetHow(app.id, i, e.target.value.trim() || undefined)}
                    placeholder="e.g. LinkedIn"
                    aria-label={`How you met ${c.name}`}
                    className="w-28 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-700 focus:border-emerald-600 focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Follow up
                  <input
                    type="date"
                    value={c.followUpAt ?? ""}
                    onChange={(e) => setContactFollowUp(app.id, i, e.target.value || undefined)}
                    aria-label={`Follow-up date for ${c.name}`}
                    className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-700 focus:border-emerald-600 focus:outline-none"
                  />
                </label>
              </div>
            </div>
            <button
              onClick={() => removeContact(app.id, i)}
              className="shrink-0 rounded px-1.5 text-sm leading-none text-zinc-300 hover:bg-zinc-200 hover:text-rose-600"
              aria-label={`Remove contact ${c.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Zoho HR)"
          aria-label="Contact name"
        />
        <input
          className={inputCls}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Detail (e.g. sent interview link)"
          aria-label="Contact detail"
        />
        <button
          onClick={add}
          disabled={!name.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/** Saved links & documents: portfolio, offer letter PDF, OA platform, take-home repo… */
function Attachments({ app }: { app: Application }) {
  const { addAttachment, removeAttachment } = useStore();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const add = () => {
    if (!label.trim() || !url.trim()) return;
    addAttachment(app.id, label.trim(), url.trim());
    setLabel("");
    setUrl("");
  };

  return (
    <div>
      {(app.attachments ?? []).length === 0 && (
        <p className="text-sm text-zinc-400">
          No links saved yet — keep the portfolio, offer letter PDF or OA platform link here.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {(app.attachments ?? []).map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
            <div className="min-w-0">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-emerald-700 hover:underline"
                title={a.url}
              >
                {a.label} ↗
              </a>
              <div className="truncate text-xs text-zinc-400">{a.url}</div>
            </div>
            <button
              onClick={() => removeAttachment(app.id, a.id)}
              className="shrink-0 rounded px-1.5 text-sm leading-none text-zinc-300 hover:bg-zinc-200 hover:text-rose-600"
              aria-label={`Remove link ${a.label}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className={inputCls}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Offer letter PDF)"
          aria-label="Attachment label"
        />
        <input
          className={inputCls}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          aria-label="Attachment URL"
        />
        <button
          onClick={add}
          disabled={!label.trim() || !url.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/**
 * Countdown label for an interview round's "at" time, e.g. "in 45 min",
 * "Today at 2:30 PM", "Tomorrow at 10:00 AM", "in 5 days", "Passed".
 * `nowMs` must come from a client-only clock (never during prerender).
 */
function roundCountdown(at: string, nowMs: number | null): string | null {
  if (nowMs === null) return null;
  const target = new Date(at).getTime();
  if (isNaN(target)) return null;
  const mins = Math.round((target - nowMs) / 60000);
  if (mins < 0) return "Passed";
  if (mins < 60) return mins <= 1 ? "Starting now" : `in ${mins} min`;
  const t = new Date(target);
  const n = new Date(nowMs);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  let h = t.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const time = `${h}:${String(t.getMinutes()).padStart(2, "0")} ${ampm}`;
  if (sameDay(t, n)) return `Today at ${time}`;
  const tomorrow = new Date(n);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(t, tomorrow)) return `Tomorrow at ${time}`;
  const days = Math.floor((target - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000);
  return days <= 1 ? `Tomorrow at ${time}` : `in ${days} days`;
}

/** Scheduled interview rounds: add / edit / delete with date-time, interviewer, meeting link. */
function Rounds({ app }: { app: Application }) {
  const { data, addInterviewRound, updateInterviewRound, deleteInterviewRound } = useStore();
  // Client-only clock: Next 16 prerender must never read the current time.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  const [label, setLabel] = useState("");
  const [at, setAt] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [debriefId, setDebriefId] = useState<string | null>(null);
  const [dRating, setDRating] = useState(0);
  const [dWentWell, setDWentWell] = useState("");
  const [dImprove, setDImprove] = useState("");

  const startDebrief = (r: InterviewRound) => {
    setDebriefId(r.id);
    setDRating(r.debrief?.rating ?? 0);
    setDWentWell(r.debrief?.wentWell ?? "");
    setDImprove(r.debrief?.improve ?? "");
  };

  const saveDebrief = (r: InterviewRound) => {
    if (dRating === 0) return;
    updateInterviewRound(app.id, r.id, {
      debrief: {
        rating: dRating,
        wentWell: dWentWell.trim() || undefined,
        improve: dImprove.trim() || undefined,
      },
    });
    setDebriefId(null);
  };

  const rounds = useMemo(
    () =>
      [...(app.interviews ?? [])].sort((a, b) =>
        (a.at ?? "9999").localeCompare(b.at ?? "9999")
      ),
    [app.interviews]
  );

  /** Scheduling clash check: other scheduled rounds (across ALL applications)
   *  within 90 minutes of the picked time. Pure value math on the stored
   *  local-datetime strings — no clock reads, prerender-safe. Warning only. */
  const clashes = useMemo(() => {
    if (!at) return [];
    const target = new Date(at).getTime();
    if (Number.isNaN(target)) return [];
    const hits: { company: string; role: string; label: string; at: string }[] = [];
    for (const a of data.applications) {
      for (const r of a.interviews ?? []) {
        if (!r.at) continue;
        if (a.id === app.id && r.id === editingId) continue;
        const t = new Date(r.at).getTime();
        if (Number.isNaN(t)) continue;
        if (Math.abs(t - target) < 90 * 60 * 1000) {
          hits.push({ company: a.company, role: a.role, label: r.label, at: r.at });
        }
      }
    }
    return hits.sort((x, y) => x.at.localeCompare(y.at)).slice(0, 3);
  }, [at, data.applications, app.id, editingId]);

  const reset = () => {
    setLabel(""); setAt(""); setInterviewer(""); setLink(""); setNotes("");
    setEditingId(null);
  };

  const startEdit = (r: InterviewRound) => {
    setLabel(r.label); setAt(r.at ?? ""); setInterviewer(r.interviewer ?? "");
    setLink(r.link ?? ""); setNotes(r.notes ?? "");
    setEditingId(r.id);
  };

  const save = () => {
    if (!label.trim()) return;
    const input = {
      label: label.trim(),
      at: at || undefined,
      interviewer: interviewer.trim() || undefined,
      link: link.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (editingId) updateInterviewRound(app.id, editingId, input);
    else addInterviewRound(app.id, input);
    reset();
  };

  const form = (
    <div className="grid grid-cols-1 gap-2">
      <input
        className={inputCls}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Round name (e.g. Round 1 — DSA)"
        aria-label="Round name"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          aria-label="Round date and time"
        />
        <input
          className={inputCls}
          value={interviewer}
          onChange={(e) => setInterviewer(e.target.value)}
          placeholder="Interviewer (optional)"
          aria-label="Interviewer"
        />
      </div>
      <input
        className={inputCls}
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Meeting link (optional)"
        aria-label="Meeting link"
      />
      <input
        className={inputCls}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        aria-label="Round notes"
      />
      {clashes.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm" role="alert">
          <p className="font-semibold text-amber-800">⚠ Possible schedule clash</p>
          <ul className="mt-1 space-y-0.5 text-amber-700">
            {clashes.map((c) => (
              <li key={`${c.company}-${c.label}-${c.at}`}>
                <span className="font-medium">{c.label}</span> — {c.company} · {c.role}
                {formatDateTime(c.at) && <span> · {formatDateTime(c.at)}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-amber-600">
            Another round is within 90 minutes of this time. You can still save — just double-check.
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!label.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
        >
          {editingId ? "Save round" : "Add round"}
        </button>
        {editingId && (
          <button
            onClick={reset}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {rounds.length === 0 && !editingId && (
        <p className="mb-3 text-sm text-zinc-400">
          No rounds scheduled yet — add the technical, HR or take-home rounds here.
        </p>
      )}
      {rounds.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {rounds.map((r) => (
            <li key={r.id} className="rounded-lg bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900">{r.label}</div>
                  {r.at && formatDateTime(r.at) && (
                    <div className="mt-0.5 text-xs font-medium text-emerald-700">{formatDateTime(r.at)}</div>
                  )}
                  {r.at && roundCountdown(r.at, nowMs) && (
                    <div className="mt-1">
                      <span className={cx(
                        "inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                        roundCountdown(r.at, nowMs) === "Passed"
                          ? "bg-zinc-100 text-zinc-500"
                          : "bg-sky-100 text-sky-800"
                      )}>
                        {roundCountdown(r.at, nowMs)}
                      </span>
                    </div>
                  )}
                  {r.interviewer && (
                    <div className="mt-0.5 text-xs text-zinc-500">with {r.interviewer}</div>
                  )}
                  {r.notes && <div className="mt-1 text-xs text-zinc-500">{r.notes}</div>}
                  {r.debrief && debriefId !== r.id && (
                    <div className="mt-1.5 rounded-md bg-emerald-50/70 px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-emerald-800">Debrief</span>
                        <InterestStars value={r.debrief.rating} small />
                      </div>
                      {r.debrief.wentWell && (
                        <div className="mt-0.5 text-xs text-zinc-600">
                          <span className="font-medium">Went well:</span> {r.debrief.wentWell}
                        </div>
                      )}
                      {r.debrief.improve && (
                        <div className="mt-0.5 text-xs text-zinc-600">
                          <span className="font-medium">Improve:</span> {r.debrief.improve}
                        </div>
                      )}
                    </div>
                  )}
                  {debriefId === r.id ? (
                    <div className="mt-1.5 rounded-md border border-zinc-200 bg-white px-2 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-zinc-600">How&apos;d it go?</span>
                        <InterestStars value={dRating} onChange={setDRating} small />
                      </div>
                      <input
                        className={cx(inputCls, "mt-1.5 !py-1.5 !text-xs")}
                        value={dWentWell}
                        onChange={(e) => setDWentWell(e.target.value)}
                        placeholder="What went well"
                        aria-label="What went well"
                      />
                      <input
                        className={cx(inputCls, "mt-1.5 !py-1.5 !text-xs")}
                        value={dImprove}
                        onChange={(e) => setDImprove(e.target.value)}
                        placeholder="What to improve next time"
                        aria-label="What to improve next time"
                      />
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          onClick={() => saveDebrief(r)}
                          disabled={dRating === 0}
                          className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
                        >
                          Save debrief
                        </button>
                        <button
                          onClick={() => setDebriefId(null)}
                          className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    r.at !== undefined && roundCountdown(r.at, nowMs) === "Passed" && (
                      <button
                        onClick={() => startDebrief(r)}
                        className="mt-1.5 text-xs font-medium text-emerald-700 hover:underline"
                      >
                        {r.debrief ? "Edit debrief" : "Add debrief ✍"}
                      </button>
                    )
                  )}
                  {r.link && (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline"
                    >
                      Join meeting ↗
                    </a>
                  )}
                  {r.at && (
                    <button
                      onClick={() => downloadRoundIcs(app, r)}
                      className="mt-1 ml-3 inline-block text-xs font-medium text-zinc-500 hover:text-emerald-700 hover:underline"
                      title="Download a .ics file for this round"
                    >
                      Add to calendar (.ics)
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(r)}
                    className="rounded px-1.5 text-sm leading-none text-zinc-300 hover:bg-zinc-200 hover:text-zinc-700"
                    aria-label={`Edit round ${r.label}`}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteInterviewRound(app.id, r.id)}
                    className="rounded px-1.5 text-sm leading-none text-zinc-300 hover:bg-zinc-200 hover:text-rose-600"
                    aria-label={`Delete round ${r.label}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {form}
    </div>
  );
}

/** JD match (researched: Huntr's 4-dimension match score — qualifications,
 *  responsibilities, keywords, job title): paste the JD's keywords/skills and
 *  get a match score against what you've recorded (notes, tags, company
 *  research, prep items). Honest about where the gaps are. */
function JdMatch({ app }: { app: Application }) {
  const { data, updateApplication } = useStore();
  const [text, setText] = useState(app.jdKeywords ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = text !== (app.jdKeywords ?? "");

  const keywords = useMemo(() => parseKeywords(text), [text]);
  const { matched, missing } = useMemo(() => {
    const note = data.companyNotes.find(
      (n) => n.company.toLowerCase() === app.company.toLowerCase()
    );
    const corpus = [
      app.notes ?? "",
      app.tags.join(" "),
      note?.about ?? "",
      note?.process ?? "",
      note?.questions.join(" ") ?? "",
      ...data.prepItems.filter((p) => p.applicationId === app.id).map((p) => p.label),
    ].join("\n");
    return scoreKeywords(keywords, corpus);
  }, [keywords, app, data.companyNotes, data.prepItems]);

  const score = keywords.length === 0 ? null : Math.round((matched.length / keywords.length) * 100);
  const tone =
    score === null ? "" : score >= 70 ? "text-emerald-700" : score >= 40 ? "text-amber-700" : "text-rose-600";

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder={"Paste JD keywords, one per line or comma-separated\n— e.g. React, TypeScript, REST APIs, system design"}
        aria-label="Job description keywords"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      />
      {dirty && (
        <div className="mt-2">
          <button
            onClick={() => {
              updateApplication(app.id, { jdKeywords: text.trim() || undefined });
              setSaved(true);
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Save keywords
          </button>
        </div>
      )}
      {!dirty && saved && <p className="mt-2 text-xs text-emerald-700">Saved.</p>}
      {score !== null && (
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className={cx("text-2xl font-semibold tracking-tight", tone)}>{score}%</span>
            <span className="text-xs text-zinc-500">
              {matched.length} of {keywords.length} keywords appear in your notes, tags, research or prep
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Keyword match results">
            {matched.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700" title="Covered">
                <span aria-hidden="true">✓</span> {k}
              </span>
            ))}
            {missing.map((k) => (
              <span key={k} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500" title="Not covered yet">
                {k}
              </span>
            ))}
          </div>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-zinc-400">
              Grey keywords are gaps — add evidence to your notes or prep checklist to close them.
            </p>
          )}
        </div>
      )}
      {score === null && (
        <p className="mt-2 text-xs text-zinc-400">
          The match score checks your JD keywords against everything you&apos;ve recorded for this application.
        </p>
      )}
      <details className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          Extract keywords from the full job posting
        </summary>
        <JdKeywordExtractor
          onAdd={(picked) => {
            const current = parseKeywords(text);
            const have = new Set(current.map((k) => k.toLowerCase()));
            const merged = [...current, ...picked.filter((p) => !have.has(p.toLowerCase()))];
            setText(merged.join("\n"));
            setSaved(false);
          }}
        />
      </details>
    </div>
  );
}

/** Paste the raw JD → pull out candidate keywords (researched: Huntr "pulls
 *  keywords out of the JD"). Check the ones you want, add them to the list. */
function JdKeywordExtractor({ onAdd }: { onAdd: (keywords: string[]) => void }) {
  const [jdText, setJdText] = useState("");
  const [suggestions, setSuggestions] = useState<{ keyword: string; count: number }[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [ran, setRan] = useState(false);

  const extract = () => {
    const out = extractJdKeywords(jdText);
    setSuggestions(out);
    setPicked(new Set(out.map((s) => s.keyword.toLowerCase())));
    setRan(true);
  };

  const toggle = (kw: string) => {
    const key = kw.toLowerCase();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="mt-2">
      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        rows={5}
        placeholder="Paste the full job posting text here…"
        aria-label="Full job posting text"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={extract}
          disabled={!jdText.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          Extract keywords
        </button>
        {ran && (
          <span className="text-xs text-zinc-500">
            {suggestions.length === 0
              ? "Nothing extracted — the posting may be too short."
              : `${suggestions.length} candidates found`}
          </span>
        )}
      </div>
      {suggestions.length > 0 && (
        <div>
          <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Extracted keyword candidates">
            {suggestions.map((s) => {
              const on = picked.has(s.keyword.toLowerCase());
              return (
                <button
                  key={s.keyword}
                  type="button"
                  onClick={() => toggle(s.keyword)}
                  aria-pressed={on}
                  title={`${s.count} mention${s.count === 1 ? "" : "s"} in the posting`}
                  className={cx(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    on
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-zinc-500 ring-1 ring-inset ring-zinc-200 hover:ring-zinc-300"
                  )}
                >
                  {s.keyword} <span className={on ? "text-emerald-200" : "text-zinc-400"}>×{s.count}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              onAdd(suggestions.map((s) => s.keyword).filter((k) => picked.has(k.toLowerCase())));
              announce("Extracted keywords added to the JD match list");
            }}
            disabled={picked.size === 0}
            className="mt-2.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Add {picked.size} to keyword list
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Four-axis self-assessed fit score (researched: Huntr grades four ways —
 * Qualifications weighted highest, then Responsibilities, Keywords, Job
 * Title — which tells you WHERE the gap is, not just that there is one).
 * Honest sliders; a Weak score is a cue to close the gap before applying.
 */
function FitScoreCard({ app }: { app: Application }) {
  const { updateApplication } = useStore();
  const saved = app.fitScore;
  const [vals, setVals] = useState<FitScore>(
    saved ?? { qualifications: 50, responsibilities: 50, keywords: 50, title: 50 }
  );
  const dirty = JSON.stringify(vals) !== JSON.stringify(saved ?? vals);

  const total = fitScoreTotal(vals);
  const tone =
    total >= 70 ? "text-emerald-700" : total >= 50 ? "text-amber-700" : "text-rose-600";
  const label =
    total >= 70 ? "Strong" : total >= 50 ? "Fair — one gap to close" : "Weak — gap worth closing first";

  const axes = [
    { key: "qualifications", label: "Qualifications", weight: "40%" },
    { key: "responsibilities", label: "Responsibilities", weight: "30%" },
    { key: "keywords", label: "Keywords", weight: "20%" },
    { key: "title", label: "Job title", weight: "10%" },
  ] as const;

  return (
    <div>
      {axes.map((a) => (
        <div key={a.key} className="mb-3 last:mb-0">
          <div className="flex items-baseline justify-between">
            <label htmlFor={`fit-${a.key}`} className="text-sm text-zinc-700">
              {a.label} <span className="text-xs text-zinc-400">({a.weight})</span>
            </label>
            <span className="text-sm font-semibold text-zinc-900">{vals[a.key]}</span>
          </div>
          <input
            id={`fit-${a.key}`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={vals[a.key]}
            onChange={(e) => setVals({ ...vals, [a.key]: parseInt(e.target.value, 10) })}
            className="mt-1 w-full accent-emerald-600"
          />
        </div>
      ))}
      <div className="mt-3 flex items-baseline gap-2 border-t border-zinc-100 pt-3">
        <span className={cx("text-2xl font-semibold tracking-tight", tone)}>{total}</span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      {dirty && (
        <div className="mt-2">
          <button
            onClick={() => updateApplication(app.id, { fitScore: vals })}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Save fit score
          </button>
        </div>
      )}
      {!dirty && saved && (
        <p className="mt-2 text-xs text-zinc-400">
          Weighted by the Huntr pattern — qualifications count most. Re-score as you learn more.
        </p>
      )}
    </div>
  );
}

function Timeline({ app }: { app: Application }) {  const events = [...app.stageHistory].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <ol className="relative ml-1 border-l border-zinc-200 pl-4">
      {events.map((e, i) => (
        <li key={i} className="pb-4 last:pb-0">
          <span className={cx("absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full", STAGE_META[e.stage].dot)} />
          <div className="text-sm font-medium text-zinc-900">{STAGE_META[e.stage].label}</div>
          <div className="text-xs text-zinc-500">{timeAgo(e.at)}</div>
        </li>
      ))}
    </ol>
  );
}

/** One-click stage logging (Huntr pattern): contextual buttons to log the next
 *  real-world event — applied, got an assessment/interview/offer, got rejected —
 *  without opening the stage dropdown. Uses moveApplication, so stage history
 *  and the activity feed stay in sync. */
/** "Record health" (Huntr/Teal pattern: complete records convert better): a quick
 *  completeness checklist for this application — the gaps that quietly cost
 *  interviews. Deadline/follow-up only count on active stages. */
function RecordHealth({ app }: { app: Application }) {
  const { data } = useStore();
  const active = ["applied", "assessment", "interview"].includes(app.stage);
  const hasNote = data.companyNotes.some(
    (n) => n.company.trim().toLowerCase() === app.company.trim().toLowerCase()
  );
  const items = [
    { label: "Deadline set", done: !!app.deadline, hint: "edit in Details", show: active },
    { label: "Recruiter / contact added", done: app.contacts.length > 0, hint: "in Contacts below", show: true },
    { label: "Resume version linked", done: !!app.resumeId, hint: "edit in Details", show: true },
    { label: "Follow-up scheduled", done: !!(app.nextAction && app.nextActionDate), hint: "edit in Details", show: active },
    { label: "JD keywords captured", done: !!(app.jdKeywords && app.jdKeywords.trim()), hint: "paste in JD match", show: true },
    { label: "Company research note", done: hasNote, hint: "write on the Companies page", show: true },
  ].filter((i) => i.show);
  const done = items.filter((i) => i.done).length;
  const pct = items.length === 0 ? 100 : Math.round((done / items.length) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-zinc-900">
          {done} of {items.length} complete
        </span>
        <span className="text-xs text-zinc-500">{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cx("h-full rounded-full", pct === 100 ? "bg-emerald-600" : "bg-amber-500")}
          style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-start gap-2.5 text-sm">
            <span
              className={cx(
                "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                i.done
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-300 text-transparent"
              )}
              aria-hidden="true"
            >
              ✓
            </span>
            <span className={i.done ? "text-zinc-400 line-through" : "text-zinc-700"}>
              {i.label}
              {!i.done && <span className="text-zinc-400"> — {i.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickLog({ app }: { app: Application }) {  const { moveApplication } = useStore();

  const actions: { stage: Stage; label: string; primary?: boolean }[] = (() => {
    switch (app.stage) {
      case "wishlist":
        return [{ stage: "applied" as Stage, label: "Log applied", primary: true }];
      case "applied":
        return [
          { stage: "assessment" as Stage, label: "Log assessment", primary: true },
          { stage: "interview" as Stage, label: "Log interview" },
        ];
      case "assessment":
        return [{ stage: "interview" as Stage, label: "Log interview", primary: true }];
      case "interview":
        return [
          { stage: "offer" as Stage, label: "Log offer", primary: true },
          { stage: "rejected" as Stage, label: "Log rejection" },
        ];
      case "offer":
        return [{ stage: "rejected" as Stage, label: "Log rejection (offer lost)" }];
      case "rejected":
        // Rejected apps use the dedicated ↻ Re-apply button (fresh record, history preserved).
        return [];
    }
  })();

  if (actions.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Quick stage actions">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Quick log</span>
      {actions.map((a) => (
        <button
          key={a.stage}
          onClick={() => {
            moveApplication(app.id, a.stage);
            announce(`${app.company} moved to ${STAGE_META[a.stage].label}`);
          }}
          className={cx(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            a.primary
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          )}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function ApplicationDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loaded, moveApplication, reapplyApplication, duplicateApplication, deleteApplication, setOutcome } = useStore();
  const app = data.applications.find((a) => a.id === params.id);
  const [confirming, setConfirming] = useState(false);

  const activity = useMemo(
    () => data.activity.filter((e) => e.applicationId === params.id).slice(0, 8),
    [data.activity, params.id]
  );

  if (!loaded) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-1/3 rounded bg-zinc-100" /><div className="h-64 rounded-xl bg-zinc-100" /></div>;
  }

  if (!app) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Application not found</h1>
        <p className="mt-1 text-sm text-zinc-500">It may have been deleted.</p>
        <Link href="/pipeline" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Back to pipeline
        </Link>
      </div>
    );
  }

  const overdue = app.deadline ? isOverdue(app.deadline) : false;

  return (
    <div>
      <Link href="/pipeline" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Pipeline</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{app.company}</h1>
          <p className="mt-1 text-sm text-zinc-500">{app.role}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
              <span className={cx("h-2 w-2 rounded-full", STAGE_META[app.stage].dot)} />
              {STAGE_META[app.stage].label}
            </span>
            {app.deadline && (
              <span
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  overdue ? "bg-rose-100 text-rose-700" : "bg-amber-50 text-amber-700"
                )}
              >
                Deadline {formatDeadline(app.deadline)} · {deadlineLabel(app.deadline)}
              </span>
            )}
            {app.postedAt && (
              <ApplyLagChip app={app} />
            )}
            {app.fitScore && (
              <span
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  fitScoreTotal(app.fitScore) >= 70
                    ? "bg-emerald-50 text-emerald-700"
                    : fitScoreTotal(app.fitScore) >= 50
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                )}
                title="Self-assessed fit score (Qualifications 40% · Responsibilities 30% · Keywords 20% · Job title 10%)"
              >
                Fit {fitScoreTotal(app.fitScore)}
              </span>
            )}
            {app.ctc && (
              <span
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700"
                title={parseCtcMonthly(app.ctc) ? `≈ ${formatMonthly(parseCtcMonthly(app.ctc)!)}` : undefined}
              >
                {app.ctc}
                {parseCtcMonthly(app.ctc) !== null && (
                  <span className="font-normal text-zinc-500"> · {formatMonthly(parseCtcMonthly(app.ctc)!)}</span>
                )}
              </span>
            )}
            {app.deadline && (
              <button
                onClick={() => downloadIcs(app)}
                aria-label={`Add ${app.company} deadline to calendar`}
                title="Add to calendar (.ics)"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-300 hover:text-emerald-700"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M4 6h12v10H4zM4 9h12M7 3v4M13 3v4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add to calendar
              </button>
            )}
            {app.tags.map((t) => (
              <span key={t} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{t}</span>
            ))}
            {app.interest !== undefined && app.interest > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1">
                <InterestStars value={app.interest} />
              </span>
            )}
            {app.referredBy && (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700" title="Referrer">
                🤝 {app.referredBy}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {app.stage === "rejected" && (
            <button
              onClick={() => {
                const newId = reapplyApplication(app.id);
                if (newId) router.push(`/applications/${newId}`);
              }}
              title="Create a fresh wishlist application from this one"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              ↻ Re-apply
            </button>
          )}
          <Link
            href={`/applications/${app.id}/onepager`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
            title="Printable interview one-pager"
          >
            One-pager
          </Link>
          <button
            onClick={() => {
              const newId = duplicateApplication(app.id);
              if (newId) router.push(`/applications/${newId}`);
            }}
            title="Clone this application as a fresh wishlist record (same company, role, contacts)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
          >
            Duplicate
          </button>
          <label className="flex items-center gap-2">
            <span className="sr-only">Move to stage</span>
            <select
              value={app.stage}
              onChange={(e) => moveApplication(app.id, e.target.value as Stage)}
              className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 focus:border-emerald-600 focus:outline-none"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s === app.stage ? `● ${STAGE_META[s].label}` : `Move to ${STAGE_META[s].label}`}
                </option>
              ))}
            </select>
          </label>
          {confirming ? (
            <span className="flex items-center gap-1.5">
              <Link
                href="/pipeline"
                onClick={() => deleteApplication(app.id)}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Yes, delete
              </Link>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-rose-50 hover:text-rose-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <QuickLog app={app} />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Details">
            <DetailsForm key={app.updatedAt} app={app} />
          </Card>
          <Card title="JD match">
            <JdMatch key={`jd-${app.id}-${app.updatedAt}`} app={app} />
          </Card>
          <Card title="Fit score">
            <FitScoreCard key={`fit-${app.id}-${app.updatedAt}`} app={app} />
          </Card>
          <Card title="Contacts">
            <Contacts app={app} />
          </Card>
          {app.link && (
            <Card title="Job posting">
              <a
                href={app.link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-medium text-emerald-700 hover:underline"
              >
                {app.link}
              </a>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Record health">
            <RecordHealth app={app} />
          </Card>
          <Card title="Stage timeline">
            <Timeline app={app} />
          </Card>
          <Card title="Interview rounds">
            <Rounds app={app} />
          </Card>
          {(app.stage === "assessment" || app.stage === "interview" || (app.assessments?.length ?? 0) > 0) && (
            <Card title="Assessments">
              <AssessmentLog app={app} />
            </Card>
          )}
          <Card title="Links & documents">
            <Attachments app={app} />
          </Card>
          {app.stage === "offer" && (
            <Card title="Comp breakdown">
              <CompBreakdownEditor app={app} />
            </Card>
          )}
          {app.stage === "offer" && (
            <Card title="Negotiation prep">
              <NegotiationPrep app={app} />
            </Card>
          )}
          {app.stage === "offer" && (
            <Card title="Offer decision">
              <div
                className="flex gap-1 rounded-lg bg-zinc-100 p-1"
                role="group"
                aria-label="Offer decision"
              >
                {(["waiting", "accepted", "declined"] as OfferOutcome[]).map((o) => {
                  const active = (app.outcome ?? "waiting") === o;
                  return (
                    <button
                      key={o}
                      onClick={() => {
                        setOutcome(app.id, o);
                        announce(
                          o === "accepted"
                            ? `Offer from ${app.company} marked accepted`
                            : o === "declined"
                              ? `Offer from ${app.company} marked declined`
                              : `Offer from ${app.company} marked waiting`
                        );
                      }}
                      aria-pressed={active}
                      className={cx(
                        "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      {o === "waiting" ? "Waiting" : o === "accepted" ? "Accepted" : "Declined"}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Current decision</span>
                <OutcomeChip outcome={app.outcome} />
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Accepting or declining records it in the activity feed.
              </p>
            </Card>
          )}
          <Card title="Activity">
            {activity.length === 0 ? (
              <p className="text-sm text-zinc-400">No activity recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {activity.map((e) => (
                  <li key={e.id}>
                    <div className="text-sm text-zinc-700">{e.text}</div>
                    <div className="text-xs text-zinc-400">{timeAgo(e.at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
