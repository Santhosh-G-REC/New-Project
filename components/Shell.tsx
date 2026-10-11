"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { listenForAnnouncements, type Announcement } from "../lib/announce";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { cx } from "../lib/utils";
import { useStore } from "../lib/store";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

interface NavItem {
  href: string;
  label: string;
  ready: boolean;
  icon: ReactNode;
}

function icon(path: string): ReactNode {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", ready: true, icon: icon("M3 10.5 10 3l7 7.5M5 9.5V17h10V9.5") },
  { href: "/pipeline", label: "Pipeline", ready: true, icon: icon("M4 6h4v4H4zM12 6h4v4h-4zM4 14h4v4H4zM12 14h4v4h-4z") },
  { href: "/offers", label: "Offers", ready: true, icon: icon("M6 3h12v18H6zM9 7h6M9 11h6M6 15h12") },
  { href: "/applications", label: "Applications", ready: true, icon: icon("M4 4h16v12H4zM4 8h16M8 20h8") },
  { href: "/deadlines", label: "Deadlines", ready: true, icon: icon("M10 5v5l3 2M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z") },
  { href: "/companies", label: "Companies", ready: true, icon: icon("M3 17V8l7-5 7 5v9M3 17h14M7 17v-5h6v5") },
  { href: "/resumes", label: "Resumes", ready: true, icon: icon("M6 3h8l4 4v10H6zM14 3v4h4M9 12h6M9 15h6") },
  { href: "/prep", label: "Prep", ready: true, icon: icon("M9 3h6l1 7h-8zM6 17l1.5-6h9L18 17M4 20h16") },
  { href: "/review", label: "Weekly review", ready: true, icon: icon("M4 5h16M4 5v11h16V5M4 10h16M8 2.5v3M16 2.5v3") },
  { href: "/templates", label: "Templates", ready: true, icon: icon("M4 4h12v12H4zM8 16v3h8v-3M8 4h8v4H8z") },
  { href: "/contacts", label: "Contacts", ready: true, icon: icon("M10 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3.5 16.5c.8-3 3.4-4.5 6.5-4.5s5.7 1.5 6.5 4.5") },
  { href: "/analytics", label: "Analytics", ready: true, icon: icon("M4 17V10M10 17V4M16 17v-6M2.5 17.5h15") },
  { href: "/settings", label: "Settings", ready: true, icon: icon("M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z") },
];

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  // Overdue-deadline badge: computed against a client-only clock so Next 16's
  // prerender never sees an unstable time value.
  const { data, loaded } = useStore();
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  const overdueCount = useMemo(() => {
    if (!loaded || nowMs === null) return 0;
    const todayStart = new Date(nowMs);
    todayStart.setHours(0, 0, 0, 0);
    return data.applications.filter((a) => {
      if (!a.deadline || ["offer", "rejected"].includes(a.stage)) return false;
      const [y, m, d] = a.deadline.split("-").map(Number);
      if (!y || !m || !d) return false;
      return new Date(y, m - 1, d).getTime() < todayStart.getTime();
    }).length;
  }, [data.applications, loaded, nowMs]);

  const navLink = (item: NavItem) => {
    const active = item.ready && pathname === item.href;
    const classes = cx(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-emerald-50 text-emerald-700"
        : item.ready
          ? "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          : "cursor-default text-zinc-400"
    );
    const inner = (
      <>
        <span className={cx(active ? "text-emerald-600" : "text-zinc-400")}>{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.href === "/deadlines" && overdueCount > 0 && (
          <span
            className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700"
            title={`${overdueCount} overdue deadline${overdueCount === 1 ? "" : "s"}`}
          >
            {overdueCount}
          </span>
        )}
        {!item.ready && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Soon
          </span>
        )}
      </>
    );
    return item.ready ? (
      <Link key={item.href} href={item.href} className={classes} onClick={onNavigate}>
        {inner}
      </Link>
    ) : (
      <span key={item.href} className={classes} title="Coming in a later build cycle">
        {inner}
      </span>
    );
  };

  return <div className="flex flex-col gap-0.5">{NAV.map(navLink)}</div>;
}

/** usePathname reader isolated behind Suspense so dynamic routes can prerender. */
function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} onNavigate={onNavigate} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  /** Screen-reader announcements for silent state changes (stage logging, etc.). */
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  useEffect(() => listenForAnnouncements(setAnnouncement), []);

  return (
    <div className="flex min-h-screen">
      {/* Skip link: visible on keyboard focus only */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
      >
        Skip to content
      </a>
      {/* Polite live region for action confirmations */}
      <div aria-live="polite" role="status" className="sr-only" key={announcement?.n ?? 0}>
        {announcement?.message ?? ""}
      </div>
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white print:hidden md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">PlaceTrack</span>
        </div>
        <nav className="flex-1 px-3">
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav />
          </Suspense>
        </nav>
        <div className="px-5 py-4 text-xs leading-5 text-zinc-400">
          Your data stays in this browser.
          <br />
          Nothing leaves your machine.
          <br />
          <span className="mt-1 inline-block">
            Press{" "}
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 font-medium text-zinc-500">
              n
            </kbd>{" "}
            for a new application,{" "}
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 font-medium text-zinc-500">
              ?
            </kbd>{" "}
            for shortcuts.
          </span>
        </div>
      </aside>

      {/* Global keyboard shortcuts (n / Esc / /) */}
      <KeyboardShortcuts />

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 border-b border-zinc-200 bg-white print:hidden md:hidden">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-label="Open navigation"
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
            </svg>
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
            P
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">PlaceTrack</span>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      <div
        className={cx("fixed inset-0 z-40 bg-black/40 print:hidden md:hidden", !drawerOpen && "hidden")}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Mobile slide-over drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!drawerOpen}
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform print:hidden md:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
              P
            </span>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">PlaceTrack</span>
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Close navigation"
            className="rounded-lg px-2 py-1 text-xl leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav onNavigate={closeDrawer} />
          </Suspense>
        </nav>
        <div className="px-5 py-4 text-xs leading-5 text-zinc-400">
          Press{" "}
          <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 font-medium text-zinc-500">
            n
          </kbd>{" "}
          for a new application,{" "}
          <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 font-medium text-zinc-500">
            ?
          </kbd>{" "}
          for shortcuts.
        </div>
      </div>

      {/* Content */}
      <main id="main-content" className="min-w-0 flex-1 pt-20 md:pt-0 print:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
