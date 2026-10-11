# Build cycles — PlaceTrack (surprise build)

## Cycle 0 — 22:20 IST
- Project scaffolded: Next.js + TypeScript + Tailwind (App Router). `npm run build` green.
- PROJECT_BRIEF.md written: PlaceTrack vision, feature scope, UI rules, working rules.
Deployed: no (local only until morning approval)

## Cycle 1 — 22:45 IST
- Data layer: `lib/types.ts` (Application, Stage, ResumeVersion, CompanyNote, PrepItem, ActivityEvent, versioned StoreShape) and `lib/store.tsx` (StoreProvider + useStore hook, versioned localStorage persistence, CRUD/move/toggle actions, activity log, realistic seed data for 10 applications across all stages with deadlines, resumes, company notes, prep checklist).
- `npm run build` green.
Deployed: no

## Cycle 2 — 22:52 IST
- App shell + dashboard: `components/Shell.tsx` (sidebar nav with Soon badges for unbuilt sections, mobile top bar), `lib/utils.ts` (date/deadline formatting helpers), dashboard `app/page.tsx` (stats row: applications/active/interviews/offers/response rate; pipeline snapshot bar; upcoming deadlines with overdue highlighting; recent activity feed; loading skeletons; empty states), light-theme `globals.css`, updated `app/layout.tsx` metadata + StoreProvider wiring.
- Hit Next 16 prerender strictness: build fails if a client component reads current time (`new Date()`) during server prerender — fixed by gating all time reads behind the client-only `loaded` flag.
- `npm run build` green.
Deployed: no

## Cycle 3 — 22:58 IST
- Pipeline kanban (`app/pipeline/page.tsx`): 6 stage columns with counts, application cards (company, role, CTC/location/deadline chips with overdue highlighting), per-card "Move to" stage dropdown wired to the store (stage history + activity log update), inline delete with confirm, per-column deadline sorting, empty-column states, horizontal scroll on mobile.
- Add-application modal (`components/AddApplicationModal.tsx`): company/role required, stage/deadline/CTC/location/work-mode/resume/link/notes fields, Escape + overlay-click to close, autofocus, validation message.
- `npm run build` green.
Deployed: no

## Cycle 4 — 23:20 IST
- Labels/tags (Teal pattern): `tags: string[]` added to Application with schema v1→v2 migration for existing localStorage data; seed apps tagged (Amazon "High Priority", Flipkart "Referral", Cognizant "Backup", Atlassian "Dream"); comma-separated tag input in the add-application modal; tag chips on pipeline cards; clickable tag filter row above the kanban.
- `npm run build` green.
Deployed: no

## Cycle 5 — 23:45 IST
- Application detail page at /applications/[id] (Teal source-of-truth record pattern): inline-editable details form (role, deadline, CTC, location, mode, resume link, tags, notes) with dirty-state save, stage mover + delete with confirm, visual stage timeline from stage history, contacts add/remove (Huntr pattern: recruiter lives next to the job), job-posting link card, per-application activity feed, "not found" state. Pipeline company names now link to the detail page.
- Framework plumbing: root-layout Shell's usePathname() needed a Suspense boundary for Next 16 cacheComponents prerendering of dynamic routes — nav links extracted into a Suspense-wrapped Nav component per the official docs; dynamic page wraps useParams() view in Suspense.
- New store actions: addContact, removeContact.
- `npm run build` green.
Deployed: no

## Cycle 6 — 00:05 IST
- Follow-up reminders (Huntr's killer insight: "spreadsheets don't remind you to follow up"): new optional `nextAction` + `nextActionDate` fields on applications (editable in the detail page form), seeded on three apps; dashboard "Follow-ups" panel groups overdue/today/upcoming with amber highlighting for overdue items, each linked to the application detail and with a one-click "✓ Done" that clears it.
- `npm run build` green.
Deployed: no

## Cycle 7 — 00:30 IST
- Company research notes page (/companies, now in nav): company list derived from applications + notes with application counts and search, per-company editor for "about" and "interview process" with dirty-state save, question bank (add/remove questions, seeded for Zoho/TCS), and links back to each application at that company. New store actions: upsertCompanyNote, addQuestion, deleteQuestion.
- `npm run build` green.
Deployed: no

## Cycle 8 — 01:00 IST
- Resume vault (/resumes, now in nav): full CRUD for resume versions with file name + notes, one-click "Set default", per-version list of linked applications (deleting a version unlinks it cleanly), "Add version" form, empty state. New store actions: addResume, updateResume, deleteResume, setDefaultResume; `isDefault` added to ResumeVersion (seed v3 marked default).
- `npm run build` green.
Deployed: no

## Cycle 9 — 01:25 IST
- Interview prep page (/prep, now in nav): per-application checklists (add/toggle/delete with progress bar, custom checkboxes) auto-surfaced for assessment/interview-stage applications plus any with existing items, and a question bank sidebar pulling real questions from company notes for companies with active applications. New store action: deletePrepItem.
- `npm run build` green.
Deployed: no

## Cycle 10 — 01:50 IST
- Analytics page (/analytics, now live in nav): pipeline funnel (per-stage reach + step conversion, colored bars), applications-per-week SVG bar chart for the last 8 weeks, and stat cards for response rate, offers, rejections, and median days from applied to first response. Pure CSS/SVG, no chart library. Empty state when no data.
- `npm run build` green.
Deployed: no

## Cycle 11 — 02:15 IST
- Applications list page (/applications, now in nav): full-text search across company/role/location/notes, multi-select stage filter chips, tag filter, four sort orders (deadline, recently updated, recently added, company A–Z), result count, clear-all filters, rich rows linking to each application's detail page, empty/no-match states.
- `npm run build` green.
Deployed: no

## Cycle 12 — 02:40 IST
- Deadlines page (/deadlines, now live in nav — the last "Soon" badge is gone): List view grouped by Overdue / Today / Tomorrow / Next 7 days / Later with rose/amber overdue highlighting, plus a 7-day Week strip view; both link through to application detail pages. Completed/rejected applications excluded.
- `npm run build` green.
Deployed: no

## Cycle 13 — 03:05 IST
- Settings page (/settings, now in nav): data portability — Export JSON (downloads a dated backup), Import JSON (file picker with schema validation, replaces stored data through the v1→v2 migrator), plus a Danger zone with double-confirm reset-to-sample-data and erase-everything actions. New store action: replaceAll.
- `npm run build` green.
Deployed: no

## Cycle 14 — 23:28 IST
- Onboarding "Getting started" checklist on the dashboard (watchdog cycle): dismissible card with 4 auto-checked steps (add first application, set a deadline, link a resume, research a company) with progress bar; auto-hides when all steps are done; dismissal persisted in a separate localStorage key so the schema stays untouched.
- `npm run build` green.
Deployed: no

## Cycle 15 — 23:39 IST
- "Needs attention" stale-application nudges on the dashboard (watchdog cycle): active-stage applications (applied/assessment/interview) untouched for 14+ days get an amber section with "No update in Nd" and deep links to each detail page; renders only when non-empty, capped at 4 rows. First attempt failed `next build` prerender — Next 16 treats a `Date.now()` in the client-component render pass as an unstable value (learned the hard way, re-confirming the project's AGENTS.md lesson); fixed by reading `Date.now()` once in a `useEffect` into state and deriving everything from it. Day counts are computed explicitly instead of `timeAgo` (which returns a calendar date past 7 days).
- `npm run build` green (after the prerender fix).
Deployed: no

## Cycle 16 — 23:44 IST
- Duplicate-application warning in the add-application modal (watchdog cycle): typing a company+role that already exists (case-insensitive) shows an amber "possible duplicate" banner listing the matching entries with their stages; same-company-different-role matches get a neutral info note instead. Non-blocking — submitting still adds the entry.
- `npm run build` green.
Deployed: no

## Cycle 17 — 00:00 IST
- Drag-and-drop kanban (Teal pattern): pipeline cards are now natively draggable — dragstart carries the app id, columns highlight with an emerald ring on dragover, drop moves the card via the existing moveApplication store action (stage history + activity log included). Dragged card shows at reduced opacity; the "Move to" select stays as the keyboard/touch fallback. No animations added (prefers-reduced-motion safe). Fixed two self-inflicted JSX edits in AppCard before the build passed.
- `npm run build` green.
Deployed: no

## Cycle 18 — 00:03 IST
- "Applied via" source tracking (Huntr pattern — "spreadsheets don't remind you to follow up; you know where applications came from"): new optional `source` field on Application with schema v2→v3 migrator; shared `APPLICATION_SOURCES` suggestion list (Internshala, Naukri, Unstop, Referral, T&P Cell, Company site, Other) used as free-text + datalist in both the add-application modal and the detail form; all 10 seed apps given realistic sources; new "Applications by source" breakdown on Analytics with counts and horizontal bars.
- Fixed two TS errors from the version bump (migrator intermediate version typing, settings erase-everything shape).
- `npm run build` green.
Deployed: no

## Cycle 19 — 00:05 IST
- Offer outcome decisions: new optional `outcome` field ("waiting" | "accepted" | "declined", schema stays v3) + `setOutcome` store action with activity entries ("Accepted offer from X 🎉", "Declined offer from X"). Offer-stage detail pages get an "Offer decision" segmented control (Waiting/Accepted/Declined, aria-pressed) with an outcome chip readout. New dashboard "Offers" panel lists offer-stage apps with outcome chips and a Compare link; offer-stage pipeline cards also show the chip. New shared `components/OutcomeChip.tsx`. Self-fixed an edit that had stripped a newline inside deleteApplication.
- `npm run build` green.
Deployed: no

## Cycle 20 — 00:06 IST
- Offer comparison page (/offers, now in nav): table of all offer-stage applications — company (links to detail), role, CTC with monthly-equivalent and a "Best" badge on the highest CTC, location, work mode, outcome chip, decision deadline countdown. Best-effort CTC parser in lib/utils.ts (`parseCtcMonthly`: "12 LPA" → ₹83.3k/mo, "₹1,00,000/mo", "60k/mo") with ties sharing the badge; unparseable values sort last with no badge. Empty state ("No offers yet — your pipeline will show here"). Dashboard Offers panel already links here.
- `npm run build` green.
Deployed: no

## Cycle 21 — 00:08 IST
- ICS "Add to calendar" for deadlines: new `lib/ics.ts` helper `downloadIcs(app)` generating a valid .ics (all-day event, floating time, no VTIMEZONE; SUMMARY "Application deadline: {company} — {role}"; DESCRIPTION carries role/link/notes, properly escaped) downloaded as `placetrack-{company-slug}-deadline.ics`. Buttons added to every deadlines-page list row (restructured the row so the icon button sits outside the link) and on the application detail page next to the deadline chip.
- `npm run build` green.
Deployed: no

## Cycle 22 — 00:09 IST
- Weekly application goal (pacing pattern): new dashboard card "This week's goal" — editable numeric target (default 3) persisted in a separate `placetrack.goal.v1` localStorage key (store schema untouched), progress bar of applications created since Monday 00:00 vs target, celebratory "Goal smashed 🎯" state when met. Client-side now read in useEffect (Next 16 prerender-safe).
- `npm run build` green.
Deployed: no

## Cycle 23 — 00:10 IST
- Global keyboard shortcuts: new `components/KeyboardShortcuts.tsx` mounted inside Shell — "n" opens the New application modal on every page (ignored while typing in inputs/textareas/selects/contentEditable or with modifier keys), Escape closes it, "/" focuses the /applications search box (new `id="app-search"` on that input). Modal is rendered by the shortcuts component so it's truly global. Sidebar footer gains a subtle "Press n for a new application" hint.
- `npm run build` green.
Deployed: no

## Cycle 24 — 00:11 IST
- Mobile nav drawer: the mobile top bar now shows a hamburger (aria-expanded/aria-label) that opens a fixed slide-over drawer from the left with the full NavLinks list; any link click closes it; backdrop dismisses; a single CSS transition handles the motion (killed automatically by the existing prefers-reduced-motion global rule). Single-row bar, so mobile content padding tightened (pt-28 → pt-20). `id="main-content"` added to <main> ahead of the a11y pass.
- `npm run build` green.
Deployed: no

## Cycle 25 — 00:12 IST
- Accessibility pass: skip-to-content link in Shell (visually hidden until keyboard focus, targets #main-content); global `:focus-visible` emerald outline in globals.css (form fields keep their own ring styles); full audit of icon-only buttons — every one already carried an aria-label (pipeline card delete, modal/drawer close, getting-started dismiss, contact remove, prep-item delete, question delete, calendar buttons, hamburger); no toast-like panels exist on the dashboard (follow-ups/needs-attention are static sections), so no aria-live was invented. All text buttons remain labelled.
- `npm run build` green.
Deployed: no

## Cycle 26 — 00:41 IST
- Analytics "Median days in each stage" panel (watchdog cycle): completed stage dwells derived from stage-history transitions (exit minus entry, sorted, current stage excluded), median per funnel stage with stage-dot bars; "—"/"Not enough stage movement yet" empty states. Follows the existing funnel/source panel style.
- `npm run build` green.
Deployed: no

## Cycle 27 — 00:42 IST
- Settings CSV export (watchdog cycle): new "Export CSV" button flattens all applications (company, role, stage, CTC, location, work mode, source, outcome, deadline, link, tags, next action + date, created/updated) with RFC-4180 quoting; downloads a dated CSV that opens in Excel/Sheets. Sits next to Export JSON in Data portability.
- `npm run build` green.
Deployed: no

## Cycle 28 — 00:43 IST
- Rejection reason tracking (watchdog cycle): optional `rejectionReason` field on Application (no schema bump — optional like `outcome`); detail page shows a "Rejection reason" textarea only when the stage is Rejected, saved through the existing dirty-state form; new Analytics "Rejection reasons" breakdown panel counts distinct reasons across rejected apps (+ "Not recorded"). Helps spot patterns in why applications fail.
- `npm run build` green.
Deployed: no

## Cycle 29 — 01:02 IST
- Interview rounds data model (researched pattern: interview scheduling with date/time, interviewer, meeting links): new `InterviewRound` type (`label`, `at` local datetime, `interviewer`, `link`, `notes`), optional `interviews[]` on Application (no schema bump needed); store gains `addInterviewRound` / `updateInterviewRound` / `deleteInterviewRound` with activity entries; seed Zoho + Flipkart given realistic rounds; new `formatDateTime` / `daysUntilDatetime` helpers in lib/utils.ts. (Store edit clobbered the `upsertCompanyNote` declaration mid-cycle — spotted and repaired before building.)
- `npm run build` green.
Deployed: no

## Cycle 30 — 01:03 IST
- "Interview rounds" card on the application detail page: rounds sorted soonest-first, each showing formatted date-time, interviewer, notes and a "Join meeting ↗" link; add/edit/delete via an inline form with `datetime-local` input. Empty state explains what the card is for.
- `npm run build` green.
Deployed: no

## Cycle 31 — 01:04 IST
- Dashboard "Upcoming interviews" panel: all scheduled rounds from interview/assessment-stage applications, soonest first (6 max), with "today / tomorrow / in Nd" labels, amber styling for rounds whose scheduled time has passed ("reschedule or delete it"), plus Join and Open links. Time read is client-only via the existing `nowMs` useEffect (Next 16 prerender-safe).
- `npm run build` green.
Deployed: no

## Cycle 32 — 01:05 IST
- Follow-up completion now records history: new `completeNextAction` store action clears the next action AND writes an activity entry ("Completed follow-up …"); the dashboard Follow-ups "✓ Done" button uses it instead of silently clearing. (Strengthens the Huntr "follow up and it's recorded" pattern.)
- `npm run build` green.
Deployed: no

## Cycle 33 — 01:05 IST
- Interest rating (Teal's "excitement level" pattern): optional 1–5 `interest` on Application; new shared `components/InterestStars.tsx` (interactive selector in the details form with clear, read-only display elsewhere); stars shown on the detail-page chip row and small on pipeline cards; 4 seed apps given realistic ratings.
- `npm run build` green.
Deployed: no

## Cycle 34 — 01:06 IST
- Bulk actions on /applications: per-row checkboxes (row restructured so the checkbox sits outside the link for valid HTML), select-all/deselect-all, sticky-style bulk bar with "N selected", Move-to-stage dropdown, and double-confirm bulk delete; selection clears after acting.
- `npm run build` green.
Deployed: no

## Cycle 35 — 01:07 IST
- Interview-day one-pager: new printable route `/applications/[id]/onepager` (`components/InterviewOnePager.tsx`) compiling key facts (CTC + monthly equivalent), interview rounds, contacts, prep checklist, company research and notes — screen-only Print/Back toolbar; "One-pager" button added to the detail page header; Shell chrome (sidebar, mobile bar/drawer) and toolbar hidden via `print:hidden` so only the one-pager prints.
- `npm run build` green.
Deployed: no

## Cycle 36 — 01:07 IST
- Email templates page (/templates, now in nav): 5 original templates (post-apply follow-up, interview thank-you, status inquiry, offer acceptance, referral ask) with copy-to-clipboard buttons (selection fallback); your-name/company/role fields at the top live-fill the `[...]` placeholders across all templates.
- `npm run build` green.
Deployed: no

## Cycle 37 — 01:08 IST
- CTC chip on the application detail header: shows the CTC plus a monthly equivalent when parseable ("8.4 LPA · ₹70.0k/mo"), with a title tooltip. Reuses the offers-page `parseCtcMonthly`/`formatMonthly` helpers.
- `npm run build` green.
Deployed: no

## Cycle 38 — 01:08 IST
- "?" keyboard shortcut: opens a shortcuts help dialog (n / / / Esc / ? with labels, role="dialog" aria-modal, backdrop + × + Esc dismiss); sidebar and mobile drawer footers now mention "? for shortcuts". Rewrote KeyboardShortcuts.tsx to also render the help dialog alongside the add modal.
- `npm run build` green.
Deployed: no

## Cycle 39 — 01:33 IST
- Per-application attachments ("Links & documents"): new `Attachment {id, label, url}` type + optional `attachments[]` on Application (no schema bump — optional like `interviews`); store gains `addAttachment` / `removeAttachment` with activity entries; new card on the application detail page (right column, after Interview rounds) with label+URL inline add and one-click remove; Amazon seed given a demo "OA practice portal" attachment.
- `npm run build` green.
Deployed: no

## Cycle 40 — 01:34 IST
- Stage-age on pipeline cards: each card now shows "In <stage> · Nd" under the role, computed from the last `stageHistory` entry (falls back to `updatedAt`), via a client-only `nowMs` clock (Next 16 prerender-safe pattern, same as the dashboard); cards stuck 15+ days in applied/assessment/interview render in amber with a "worth a nudge" tooltip.
- `npm run build` green.
Deployed: no

## Cycle 41 — 01:35 IST
- ICS export for interview rounds: new `downloadRoundIcs(app, round)` in lib/ics.ts (floating local time, default 1-hour duration, interviewer/meeting link/notes in the description; shared `downloadCalendarFile` helper now also backs `downloadIcs`); "Add to calendar (.ics)" button on each scheduled round on the detail page and a ".ics" button on every dashboard "Upcoming interviews" row.
- `npm run build` green.
Deployed: no

## Cycle 42 — 02:05 IST
- Contacts directory (`/contacts`, now in nav): aggregates every per-application contact (researched pattern: Huntr's contacts tracker is "the secret weapon" — hiring is about people, not portals) into one searchable page with initials avatar, company + role + stage dot, contact detail, last-activity date from the activity log, and an Open link per person. Empty states for no contacts / no search matches.
- `npm run build` green.
Deployed: no

## Cycle 43 — 02:14 IST
- One-click stage logging (Huntr pattern: "one-click buttons to log that you applied, got an interview, or got an offer"): new QuickLog bar under the application header with contextual buttons (wishlist→"Log applied", applied→"Log assessment"/"Log interview", assessment→"Log interview", interview→"Log offer"/"Log rejection", offer→"Log rejection", rejected→"Re-apply"). Reuses `moveApplication` so stage history + activity feed stay in sync.
- `npm run build` green.
Deployed: no

## Cycle 44 — 02:22 IST
- Analytics "Outcomes" panel (researched recruiting-funnel metrics: time-to-offer, interview-to-offer ratio, offer acceptance rate): three tiles showing Interview→offer conversion, offer acceptance % (accepted vs decided), and median days from first applied to offer, each with an explanatory hint. Sits between the funnel and weekly charts; "—" when there's no data yet.
- `npm run build` green.
Deployed: no

## Cycle 45 — 02:31 IST
- JD match checklist (researched pattern: Huntr's 4-dimension match score — qualifications/responsibilities/keywords/title): new optional `jdKeywords` on Application + "JD match" card on the detail page. Paste JD keywords (line/comma separated, saved via updateApplication); `parseKeywords`/`scoreKeywords` in lib/utils.ts score them against the app's notes, tags, company research and prep labels with word-boundary matching; match % headline (emerald/amber/rose), matched chips in green, missing grey with a "close the gaps" hint.
- `npm run build` green.
Deployed: no

## Cycle 46 — 02:40 IST
- Follow-up nudges on dashboard (researched: "Spreadsheets don't remind you to follow up. Huntr does"): new emerald "Follow-up nudges" panel listing active-stage applications 7+ days old with no next action set; one tap on "Remind me tomorrow" sets `nextAction` + `nextActionDate` (tomorrow, via new `isoDateIn` util) through updateApplication, landing the app in the existing Follow-ups list. Client-only clock, prerender-safe.
- `npm run build` green.
Deployed: no

## Cycle 47 — 02:48 IST
- Referral tracking (researched: referrals + "hiring is about people"): optional `referredBy` on Application — "Referred by" field in the add-application modal and the details form, a 🤝 referrer chip on the detail header, and a "🤝 Referred" toggle filter on /applications (included in the Clear-all reset). One seed application given a referrer.
- `npm run build` green.
Deployed: no

## Cycle 48 — 02:55 IST
- Weekly review page (`/review`, in nav): this-week vs last-week comparison (new applications, stage moves, interviews scheduled, follow-ups completed, offers accepted — classified from activity-feed text patterns), a 14-day activity-heat bar chart, and a highlights list of this week's key events. Microcopy nudges consistency over intensity.
- `npm run build` green.
Deployed: no

## Cycle 49 — 03:03 IST
- Month calendar view on /deadlines: third List/Week/Month tab with a navigable month grid (prev/next/Today, Sunday-start, today highlighted); deadline chips (rose for overdue, amber otherwise) and scheduled interview-round chips (violet) land on their dates, each linking to the application, with a "+N more" overflow. Uses the render-time `new Date()` pattern proven prerender-safe by the existing WeekView.
- `npm run build` green.
Deployed: no

## Cycle 50 — 03:11 IST
- Re-apply clone (researched: keep the pipeline full — Huntr's one-click stage logging, taken further): new `reapplyApplication` store action creates a fresh wishlist record from a rejected application, carrying over fields (role, CTC, location, contacts, tags, referrer, JD keywords…) while clearing stage-specific state (deadline, outcome, rounds, next action), with an activity entry; a "↻ Re-apply" button in the header of rejected apps navigates to the new record. The QuickLog rejected case was retired in favour of it.
- `npm run build` green.
Deployed: no

## Cycle 51 — 03:20 IST
- Screen-reader live announcements (accessibility): new `lib/announce.ts` — a `placetrack:announce` custom-event bus; Shell renders a polite `aria-live`/`role=status` region keyed so repeats re-announce. Wired into all previously-silent quick actions: QuickLog stage logging, offer-decision buttons, the dashboard "Remind me tomorrow" nudge, "✓ Done" follow-ups, and /applications bulk move/delete.
- `npm run build` green.
Deployed: no

## Cycle 52 — 02:43 IST
- Interview-round scheduling clash warning (researched: students juggle overlapping OAs/interviews across companies): the round editor on the detail page now checks the picked datetime against ALL scheduled rounds (every application) and shows an amber ⚠ "Possible schedule clash" alert naming the conflicting round/company/time when another round is within 90 minutes. Warning only — save is never blocked. Pure value math on stored datetime strings, prerender-safe (no clock reads).
- `npm run build` green.
Deployed: no

## Cycle 53 — 02:44 IST
- "Record health" card on the application detail page (researched: complete records convert better): a completeness checklist — deadline, recruiter/contact, resume version, follow-up scheduled (active stages only), JD keywords, company research note — with a progress bar (amber while incomplete, emerald at 100%) and per-item hints for where to fix the gap. Sits at the top of the detail page's right column; offered/rejected records skip the deadline/follow-up checks.
- `npm run build` green.
Deployed: no

## Cycle 54 — 02:45 IST
- Analytics: "Response rate by source" (researched: Huntr's channel-quality insight — counts tell you where you applied, rates tell you what works): new section next to the source breakdown showing per-source response share (reached assessment/interview/offer), sorted best-first, with "x of y responded" context. Sources with fewer than 2 attempted applications are excluded so tiny samples don't masquerade as insight.
- `npm run build` green.
Deployed: no

## Cycle 55 — 03:31 IST
- Analytics: "Industry benchmarks" panel (researched: Huntr 2025 benchmarks — response rate ~15%, median applied→first response ~5.6 days, typical volume ~16 apps/week). Compares your numbers with Great/On track/Below pills; statuses hidden until there's enough data (min sample thresholds per metric). Sits after Outcomes.
- `npm run build` green.
Deployed: no

## Cycle 56 — 03:58 IST
- STAR story bank + Practice Mode on /prep (researched: competency-tagged STAR stories with a practice mode that hides notes): new `StarStory {title, situation, task, action, result, tags[]}` type persisted in the store (migration-safe `starStories: []` default for old saves, two seed stories), store actions add/update/delete. UI: add form with S/T/A/R fields and competency tag suggestions (Leadership, Ownership, Conflict…), tag filter chips, practice-mode toggle that hides story bodies behind per-story "Reveal" buttons for out-loud rehearsal, delete per story.
- `npm run build` green.
Deployed: no

## Cycle 57 — 04:24 IST
- Resume tailoring tracking (researched: tailored resumes → ~35% more interviews): optional `tailoredResume` flag on Application, set via a "Tailored this resume for this role" checkbox in the add-application modal (needs a resume linked) and the details form; plus an Analytics "Tailored vs generic" section comparing response rates of tailored vs generic applications with bar visuals and a payoff note when tailoring wins.
- `npm run build` green.
Deployed: no

## Cycle 58 — 04:32 IST
- Templates: "Fill from an application" — pick any application and the Company/Role/job link/recruiter-name (first contact) fields auto-populate; [date] always resolves to today in en-IN format. Company/Role manual inputs disable while an application is selected. The existing fill+copy flow now works against real data instead of manual typing.
- `npm run build` green.
Deployed: no

## Cycle 59 — 04:46 IST
- Job posted date + apply-speed insight (researched: apply early — speed helps): optional `postedAt` date field on applications, settable in the add modal and details form; the detail header shows an apply-lag chip ("Applied the day it posted ⚡", emerald ≤3d, amber ≤7d) computed from the applied stage-history entry, and flags listings posted 30+ days ago as possibly stale. Pure date math on stored strings, prerender-safe.
- `npm run build` green.
Deployed: no

## Cycle 60 — 04:55 IST
- /review: "Copy week summary" button in the page header — builds a plain-text weekly digest (metric counts with week-over-week deltas plus top activity highlights) from the existing review data and copies it to the clipboard, ready to paste into WhatsApp or notes. Uses the client-only clock pattern; announced via the existing live region? (no — clipboard-only, silent by design).
- `npm run build` green.
Deployed: no

## Cycle 61 — 05:00 IST
- Interview one-pager: new print-ready "Resume to carry" section (names the linked resume, notes when it was tailored for this role) and "STAR stories to tell" section (top 4 stories with competency tags + result line), so the printed page works as an interview-day cheat sheet alongside rounds, contacts, prep checklist and research.
- `npm run build` green.
Deployed: no

## Cycle 62 — 05:06 IST
- Nav overdue-deadline badge: the Deadlines nav item now shows a rose count pill when any non-terminal application has a past deadline. Computed with a client-only clock (Next 16 prerender-safe pattern) from stored date strings; invisible when there's nothing overdue.
- `npm run build` green.
Deployed: no

## Cycle 63 — 05:13 IST
- Duplicate application: new `duplicateApplication` store action clones any application into a fresh wishlist record (carries company, role, CTC, location, contacts, tags, notes, resume link, JD keywords; resets stage history, clears outcome/rounds/next-action/deadline). "Duplicate" button in the detail header navigates straight to the clone; activity entry logged.
- `npm run build` green.
Deployed: no

## Cycle 64 — 05:19 IST
- Companies list: stage-presence dots — each company row now shows the stage dots of its applications (with a tooltip naming the stages), so pipeline spread is visible at a glance next to the application count. The list memo collects stages per company (case-insensitive merge, notes-only companies still listed).
- `npm run build` green.
Deployed: no

## Cycle 65 — 03:44 IST
- Deadline snooze: new `snoozeDeadline(id, days)` store action (pure date-string math, prerender-safe; logs activity); Deadlines page rows now have +1d / +1w buttons next to the calendar-download button. Also fixed a build-breaking pre-existing bug this run surfaced: /templates read `new Date()` during render, which Next 16's prerender rejects — gated behind the client-clock pattern (`today` resolved in useEffect).
- `npm run build` green.
Deployed: no

## Cycle 66 — 03:44 IST
- Interview round countdown chip in ApplicationDetail rounds: "Starting now" / "in 45 min" / "Today at 2:30 PM" / "Tomorrow at 10:00 AM" / "in 5 days" / "Passed", computed with a client-only clock (Next 16 prerender-safe pattern), sky-tone chip next to the scheduled time, muted for passed rounds.
- `npm run build` green.
Deployed: no

## Cycle 67 — 03:44 IST
- `g`-then-key page navigation shortcuts (g d = dashboard, g p = pipeline, g a = applications, g t = deadlines, g r = weekly review) via next router, with a 1.2s pending window and Escape to cancel; all five added to the `?` shortcuts help dialog.
- `npm run build` green.
Deployed: no

## Cycle 68 — 04:15 IST
- Four-axis fit score (researched: Huntr's four-way match — Qualifications 40% / Responsibilities 30% / Keywords 20% / Job Title 10%): new `FitScore` type + `fitScoreTotal()` in lib/types, persisted per application; detail page gets a "Fit score" card with four sliders (0–100, step 5), weighted total with honest Weak (<50) / Fair / Strong labels, saved via `updateApplication`.
- `npm run build` green.
Deployed: no

## Cycle 69 — 04:28 IST
- Contact follow-up dates (researched: Teal sets follow-up dates for contacts — hiring is about people): optional `followUpAt` on `Contact`, `setContactFollowUp` store action, per-contact date input in the detail page Contacts card; the Contacts page sorts follow-up-pending people first and shows amber "Follow up by …" / rose "Follow-up overdue" chips computed from a client-only clock (Next 16 prerender-safe).
- `npm run build` green.
Deployed: no

## Cycle 70 — 04:45 IST
- Search loops (researched: organize the search into "Loops"/campaigns): optional `loop` field on Application (carried by duplicate/re-apply, migration-safe); add-application modal and detail form both have a loop input with datalist suggestions from existing loops; Applications page gains loop filter chips (⟳) that combine with the other filters and reset with Clear all; dashboard shows a "Search loops" section with per-loop active/total counts and stage-presence dots.
- `npm run build` green.
Deployed: no

## Cycle 71 — 04:52 IST
- Weekly goal streak (researched: visual progress/motivation keeps the search going): the "This week's goal" card now computes consecutive completed Mon–Sun weeks that hit the current target (counting applications created inside each week, capped at 2 years of history) and shows a 🔥 "N-week streak" badge when streak > 0.
- `npm run build` green.
Deployed: no

## Cycle 72 — 05:05 IST
- Templates: pick the recipient — when filling from an application with contacts, a "Recipient" selector chooses which contact's name resolves [Recruiter name] / [Hiring team / Recruiter name] (previously always the first); plus a new "Warm check-in with a contact" template for keeping a recruiter warm between updates.
- `npm run build` green.
Deployed: no

## Cycle 73 — 05:18 IST
- Analytics: "Response time by source" — median days from applied → first response (assessment/interview/offer) per channel, needs 2+ responded applications per source; emerald ≤7d, amber ≤14d, rose slower, with counts. Sits next to the existing "Response rate by source" so channels are judged on both rate and speed.
- `npm run build` green.
Deployed: no

## Cycle 74 — 05:30 IST
- Interview round debriefs (researched: post-interview reflection tools): `debrief {rating 1–5, wentWell, improve}` on InterviewRound, persisted via `updateInterviewRound`; passed rounds (countdown "Passed") show an "Add debrief" prompt, an inline editor with a star rating (reuses InterestStars) plus "What went well" / "What to improve" fields, and saved debriefs render in an emerald callout on the round.
- `npm run build` green.
Deployed: no

## Cycle 75 — 05:44 IST
- CSV import (data portability, round-trips with the existing CSV export): new `importApplications` store action (appends rows with fresh ids, one activity entry, returns count), a quote-aware CSV parser in Settings, column mapping for all export fields (stage/work-mode/outcome validated, tags split on ";", createdAt preserved), duplicate detection on company+role with a skipped-count in the flash message.
- `npm run build` green.
Deployed: no

## Cycle 76 — 05:56 IST
- /prep "Lessons learned" section: aggregates every interview round debrief (rating stars, went-well, improve) across all applications, grouped per company, in the prep sidebar — closing the reflection loop so each interview improves the next.
- `npm run build` green.
Deployed: no

## Cycle 77 — 06:08 IST
- Interview one-pager now prints saved round debriefs (rating stars + went-well/improve lines under each round); the application detail header shows a "Fit N" chip (emerald/amber/rose by band) once a fit score is saved, with a tooltip explaining the weighting.
- `npm run build` green.
Deployed: no

## Cycle 78 — 04:47 IST
- Resume vault: attach the actual file — `fileData` (data URL) + `fileSize` on ResumeVersion (migration-safe optional fields); file picker (pdf/doc/docx/txt/rtf) with a 1.5 MB guard so localStorage stays fast, auto-fills the file name; card gets a ⬇ Download button; attached file can be removed/replaced in edit mode. Store addResume signature widened.
- `npm run build` green.
Deployed: no

## Cycle 79 — 04:47 IST
- Saved filter views on Applications page: new `SavedView` type + `savedViews` on StoreShape (migration-defaulted like starStories, seed/settings literals updated); "Views" row with one-click apply chips (active view highlighted when filters match), × delete, and "+ Save current" inline namer (Enter to save, Esc to cancel); page's SortKey unified to shared `AppSortKey` type; Clear-all reused through one `clearFilters` helper.
- `npm run build` green.
Deployed: no

## Cycle 80 — 04:47 IST
- Mock interview timer on /prep: new `MockTimer` component in the sidebar — 5/10/15/30-min presets, start/pause/resume/reset, progress bar, "Time's up" announce via the a11y live announcer; countdown via state + interval (Next 16 prerender-safe, no clock reads during render).
- `npm run build` green.
Deployed: no

## Cycle 81 — 04:59 IST
- Offer comparison breakdown (researched: JobHunt Pro compares base/bonus/signing/equity side by side): new optional `CompBreakdown {base, bonus, signing, equity}` on Application (migration-safe); offer-stage detail page gains a "Comp breakdown" editor card with live estimated-total (parseCtcMonthly sum); /offers shows Base/Bonus/Signing/Equity columns only when at least one offer has a breakdown, each with its own per-column "Best" badge, plus a footer note.
- `npm run build` green.
Deployed: no

## Cycle 82 — 05:01 IST
- JD keyword auto-extraction (researched: Huntr pulls keywords straight out of the JD): `extractJdKeywords` in lib/utils — curated 100+ skill-phrase matcher (word-boundary, count-ranked) + stopword-filtered frequent unigrams, all local; "JD match" card gains a collapsible "Extract keywords from the full job posting" panel with a JD textarea, toggleable suggestion chips with mention counts, and one-click merge into the keyword list (deduplicated).
- `npm run build` green.
Deployed: no

## Cycle 83 — 05:02 IST
- Company rating + industry tag (researched: JobHunt Pro company profiles — "industry tags, your rating"): optional `rating` (1–5, click-again-to-clear, radiogroup accessible) and `industry` on CompanyNote, editable at the top of the company detail; the Companies list shows the star rating and industry under each name.
- `npm run build` green.
Deployed: no

## Cycle 84 — 05:04 IST
- Assessment score log (researched: skills-assessment logging — platform/subject/score): new optional `Assessment[]` on Application (migration-safe); detail page shows an "Assessments" card for assessment/interview stages (or when entries exist) with add/delete, announced via the a11y live region.
- `npm run build` green.
Deployed: no

## Cycle 85 — 05:05 IST
- Negotiation prep (researched: salary-negotiation talking points anchored in quantified achievements): optional `negotiationNotes` on Application; offer-stage detail gains a "Negotiation prep" card with a notes field (ask, market range, non-salary levers) plus "Suggested anchors" surfacing your latest STAR stories as evidence for the ask.
- `npm run build` green.
Deployed: no

## Cycle 86 — 05:06 IST
- Contact "how we met" (researched: JobHunt Pro My Network — "track how you met"): optional `metHow` on Contact with a new `setContactMetHow` store action; inline "Met via" input on each contact in the detail page (saves on change); Contacts page shows a "Met via …" chip and includes it in search.
- `npm run build` green.
Deployed: no

## Cycle 87 — 05:07 IST
- Dashboard Offers: decision-deadline urgency — waiting offers with a deadline now show "Decide by …" inline (amber-bold when ≤3 days or overdue, row highlighted), so an offer never silently expires.
- `npm run build` green.
Deployed: no

## Cycle 88 — 05:08 IST
- "Questions to ask them" bank on /prep (researched: candidates who ask sharp questions get remembered): 12 curated interviewer questions in 4 groups (role, team, growth, company) with one-click copy buttons — no schema change, sidebar companion to the existing question bank.
- `npm run build` green.
Deployed: no

## Cycle 89 — 05:09 IST
- Storage usage meter in Settings (local-first pattern — resume file uploads live in localStorage as data URLs): client-side byte count of the PlaceTrack key with a progress bar vs the ~5 MB quota, amber/rose thresholds, and a nudge to export a backup + trim large attachments when nearly full. Prerender-safe.
- `npm run build` green.
Deployed: no

## Cycle 90 — 05:10 IST
- CSV portability round-trip for the new fields: export gains Loop, Interest, Referred by, Comp base/bonus/signing/equity, Negotiation notes columns; the quote-aware CSV import maps them back (validated: interest 1–5, compBreakdown reconstructed only when any part present).
- `npm run build` green.
Deployed: no
