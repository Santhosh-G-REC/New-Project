"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddApplicationModal } from "../../components/AddApplicationModal";
import { useStore } from "../../lib/store";
import { STAGE_META, STAGES, type AppSortKey, type SavedView, type Stage } from "../../lib/types";
import { cx, deadlineLabel, formatDeadline, isOverdue } from "../../lib/utils";
import { announce } from "../../lib/announce";

const SORTS: { key: AppSortKey; label: string }[] = [
  { key: "deadline", label: "Deadline (soonest)" },
  { key: "updated", label: "Recently updated" },
  { key: "added", label: "Recently added" },
  { key: "company", label: "Company A–Z" },
];

export default function Applications() {
  const { data, loaded, moveApplication, deleteApplication, addSavedView, deleteSavedView } = useStore();
  const [query, setQuery] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [tag, setTag] = useState<string | null>(null);
  const [referredOnly, setReferredOnly] = useState(false);
  const [loop, setLoop] = useState<string | null>(null);
  const [sort, setSort] = useState<AppSortKey>("deadline");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [savingView, setSavingView] = useState(false);
  const [viewName, setViewName] = useState("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of data.applications) for (const t of a.tags) set.add(t);
    return [...set].sort((x, y) => x.localeCompare(y));
  }, [data.applications]);

  const allLoops = useMemo(() => {
    const set = new Set<string>();
    for (const a of data.applications) if (a.loop?.trim()) set.add(a.loop.trim());
    return [...set].sort((x, y) => x.localeCompare(y));
  }, [data.applications]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.applications.filter((a) => {
      if (q && ![a.company, a.role, a.location ?? "", a.notes ?? ""].some((f) => f.toLowerCase().includes(q)))
        return false;
      if (stages.length > 0 && !stages.includes(a.stage)) return false;
      if (tag && !a.tags.includes(tag)) return false;
      if (referredOnly && !a.referredBy?.trim()) return false;
      if (loop && a.loop !== loop) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "deadline":
          return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
        case "updated":
          return b.updatedAt.localeCompare(a.updatedAt);
        case "added":
          return b.createdAt.localeCompare(a.createdAt);
        case "company":
          return a.company.localeCompare(b.company);
      }
    });
    return list;
  }, [data.applications, query, stages, tag, referredOnly, loop, sort]);

  const toggleStage = (s: Stage) =>
    setStages((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const hasFilters = query.trim() !== "" || stages.length > 0 || tag !== null || referredOnly || loop !== null;

  const resultIds = useMemo(() => results.map((a) => a.id), [results]);
  const allSelected = resultIds.length > 0 && resultIds.every((id) => selected.includes(id));

  const toggleOne = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleAll = () =>
    setSelected((cur) => (allSelected ? cur.filter((id) => !resultIds.includes(id)) : [...new Set([...cur, ...resultIds])]));
  const clearSelection = () => {
    setSelected([]);
    setConfirmingBulkDelete(false);
  };
  const applyView = (v: SavedView) => {
    setQuery(v.query);
    setStages(v.stages);
    setTag(v.tag);
    setReferredOnly(v.referredOnly);
    setLoop(v.loop);
    setSort(v.sort);
    setSavingView(false);
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    addSavedView(name, {
      query: query.trim(),
      stages,
      tag,
      referredOnly,
      loop,
      sort,
    });
    announce(`View "${name}" saved`);
    setViewName("");
    setSavingView(false);
  };

  /** The saved view (if any) whose filters match the current controls. */
  const matchingView = useMemo(() => {
    if (!hasFilters) return null;
    return (
      data.savedViews.find(
        (v) =>
          v.query === query.trim() &&
          v.stages.length === stages.length &&
          v.stages.every((s) => stages.includes(s)) &&
          v.tag === tag &&
          v.referredOnly === referredOnly &&
          v.loop === loop &&
          v.sort === sort
      ) ?? null
    );
  }, [data.savedViews, query, stages, tag, referredOnly, loop, sort, hasFilters]);

  const clearFilters = () => {
    setQuery("");
    setStages([]);
    setTag(null);
    setReferredOnly(false);
    setLoop(null);
  };

  const bulkMove = (stage: Stage) => {
    for (const id of selected) moveApplication(id, stage);
    announce(`${selected.length} applications moved to ${STAGE_META[stage].label}`);
    clearSelection();
  };
  const bulkDelete = () => {
    const n = selected.length;
    for (const id of selected) deleteApplication(id);
    announce(`${n} application${n === 1 ? "" : "s"} deleted`);
    clearSelection();
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Applications</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loaded ? `${results.length} of ${data.applications.length} shown` : "Loading…"}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + New application
        </button>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="app-search"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role, location, notes…"
            aria-label="Search applications"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as AppSortKey)}
              className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm font-medium text-zinc-700 focus:border-emerald-600 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter by stage">
          {STAGES.map((s) => {
            const on = stages.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStage(s)}
                aria-pressed={on}
                className={cx(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                )}
              >
                <span className={cx("h-1.5 w-1.5 rounded-full", STAGE_META[s].dot)} />
                {STAGE_META[s].label}
              </button>
            );
          })}
          {allTags.length > 0 && <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden="true" />}
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag((cur) => (cur === t ? null : t))}
              aria-pressed={tag === t}
              className={cx(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                tag === t
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              )}
            >
              {t}
            </button>
          ))}
          {allLoops.length > 0 && <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden="true" />}
          {allLoops.map((l) => (
            <button
              key={l}
              onClick={() => setLoop((cur) => (cur === l ? null : l))}
              aria-pressed={loop === l}
              title="Filter by search loop"
              className={cx(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                loop === l
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              )}
            >
              ⟳ {l}
            </button>
          ))}
          <button
            onClick={() => setReferredOnly((cur) => !cur)}
            aria-pressed={referredOnly}
            title="Show only applications with a named referrer"
            className={cx(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              referredOnly
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            )}
          >
            🤝 Referred
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-full px-2 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-700"
            >
              Clear all ×
            </button>
          )}
        </div>
        {/* Saved views */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3" aria-label="Saved filter views">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Views
          </span>
          {data.savedViews.length === 0 && !hasFilters && (
            <span className="text-xs text-zinc-400">Set some filters, then save them as a view.</span>
          )}
          {data.savedViews.map((v) => {
            const on = matchingView?.id === v.id;
            return (
              <span
                key={v.id}
                className={cx(
                  "inline-flex items-center gap-0.5 rounded-full border py-0.5 pl-2.5 pr-1 text-xs font-medium transition-colors",
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                )}
              >
                <button onClick={() => applyView(v)} title="Apply this view" className="hover:underline">
                  {v.name}
                </button>
                <button
                  onClick={() => deleteSavedView(v.id)}
                  aria-label={`Delete view ${v.name}`}
                  className={cx(
                    "rounded-full px-1.5 text-sm leading-none",
                    on ? "text-zinc-300 hover:text-white" : "text-zinc-300 hover:text-rose-600"
                  )}
                >
                  ×
                </button>
              </span>
            );
          })}
          {hasFilters &&
            (savingView ? (
              <span className="inline-flex items-center gap-1.5">
                <input
                  autoFocus
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveView();
                    if (e.key === "Escape") {
                      setSavingView(false);
                      setViewName("");
                    }
                  }}
                  placeholder="View name…"
                  aria-label="Saved view name"
                  className="w-32 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none"
                />
                <button
                  onClick={saveView}
                  disabled={!viewName.trim()}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setSavingView(false);
                    setViewName("");
                  }}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-700"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setSavingView(true)}
                className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
              >
                + Save current
              </button>
            ))}
        </div>
      </div>

      {/* Results */}
      {!loaded ? (
        <div className="mt-4 animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">
            {hasFilters ? "No matches" : "No applications yet"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {hasFilters
              ? "Try loosening the search or clearing the filters."
              : "Add your first application to start tracking."}
          </p>
        </div>
      ) : (
        <>
          {/* Bulk action bar */}
          {selected.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
              <span className="text-sm font-semibold text-zinc-900">
                {selected.length} selected
              </span>
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Move selected to stage</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) bulkMove(e.target.value as Stage);
                    e.target.value = "";
                  }}
                  className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="" disabled>Move to…</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{STAGE_META[s].label}</option>
                  ))}
                </select>
              </label>
              {confirmingBulkDelete ? (
                <>
                  <button
                    onClick={bulkDelete}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Yes, delete {selected.length}
                  </button>
                  <button
                    onClick={() => setConfirmingBulkDelete(false)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmingBulkDelete(true)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              )}
              <button
                onClick={clearSelection}
                className="ml-auto text-xs font-medium text-zinc-400 hover:text-zinc-700"
              >
                Clear selection ×
              </button>
            </div>
          )}
          {/* Select-all row */}
          <div className="mt-4 flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="bulk-select-all"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
              aria-label={allSelected ? "Deselect all shown" : "Select all shown"}
            />
            <label htmlFor="bulk-select-all" className="text-xs font-medium text-zinc-500">
              {allSelected ? "Deselect all" : "Select all"}
            </label>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
          {results.map((a) => {
            const overdue = a.deadline ? isOverdue(a.deadline) : false;
            const checked = selected.includes(a.id);
            return (
              <li
                key={a.id}
                className={cx(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                  checked ? "border-emerald-400 bg-emerald-50/40" : "border-zinc-200 bg-white hover:border-zinc-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(a.id)}
                  className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-emerald-600"
                  aria-label={`Select ${a.company} (${a.role})`}
                />
                <Link
                  href={`/applications/${a.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2"
                >
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block truncate text-sm font-semibold text-zinc-900">{a.company}</span>
                    <span className="block truncate text-xs text-zinc-500">{a.role}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <span className={cx("h-2 w-2 rounded-full", STAGE_META[a.stage].dot)} />
                    {STAGE_META[a.stage].label}
                  </span>
                  {a.ctc && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
                      {a.ctc}
                    </span>
                  )}
                  {a.location && <span className="text-xs text-zinc-500">{a.location}</span>}
                  {a.tags.slice(0, 2).map((t) => (
                    <span key={t} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {t}
                    </span>
                  ))}
                  <span
                    className={cx(
                      "ml-auto text-xs font-semibold",
                      overdue ? "text-rose-600" : "text-zinc-500"
                    )}
                    title={a.deadline ? deadlineLabel(a.deadline) : undefined}
                  >
                    {a.deadline ? `${formatDeadline(a.deadline)} · ${deadlineLabel(a.deadline)}` : "No deadline"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        </>
      )}

      {modalOpen && <AddApplicationModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
