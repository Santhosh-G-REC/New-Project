"use client";

import { useEffect, useState } from "react";
import { announce } from "../lib/announce";
import { cx } from "../lib/utils";

const PRESETS = [5, 10, 15, 30]; // minutes

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Mock interview countdown timer — time yourself answering questions out loud,
 * like a real interview slot. Client-only state; no clock reads during render.
 */
export function MockTimer() {
  const [preset, setPreset] = useState(10);
  const [remaining, setRemaining] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const total = preset * 60;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false);
      setFinished(true);
      announce("Time's up — mock interview finished");
    }
  }, [remaining, running]);

  const choose = (m: number) => {
    setPreset(m);
    setRemaining(m * 60);
    setRunning(false);
    setFinished(false);
  };

  const reset = () => {
    setRemaining(total);
    setRunning(false);
    setFinished(false);
  };

  const elapsed = total - remaining;

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-5"
      aria-label="Mock interview timer"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Mock interview timer</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Answer out loud, beat the clock.</p>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Timer duration">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => choose(m)}
            aria-pressed={preset === m}
            className={cx(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              preset === m
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            )}
          >
            {m} min
          </button>
        ))}
      </div>

      <div
        className="mt-3 text-center text-4xl font-semibold tabular-nums tracking-tight text-zinc-900"
        role="timer"
        aria-live="off"
      >
        {fmt(remaining)}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cx("h-full rounded-full", finished ? "bg-emerald-500" : "bg-zinc-700")}
          style={{ width: `${total === 0 ? 0 : (elapsed / total) * 100}%` }}
        />
      </div>

      {finished ? (
        <p className="mt-2 text-center text-sm font-medium text-emerald-700">
          Time's up — how did it feel?
        </p>
      ) : (
        <p className="mt-2 text-center text-xs text-zinc-400">
          {running ? "Timer running…" : remaining < total ? "Paused" : "Ready when you are"}
        </p>
      )}

      <div className="mt-3 flex justify-center gap-2">
        {!running ? (
          <button
            onClick={() => {
              if (remaining === 0) setRemaining(total);
              setFinished(false);
              setRunning(true);
            }}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {remaining < total && remaining > 0 ? "Resume" : "Start"}
          </button>
        ) : (
          <button
            onClick={() => setRunning(false)}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Pause
          </button>
        )}
        <button
          onClick={reset}
          disabled={remaining === total && !running && !finished}
          className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
