"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "../../lib/store";
import type { ResumeVersion } from "../../lib/types";
import { cx, timeAgo } from "../../lib/utils";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024; // keep the vault localStorage-friendly

function formatBytes(n: number): string {
  return n >= 1024 * 1024
    ? `${(n / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function readFileAsDataUrl(file: File): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => resolve({ dataUrl: String(reader.result), size: file.size });
    reader.readAsDataURL(file);
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function FileAttach({
  current,
  onAttach,
  onRemove,
}: {
  current: { fileName?: string; fileSize?: number } | null;
  onAttach: (file: { dataUrl: string; fileName: string; size: number }) => void;
  onRemove: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is ${formatBytes(file.size)} — keep it under 1.5 MB so the vault stays fast.`);
      return;
    }
    try {
      const { dataUrl, size } = await readFileAsDataUrl(file);
      onAttach({ dataUrl, fileName: file.name, size });
    } catch {
      setError("Couldn't read that file. Try another one.");
    }
  };

  return (
    <div>
      <label className={labelCls}>Attach file</label>
      {current?.fileName ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <span className="truncate text-sm text-zinc-700">
            {current.fileName}
            {typeof current.fileSize === "number" && (
              <span className="text-zinc-400"> · {formatBytes(current.fileSize)}</span>
            )}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-xs font-medium text-zinc-400 hover:text-rose-600"
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf"
          onChange={(e) => pick(e.target.files?.[0])}
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
        />
      )}
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function ResumeCard({ resume }: { resume: ResumeVersion }) {
  const { data, updateResume, deleteResume, setDefaultResume } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(resume.name);
  const [fileName, setFileName] = useState(resume.fileName ?? "");
  const [fileData, setFileData] = useState<string | undefined>(resume.fileData);
  const [fileSize, setFileSize] = useState<number | undefined>(resume.fileSize);
  const [notes, setNotes] = useState(resume.notes ?? "");
  const [confirming, setConfirming] = useState(false);

  const linked = data.applications.filter((a) => a.resumeId === resume.id);

  const save = () => {
    if (!name.trim()) return;
    updateResume(resume.id, {
      name: name.trim(),
      fileName: fileName.trim() || undefined,
      fileData,
      fileSize,
      notes: notes.trim() || undefined,
    });
    setEditing(false);
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-zinc-900">{resume.name}</h2>
            {resume.isDefault && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                Default
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {resume.fileName ? `${resume.fileName} · ` : ""}updated {timeAgo(resume.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {resume.fileData && (
            <button
              onClick={() => downloadDataUrl(resume.fileData!, resume.fileName ?? `${resume.name}.pdf`)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              title={typeof resume.fileSize === "number" ? `Download (${formatBytes(resume.fileSize)})` : "Download"}
            >
              ⬇ Download
            </button>
          )}
          {!resume.isDefault && (
            <button
              onClick={() => setDefaultResume(resume.id)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              title="Use this version by default"
            >
              Set default
            </button>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          {confirming ? (
            <span className="flex items-center gap-1">
              <button
                onClick={() => deleteResume(resume.id)}
                className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600"
              >
                No
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-rose-50 hover:text-rose-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>File name</label>
            <input className={inputCls} value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. rohan_resume_v4.pdf" />
          </div>
          <div className="sm:col-span-2">
            <FileAttach
              current={fileData ? { fileName, fileSize } : null}
              onAttach={({ dataUrl, fileName: f, size }) => {
                setFileData(dataUrl);
                setFileSize(size);
                if (!fileName.trim()) setFileName(f);
              }}
              onRemove={() => {
                setFileData(undefined);
                setFileSize(undefined);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's new in this version?" />
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={save}
              disabled={!name.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        resume.notes && <p className="mt-3 text-sm text-zinc-600">{resume.notes}</p>
      )}

      <div className="mt-4 border-t border-zinc-100 pt-3">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Used by {linked.length} application{linked.length === 1 ? "" : "s"}
        </div>
        {linked.length === 0 ? (
          <p className="mt-1.5 text-sm text-zinc-400">Not linked to any application yet.</p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {linked.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/applications/${a.id}`}
                  className="inline-block rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  {a.company} · {a.role}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function Resumes() {
  const { data, loaded, addResume } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    addResume({
      name: name.trim(),
      fileName: fileName.trim() || undefined,
      fileData,
      fileSize,
      notes: notes.trim() || undefined,
    });
    setName("");
    setFileName("");
    setFileData(undefined);
    setFileSize(undefined);
    setNotes("");
    setOpen(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Resume vault</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loaded ? `${data.resumes.length} versions · always know which one you sent where` : "Loading…"}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + New version
        </button>
      </div>

      {open && (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Add resume version</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Resume v4 — SDE focused" />
            </div>
            <div>
              <label className={labelCls}>File name</label>
              <input className={inputCls} value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. rohan_resume_v4.pdf" />
            </div>
            <div className="sm:col-span-2">
              <FileAttach
                current={fileData ? { fileName, fileSize } : null}
                onAttach={({ dataUrl, fileName: f, size }) => {
                  setFileData(dataUrl);
                  setFileSize(size);
                  if (!fileName.trim()) setFileName(f);
                }}
                onRemove={() => {
                  setFileData(undefined);
                  setFileSize(undefined);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's new in this version?" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Add to vault
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {!loaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-48 rounded-xl bg-zinc-100" />
        </div>
      ) : data.resumes.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">Vault is empty</h2>
          <p className="mt-1 text-sm text-zinc-500">Add your first resume version to start linking it to applications.</p>
        </div>
      ) : (
        <div className={cx("mt-6 flex flex-col gap-4", open && "mt-4")}>
          {data.resumes.map((r) => (
            <ResumeCard key={r.id} resume={r} />
          ))}
        </div>
      )}
    </div>
  );
}
