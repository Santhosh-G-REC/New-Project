"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { STAGE_META, STAGES, APPLICATION_SOURCES, type Stage, type WorkMode } from "../lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function AddApplicationModal({ onClose }: { onClose: () => void }) {
  const { addApplication, data } = useStore();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState<Stage>("wishlist");
  const [ctc, setCtc] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode | "">("");
  const [link, setLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [postedAt, setPostedAt] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [tailoredResume, setTailoredResume] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState("");
  const [loop, setLoop] = useState("");
  const [referredBy, setReferredBy] = useState("");

  /** Existing search loops for the datalist suggestions. */
  const existingLoops = useMemo(() => {
    const set = new Set<string>();
    for (const a of data.applications) if (a.loop) set.add(a.loop);
    return [...set].sort((x, y) => x.localeCompare(y));
  }, [data.applications]);
  const [error, setError] = useState("");
  const firstField = useRef<HTMLInputElement>(null);

  const norm = (s: string) => s.trim().toLowerCase();

  /** Exact company+role duplicates, and same-company-different-role siblings. */
  const { exactDupes, sameCompany } = useMemo(() => {
    const c = norm(company);
    const r = norm(role);
    if (!c || !r) return { exactDupes: [], sameCompany: [] };
    const exact = data.applications.filter((a) => norm(a.company) === c && norm(a.role) === r);
    const siblings = data.applications.filter((a) => norm(a.company) === c && norm(a.role) !== r);
    return { exactDupes: exact, sameCompany: siblings };
  }, [data.applications, company, role]);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required.");
      return;
    }
    addApplication({
      company: company.trim(),
      role: role.trim(),
      stage,
      ctc: ctc.trim() || undefined,
      location: location.trim() || undefined,
      workMode: workMode || undefined,
      link: link.trim() || undefined,
      deadline: deadline || undefined,
      postedAt: postedAt || undefined,
      resumeId: resumeId || undefined,
      tailoredResume: resumeId ? tailoredResume || undefined : undefined,
      notes: notes.trim() || undefined,
      source: source.trim() || undefined,
      loop: loop.trim() || undefined,
      referredBy: referredBy.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add application"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">New application</h2>
            <p className="mt-0.5 text-sm text-zinc-500">Track a company you&apos;re eyeing or already applied to.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        {exactDupes.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm">
            <p className="font-semibold text-amber-800">Heads up — possible duplicate</p>
            <p className="mt-1 text-amber-700">
              You already track {exactDupes.length === 1 ? "this" : "these"}:{" "}
              {exactDupes.slice(0, 3).map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <span className="font-medium">{a.role}</span> at{" "}
                  <span className="font-medium">{a.company}</span> ({STAGE_META[a.stage].label})
                </span>
              ))}
              {exactDupes.length > 3 && ` and ${exactDupes.length - 3} more`}. Submitting adds another entry.
            </p>
          </div>
        )}

        {exactDupes.length === 0 && sameCompany.length > 0 && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
            <p className="text-zinc-600">
              You already have {sameCompany.length} other{" "}
              {sameCompany.length === 1 ? "application" : "applications"} at{" "}
              <span className="font-medium text-zinc-800">{company.trim()}</span>:{" "}
              {sameCompany.slice(0, 3).map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <span className="font-medium text-zinc-800">{a.role}</span> ({STAGE_META[a.stage].label})
                </span>
              ))}
              {sameCompany.length > 3 && ` and ${sameCompany.length - 3} more`}.
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="f-company">Company *</label>
            <input
              id="f-company"
              ref={firstField}
              className={inputCls}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Zoho"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-role">Role *</label>
            <input
              id="f-role"
              className={inputCls}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. SDE Intern"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-stage">Stage</label>
            <select
              id="f-stage"
              className={inputCls}
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_META[s].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="f-deadline">Deadline</label>
            <input
              id="f-deadline"
              type="date"
              className={inputCls}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-posted">Job posted on</label>
            <input
              id="f-posted"
              type="date"
              className={inputCls}
              value={postedAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPostedAt(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-ctc">CTC / stipend</label>
            <input
              id="f-ctc"
              className={inputCls}
              value={ctc}
              onChange={(e) => setCtc(e.target.value)}
              placeholder="e.g. 8 LPA"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-location">Location</label>
            <input
              id="f-location"
              className={inputCls}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Chennai"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-mode">Work mode</label>
            <select
              id="f-mode"
              className={inputCls}
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value as WorkMode | "")}
            >
              <option value="">Not specified</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="f-resume">Resume version</label>
            <select
              id="f-resume"
              className={inputCls}
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
            >
              <option value="">None linked</option>
              {data.resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={tailoredResume}
                onChange={(e) => setTailoredResume(e.target.checked)}
                disabled={!resumeId}
                className="h-3.5 w-3.5 rounded accent-emerald-600"
              />
              <span className={resumeId ? "" : "text-zinc-400"}>
                Tailored this resume for this role{" "}
                <span className="text-zinc-400">(research: tailored resumes get ~35% more interviews)</span>
              </span>
            </label>
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="f-link">Application link</label>
            <input
              id="f-link"
              type="url"
              className={inputCls}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="f-tags">Tags</label>
            <input
              id="f-tags"
              className={inputCls}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="High Priority, Referral, Dream — comma separated"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="f-source">Applied via</label>
            <input
              id="f-source"
              list="f-source-suggestions"
              className={inputCls}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Internshala, Referral, T&P Cell"
            />
            <datalist id="f-source-suggestions">
              {APPLICATION_SOURCES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls} htmlFor="f-loop">Search loop</label>
            <input
              id="f-loop"
              list="f-loop-suggestions"
              className={inputCls}
              value={loop}
              onChange={(e) => setLoop(e.target.value)}
              placeholder="e.g. Summer SDE intern 2027"
            />
            <datalist id="f-loop-suggestions">
              {existingLoops.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls} htmlFor="f-referredby">Referred by</label>
            <input
              id="f-referredby"
              className={inputCls}
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              placeholder="e.g. Priya Sharma — LinkedIn"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="f-notes">Notes</label>
            <textarea
              id="f-notes"
              className={inputCls}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral source, what to prep, anything useful…"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Add application
          </button>
        </div>
      </form>
    </div>
  );
}
