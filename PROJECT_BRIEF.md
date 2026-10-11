# PROJECT BRIEF — surprise build (do not reveal to the user until morning)

## What
**PlaceTrack** — a placement & internship application tracker for students.
A "huge", genuinely useful web app: the mission-control for a student's entire
job hunt, from wishlist to offer letter.

## Why this
The user (3rd-year CSE student) is actively applying for internships and
placements right now (Internshala, Naukri, Unstop, TCS CodeVita season).
This solves a real, painful problem: applications scattered across mail,
spreadsheets and memory, deadlines missed.

## Feature scope (build toward all of these, in priority order)
1. **Dashboard** — stats row (applied, assessments, interviews, offers,
   response rate), upcoming deadlines list, recent activity feed.
2. **Pipeline board** — kanban with stages: Wishlist → Applied →
   Online Assessment → Interview → Offer, plus Rejected. Drag or
   move cards between stages.
3. **Application detail** — company, role, CTC/stipend, location, work
   mode, job description, application link, deadline with countdown,
   notes, contacts, resume version used.
4. **Deadlines & reminders** — calendar/list view of upcoming deadlines,
   overdue highlighting.
5. **Company research notes** — per-company notes (about, interview
   process, questions asked).
6. **Resume vault** — track resume versions, link a version to each
   application.
7. **Interview prep** — per-application checklist + question bank.
8. **Analytics** — funnel conversion, applications per week, response
   rate trends. Simple CSS/SVG charts (no heavy chart lib if avoidable).
9. **Search, filter, sort** across everything.
10. **Data portability** — export/import JSON, seed with realistic sample
    data on first run (clearly removable).
11. Polish: empty states, loading states, confirmations for destructive
    actions, keyboard-friendly, mobile responsive, accessibility basics.

## Persistence
localStorage (no backend). Namespaced key, versioned schema.

## UI rules (the user judges hard on this)
- Neat, clean, professional, human-designed. Restrained professional
  palette (think Linear/Notion-like: neutrals + ONE accent color).
- Minimal animation: subtle transitions only, respect
  prefers-reduced-motion.
- NO gradient-heavy purple/blue "AI slop". Solid colors.
- Generous whitespace, consistent spacing scale, clean typography
  (system font stack is fine).
- Light theme. Dense but breathable — information-rich like a pro SaaS.

## Stack
Next.js (App Router) + TypeScript + Tailwind CSS. No backend.
`npm run build` must stay green at the end of every cycle.

## Working rules for cycle agents
- Work ONLY in ~/workspace/surprise-project-2/. LOCAL ONLY.
- NEVER: git push, vercel deploy, create GitHub repos, or message the user.
  No approvals will arrive overnight — do not attempt anything that needs one.
- One cycle = ONE focused improvement (feature, polish, or fix):
  implement it, then verify with `npm run build` (must pass).
- Append every cycle to CYCLES.md (number, time IST, what changed,
  build status). Continue numbering from the last entry.
- NEVER stop early. Even if the app feels "complete", keep improving:
  edge cases, empty states, accessibility, mobile layout, microcopy,
  performance, analytics depth. The user explicitly said: do not stop
  the cycles on your own.
- Keep this project a surprise: no user-visible messages.
