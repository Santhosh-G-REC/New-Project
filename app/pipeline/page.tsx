"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddApplicationModal } from "../../components/AddApplicationModal";
import { OutcomeChip } from "../../components/OutcomeChip";
import { useStore } from "../../lib/store";
import { STAGE_META, STAGES, type Application, type Stage } from "../../lib/types";
import { cx, deadlineLabel, formatDeadline, isOverdue } from "../../lib/utils";
import { InterestStars } from "../../components/InterestStars";

function AppCard({
  app,
  isDragging,
  onDragStart,
  onDragEnd,
  nowMs,
}: {
  app: Application;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  nowMs: number | null;
}) {
  const { moveApplication, deleteApplication } = useStore();
  const [confirming, setConfirming] = useState(false);
  const overdue = app.deadline ? isOverdue(app.deadline) : false;

  /** Days spent in the current stage, from the last stageHistory entry (client-only clock). */
  const stageDays = useMemo(() => {
    if (nowMs === null) return null;
    const last = app.stageHistory[app.stageHistory.length - 1];
    const at = last
      ? new Date(last.at).getTime()
      : new Date(app.updatedAt).getTime();
    return Math.max(0, Math.floor((nowMs - at) / 86400000));
  }, [app.stageHistory, app.updatedAt, nowMs]);
  const stuck =
    stageDays !== null &&
    stageDays > 14 &&
    ["applied", "assessment", "interview"].includes(app.stage);

  return (
    <div
      draggable
      aria-grabbed={isDragging}
      title="Drag to move between stages"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", app.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(app.id);
      }}
      onDragEnd={onDragEnd}
      className={cx(
        "cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/applications/${app.id}`}
            draggable={false}
            className="block truncate text-sm font-semibold text-zinc-900 hover:text-emerald-700"
          >
            {app.company}
          </Link>
          <div className="truncate text-xs text-zinc-500">{app.role}</div>
          {stageDays !== null && (
            <div
              className={cx(
                "mt-0.5 text-[11px]",
                stuck ? "font-semibold text-amber-700" : "text-zinc-400"
              )}
              title={
                stuck
                  ? "No stage movement in 2+ weeks — worth a nudge"
                  : `In ${STAGE_META[app.stage].label} for ${stageDays} day${stageDays === 1 ? "" : "s"}`
              }
            >
              In {STAGE_META[app.stage].label.toLowerCase()} · {stageDays}d
            </div>
          )}
        </div>
        {app.interest !== undefined && app.interest > 0 && (
          <span className="shrink-0 pt-0.5" title={`Interest: ${app.interest}/5`}>
            <InterestStars value={app.interest} small />
          </span>
        )}
        {confirming ? (
          <span className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => deleteApplication(app.id)}
              className="rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200"
            >
              No
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded px-1 text-sm leading-none text-zinc-300 hover:bg-zinc-100 hover:text-rose-600"
            aria-label={`Delete ${app.company} application`}
            title="Delete application"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {app.ctc && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
            {app.ctc}
          </span>
        )}
        {app.location && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
            {app.location}
          </span>
        )}
        {app.deadline && (
          <span
            className={cx(
              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
              overdue ? "bg-rose-100 text-rose-700" : "bg-amber-50 text-amber-700"
            )}
            title={deadlineLabel(app.deadline)}
          >
            {formatDeadline(app.deadline)}
          </span>
        )}
        {app.stage === "offer" && <OutcomeChip outcome={app.outcome} />}
        {app.tags.map((t) => (
          <span
            key={t}
            className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700"
          >
            {t}
          </span>
        ))}
      </div>

      <label className="mt-2.5 block">
        <span className="sr-only">Move {app.company} to stage</span>
        <select
          value={app.stage}
          onChange={(e) => moveApplication(app.id, e.target.value as Stage)}
          className="w-full cursor-pointer rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-600 focus:border-emerald-600 focus:outline-none"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s === app.stage ? `● ${STAGE_META[s].label}` : `Move to ${STAGE_META[s].label}`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Column({
  stage,
  apps,
  isDropTarget,
  onDragOverStage,
  onDropTo,
  draggedId,
  onCardDragStart,
  onCardDragEnd,
  nowMs,
}: {
  stage: Stage;
  apps: Application[];
  isDropTarget: boolean;
  onDragOverStage: (stage: Stage | null) => void;
  onDropTo: (stage: Stage) => void;
  draggedId: string | null;
  onCardDragStart: (id: string) => void;
  onCardDragEnd: () => void;
  nowMs: number | null;
}) {
  return (
    <section
      aria-label={STAGE_META[stage].label}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOverStage(stage);
      }}
      onDragLeave={() => onDragOverStage(null)}
      onDrop={(e) => {
        e.preventDefault();
        onDropTo(stage);
      }}
      className={cx(
        "flex w-64 shrink-0 flex-col rounded-xl bg-zinc-100/70 p-2.5 md:w-auto md:min-w-0",
        isDropTarget && "bg-emerald-50 ring-2 ring-inset ring-emerald-500"
      )}
    >
      <header className="flex items-center gap-2 px-1.5 pb-2">
        <span className={cx("h-2 w-2 rounded-full", STAGE_META[stage].dot)} />
        <h2 className="flex-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {STAGE_META[stage].label}
        </h2>
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
          {apps.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {apps.map((a) => (
          <AppCard
            key={a.id}
            app={a}
            isDragging={draggedId === a.id}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            nowMs={nowMs}
          />
        ))}
        {apps.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400">
            No applications
          </div>
        )}
      </div>
    </section>
  );
}

export default function Pipeline() {
  const { data, loaded, moveApplication } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Stage | null>(null);

  // Client-only clock (Next 16 prerender-safe — see dashboard's nowMs note).
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of data.applications) for (const t of a.tags) set.add(t);
    return [...set].sort((x, y) => x.localeCompare(y));
  }, [data.applications]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, [] as Application[]])) as Record<
      Stage,
      Application[]
    >;
    for (const a of data.applications) {
      if (tagFilter && !a.tags.includes(tagFilter)) continue;
      map[a.stage].push(a);
    }
    // Soonest deadline first within each column
    for (const s of STAGES) {
      map[s].sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
    }
    return map;
  }, [data.applications, tagFilter]);

  const handleDrop = (stage: Stage) => {
    if (draggedId) moveApplication(draggedId, stage);
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loaded ? `${data.applications.length} applications across ${STAGES.length} stages` : "Loading…"}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          + New application
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Filter by tag">
          <span className="text-xs font-medium text-zinc-500">Tags:</span>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
              aria-pressed={tagFilter === t}
              className={cx(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                tagFilter === t
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              )}
            >
              {t}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="rounded-full px-2 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-700"
            >
              Clear ×
            </button>
          )}
        </div>
      )}

      {!loaded ? (
        <div className="mt-6 grid animate-pulse grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible xl:grid-cols-6">
          {STAGES.map((s) => (
            <Column
              key={s}
              stage={s}
              apps={byStage[s]}
              isDropTarget={dropTarget === s}
              onDragOverStage={setDropTarget}
              onDropTo={handleDrop}
              draggedId={draggedId}
              onCardDragStart={setDraggedId}
              onCardDragEnd={handleDragEnd}
              nowMs={nowMs}
            />
          ))}
        </div>
      )}

      {modalOpen && <AddApplicationModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
