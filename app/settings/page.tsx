"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "../../lib/store";
import { STAGES, type Stage, type StoreShape } from "../../lib/types";
import { cx } from "../../lib/utils";

function isValidShape(obj: unknown): obj is StoreShape {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const v = o.version;
  return (
    (v === 1 || v === 2) &&
    Array.isArray(o.applications) &&
    Array.isArray(o.resumes) &&
    Array.isArray(o.companyNotes) &&
    Array.isArray(o.prepItems) &&
    Array.isArray(o.activity)
  );
}

export default function Settings() {
  const { data, loaded, resetToSeed, replaceAll, importApplications } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirming, setConfirming] = useState<"reset" | "clear" | null>(null);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);

  /** localStorage usage for the PlaceTrack key — client-only read so prerender stays stable. */
  useEffect(() => {
    if (!loaded) return;
    try {
      const raw = localStorage.getItem("placetrack.v1");
      setStorageBytes(raw ? new Blob([raw]).size : 0);
    } catch {
      setStorageBytes(null);
    }
  }, [loaded, data]);

  const flash = (kind: "ok" | "err", text: string) => setMessage({ kind, text });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `placetrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("ok", "Backup downloaded.");
  };

  const exportCsv = () => {
    const cell = (v: string | undefined) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "Company", "Role", "Stage", "CTC", "Location", "Work mode", "Applied via",
      "Outcome", "Deadline", "Link", "Tags", "Next action", "Next action date",
      "Loop", "Interest", "Referred by",
      "Comp base", "Comp bonus", "Comp signing", "Comp equity", "Negotiation notes",
      "Created", "Updated",
    ];
    const lines = [header.map(cell).join(",")];
    for (const a of data.applications) {
      lines.push(
        [
          a.company, a.role, a.stage, a.ctc, a.location, a.workMode, a.source,
          a.outcome, a.deadline, a.link, a.tags.join("; "), a.nextAction,
          a.nextActionDate, a.loop, a.interest ? String(a.interest) : undefined, a.referredBy,
          a.compBreakdown?.base, a.compBreakdown?.bonus,
          a.compBreakdown?.signing, a.compBreakdown?.equity, a.negotiationNotes,
          a.createdAt, a.updatedAt,
        ].map(cell).join(",")
      );
    }
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `placetrack-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    flash("ok", "Applications exported as CSV — opens in Excel or Sheets.");
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!isValidShape(parsed)) {
          flash("err", "That file doesn't look like a PlaceTrack backup.");
          return;
        }
        replaceAll(parsed);
        flash("ok", "Backup imported — your data has been replaced.");
      } catch {
        flash("err", "Couldn't read that file. Is it valid JSON?");
      }
    };
    reader.readAsText(file);
  };

  /** Parse a quoted CSV (handles "" escapes and commas inside quotes). */
  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let cur = "";
    let row: string[] = [];
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
    if (cur !== "" || row.length > 0) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  };

  /** Import applications from the CSV our own export produces (appends, skips duplicates). */
  const importCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result));
        if (rows.length < 2) {
          flash("err", "That CSV has no data rows to import.");
          return;
        }
        const header = rows[0].map((h) => h.trim().toLowerCase());
        const col = (name: string) => header.indexOf(name);
        const ci = col("company"), ri = col("role");
        if (ci < 0 || ri < 0) {
          flash("err", "That CSV needs at least Company and Role columns.");
          return;
        }
        const seen = new Set(
          data.applications.map((a) => `${a.company.toLowerCase()}|${a.role.toLowerCase()}`)
        );
        const validModes = ["onsite", "hybrid", "remote"];
        const validOutcomes = ["waiting", "accepted", "declined"];
        const inputs: Array<Partial<import("../../lib/types").Application> & { company: string; role: string; stage: Stage }> = [];
        let skipped = 0;
        for (const r of rows.slice(1)) {
          const company = (r[ci] ?? "").trim();
          const role = (r[ri] ?? "").trim();
          const key = `${company.toLowerCase()}|${role.toLowerCase()}`;
          if (!company || !role || seen.has(key)) { skipped++; continue; }
          seen.add(key);
          const stageRaw = ((r[col("stage")] ?? "").trim().toLowerCase()) as Stage;
          const modeRaw = (r[col("work mode")] ?? "").trim().toLowerCase();
          const outcomeRaw = (r[col("outcome")] ?? "").trim().toLowerCase();
          const created = (r[col("created")] ?? "").trim();
          const tagsRaw = (r[col("tags")] ?? "").trim();
          const compBase = (r[col("comp base")] ?? "").trim();
          const compBonus = (r[col("comp bonus")] ?? "").trim();
          const compSigning = (r[col("comp signing")] ?? "").trim();
          const compEquity = (r[col("comp equity")] ?? "").trim();
          const interestRaw = parseInt((r[col("interest")] ?? "").trim(), 10);
          inputs.push({
            company,
            role,
            stage: STAGES.includes(stageRaw) ? stageRaw : "wishlist",
            ctc: (r[col("ctc")] ?? "").trim() || undefined,
            location: (r[col("location")] ?? "").trim() || undefined,
            workMode: validModes.includes(modeRaw) ? (modeRaw as "onsite" | "hybrid" | "remote") : undefined,
            source: (r[col("applied via")] ?? "").trim() || undefined,
            outcome: validOutcomes.includes(outcomeRaw) ? (outcomeRaw as "waiting" | "accepted" | "declined") : undefined,
            deadline: (r[col("deadline")] ?? "").trim() || undefined,
            link: (r[col("link")] ?? "").trim() || undefined,
            tags: tagsRaw ? tagsRaw.split(";").map((t) => t.trim()).filter(Boolean) : [],
            nextAction: (r[col("next action")] ?? "").trim() || undefined,
            nextActionDate: (r[col("next action date")] ?? "").trim() || undefined,
            loop: (r[col("loop")] ?? "").trim() || undefined,
            referredBy: (r[col("referred by")] ?? "").trim() || undefined,
            interest: interestRaw >= 1 && interestRaw <= 5 ? interestRaw : undefined,
            compBreakdown:
              compBase || compBonus || compSigning || compEquity
                ? {
                    base: compBase || undefined,
                    bonus: compBonus || undefined,
                    signing: compSigning || undefined,
                    equity: compEquity || undefined,
                  }
                : undefined,
            negotiationNotes: (r[col("negotiation notes")] ?? "").trim() || undefined,
            createdAt: created || undefined,
          });
        }
        const added = importApplications(inputs);
        if (added === 0) {
          flash("err", skipped > 0 ? "Nothing new — those rows are already tracked." : "No valid rows found in that CSV.");
        } else {
          flash("ok", `Imported ${added} application${added === 1 ? "" : "s"}${skipped > 0 ? ` (${skipped} skipped as duplicates)` : ""}.`);
        }
      } catch {
        flash("err", "Couldn't read that CSV file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Your data, your call. Everything stays in this browser.</p>
      </div>

      {message && (
        <p
          className={cx(
            "mt-4 rounded-lg px-3 py-2 text-sm",
            message.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}
          role="status"
        >
          {message.text}
        </p>
      )}

      {/* Data portability */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Data portability</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {loaded
            ? `${data.applications.length} applications, ${data.resumes.length} resumes, ${data.companyNotes.length} company notes`
            : "Loading…"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={exportJson}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Export JSON
          </button>
          <button
            onClick={exportCsv}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import PlaceTrack backup"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => csvRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Import CSV
          </button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            aria-label="Import applications from CSV"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsvFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Export before switching browsers — importing replaces everything currently stored.
        </p>
        {storageBytes !== null && (
          <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-700">Local storage used</span>
              <span className="text-xs text-zinc-500">
                {(storageBytes / 1024).toFixed(0)} KB of ~5 MB
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200"
              role="progressbar"
              aria-valuenow={Math.min(100, Math.round((storageBytes / (5 * 1024 * 1024)) * 100))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Local storage used"
            >
              <div
                className={cx(
                  "h-full rounded-full transition-all",
                  storageBytes > 4 * 1024 * 1024
                    ? "bg-rose-500"
                    : storageBytes > 2.5 * 1024 * 1024
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(100, (storageBytes / (5 * 1024 * 1024)) * 100)}%` }}
              />
            </div>
            {storageBytes > 2.5 * 1024 * 1024 && (
              <p className="mt-1.5 text-xs text-amber-700">
                Getting full — export a JSON backup and consider removing large resume attachments.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="mt-4 rounded-xl border border-rose-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-rose-700">Danger zone</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-zinc-900">Reset sample data</div>
              <div className="text-xs text-zinc-500">Restore the original demo dataset. Your current data is discarded.</div>
            </div>
            {confirming === "reset" ? (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => { resetToSeed(); setConfirming(null); flash("ok", "Sample data restored."); }}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming("reset")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Reset…
              </button>
            )}
          </div>
          <div className="border-t border-zinc-100" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-zinc-900">Erase everything</div>
              <div className="text-xs text-zinc-500">Wipe all applications, notes, and history. Export first if unsure.</div>
            </div>
            {confirming === "clear" ? (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    replaceAll({
                      version: 3,
                      applications: [],
                      resumes: [],
                      companyNotes: [],
                      prepItems: [],
                      starStories: [],
                      activity: [],
                      savedViews: [],
                    });
                    setConfirming(null);
                    flash("ok", "All data erased. Fresh start.");
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Yes, erase
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming("clear")}
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                Erase…
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
