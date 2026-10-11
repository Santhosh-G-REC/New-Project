"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AddApplicationModal } from "./AddApplicationModal";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "n", label: "New application (opens the add modal)" },
  { keys: "/", label: "Focus the applications search box" },
  { keys: "g d", label: "Go to Dashboard" },
  { keys: "g p", label: "Go to Pipeline" },
  { keys: "g a", label: "Go to Applications" },
  { keys: "g t", label: "Go to Deadlines" },
  { keys: "g r", label: "Go to Weekly review" },
  { keys: "Esc", label: "Close the modal or this dialog" },
  { keys: "?", label: "Show this shortcuts list" },
];

const NAV_KEYS: Record<string, string> = {
  d: "/",
  p: "/pipeline",
  a: "/applications",
  t: "/deadlines",
  r: "/review",
};

/**
 * Global keyboard shortcuts, mounted in Shell so they work on every page:
 * - "n" opens the New application modal (unless typing in a field)
 * - "g" then a letter jumps to a page (g d = dashboard, g p = pipeline, …)
 * - Escape closes it (or the shortcuts dialog)
 * - "/" focuses the applications search box when it exists
 * - "?" opens the shortcuts help dialog
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setHelpOpen(false);
        setPendingG(false);
        return;
      }
      const el = e.target as HTMLElement | null;
      const inField =
        !!el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      if (pendingG) {
        setPendingG(false);
        if (gTimer.current) clearTimeout(gTimer.current);
        const href = NAV_KEYS[e.key];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "g") {
        e.preventDefault();
        setPendingG(true);
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => setPendingG(false), 1200);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === "/") {
        const search = document.getElementById("app-search");
        if (search) {
          e.preventDefault();
          search.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingG, router]);

  return (
    <>
      {open && <AddApplicationModal onClose={() => setOpen(false)} />}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Keyboard shortcuts</h2>
              <button
                onClick={() => setHelpOpen(false)}
                aria-label="Close shortcuts"
                className="rounded px-1.5 text-lg leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                ×
              </button>
            </div>
            <ul className="mt-3 flex flex-col gap-2.5">
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-center gap-3 text-sm">
                  <kbd className="w-10 shrink-0 rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-center font-medium text-zinc-600">
                    {s.keys}
                  </kbd>
                  <span className="text-zinc-600">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
