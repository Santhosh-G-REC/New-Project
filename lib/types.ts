// PlaceTrack domain types. Persistence: localStorage, namespaced + versioned (see lib/store.tsx).

export type Stage =
  | "wishlist"
  | "applied"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected";

export type WorkMode = "onsite" | "hybrid" | "remote";

export type OfferOutcome = "waiting" | "accepted" | "declined";

export const STAGES: Stage[] = [
  "wishlist",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
];

export const STAGE_META: Record<Stage, { label: string; dot: string }> = {
  wishlist: { label: "Wishlist", dot: "bg-zinc-400" },
  applied: { label: "Applied", dot: "bg-sky-600" },
  assessment: { label: "Online Assessment", dot: "bg-amber-500" },
  interview: { label: "Interview", dot: "bg-violet-600" },
  offer: { label: "Offer", dot: "bg-emerald-600" },
  rejected: { label: "Rejected", dot: "bg-rose-500" },
};

export interface StageChange {
  stage: Stage;
  at: string; // ISO timestamp
}

export interface Contact {
  name: string;
  detail: string;
  metHow?: string; // how you met them — "LinkedIn", "campus fair", "referral" (researched: network CRM)
  followUpAt?: string; // ISO date (YYYY-MM-DD) — "nudge this person again by" (Teal pattern)
}

export interface InterviewRound {
  id: string;
  label: string; // e.g. "Round 1 — Technical"
  at?: string; // ISO datetime ("YYYY-MM-DDTHH:mm", local) when the round is scheduled
  interviewer?: string;
  link?: string; // video meeting link
  notes?: string;
  /** Post-interview debrief (researched: post-interview tools — reflect while it's fresh). */
  debrief?: {
    rating: number; // 1–5 "how'd it go"
    wentWell?: string;
    improve?: string;
  };
}

/**
 * Self-assessed fit score, four axes (researched: Huntr's four-way match —
 * Qualifications, Responsibilities, Keywords, Job Title). Sliders the user
 * rates honestly before applying; the weighted number shows where the gap is.
 */
export interface FitScore {
  qualifications: number; // 0–100, weighted 40%
  responsibilities: number; // 0–100, weighted 30%
  keywords: number; // 0–100, weighted 20%
  title: number; // 0–100, weighted 10%
}

export function fitScoreTotal(f: FitScore): number {
  return Math.round(
    f.qualifications * 0.4 + f.responsibilities * 0.3 + f.keywords * 0.2 + f.title * 0.1
  );
}

export interface Attachment {
  id: string;
  label: string; // e.g. "Portfolio", "Offer letter PDF", "OA platform"
  url: string;
}

/** A scored online assessment (researched: skills-assessment logging —
 *  record the platform, subject and score/threshold for every OA). */
export interface Assessment {
  id: string;
  platform: string; // e.g. "HackerRank", "Mettl", "AMCAT"
  subject?: string; // e.g. "DSA — 3 problems", "Aptitude + English"
  score?: string; // free text: "245/300", "78%", "Cleared"
  at?: string; // ISO date (YYYY-MM-DD) when it was attempted
}

/**
 * Structured offer compensation breakdown (researched: JobHunt Pro's "compare
 * offers" — base/bonus/signing/equity side by side). Free text like the ctc
 * field ("8 LPA", "1 L") so pasting offer letters stays easy; the offers page
 * parses each field for the per-column "Best" badge.
 */
export interface CompBreakdown {
  base?: string;
  bonus?: string; // joining/annual bonus
  signing?: string; // signing bonus (one-time)
  equity?: string; // ESOPs/RSUs, annualised or stated as-is
}

export interface Application {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  ctc?: string; // e.g. "12 LPA" or "₹80,000/mo"
  compBreakdown?: CompBreakdown; // structured offer comp (offer stage) — compare base/bonus/signing/equity
  location?: string;
  workMode?: WorkMode;
  link?: string; // application / job posting URL
  deadline?: string; // ISO date (YYYY-MM-DD)
  postedAt?: string; // ISO date (YYYY-MM-DD) the job was posted — research says speed helps
  notes?: string;
  resumeId?: string;
  tailoredResume?: boolean; // the linked resume was tailored for this specific role
  fitScore?: FitScore; // self-assessed four-axis fit (researched: Huntr's four-way match)
  source?: string; // "applied via": Internshala, Naukri, Referral, T&P Cell, …
  loop?: string; // search loop / campaign: "Summer SDE intern 2027" (researched: organize search directions)
  outcome?: OfferOutcome; // decided on offer-stage applications; defaults to "waiting"
  negotiationNotes?: string; // offer-stage: anchors and talking points for salary negotiation
  rejectionReason?: string; // optional note captured when an application is rejected
  jdKeywords?: string; // JD keywords/skills pasted by the user, newline- or comma-separated
  referredBy?: string; // name of the person who referred you (research: referrals matter)
  interest?: number; // 1–5 "excitement level" (Teal pattern) — how much you want this role
  contacts: Contact[];
  tags: string[]; // free-form labels: "High Priority", "Referral", "Dream", …
  nextAction?: string; // free-text follow-up, e.g. "Send thank-you mail"
  nextActionDate?: string; // ISO date (YYYY-MM-DD) when the follow-up is due
  interviews?: InterviewRound[]; // scheduled interview rounds (optional, interview/assessment stage)
  assessments?: Assessment[]; // scored online assessments (researched: assessment logging)
  attachments?: Attachment[]; // saved links/documents: portfolio, offer letter PDF, OA platform, …
  createdAt: string;
  updatedAt: string;
  stageHistory: StageChange[];
}

export interface ResumeVersion {
  id: string;
  name: string; // e.g. "Resume v3 — SDE focused"
  fileName?: string;
  fileData?: string; // data URL of the uploaded file (kept under ~1.5MB so localStorage stays happy)
  fileSize?: number; // original file size in bytes
  updatedAt: string;
  notes?: string;
  isDefault?: boolean; // the version to reach for unless an application says otherwise
}

/** Sort order for the applications list. */
export type AppSortKey = "deadline" | "updated" | "added" | "company";

/** A named, reusable filter preset on the applications page. */
export interface SavedView {
  id: string;
  name: string;
  query: string;
  stages: Stage[];
  tag: string | null;
  referredOnly: boolean;
  loop: string | null;
  sort: AppSortKey;
}

export interface CompanyNote {
  company: string;
  about?: string;
  process?: string; // interview process notes
  questions: string[];
  rating?: number; // 1–5 "how excited am I about this company" (researched: company research profiles)
  industry?: string; // e.g. "Fintech", "SaaS", "E-commerce"
  updatedAt: string;
}

export interface PrepItem {
  id: string;
  applicationId: string;
  label: string;
  done: boolean;
}

/** A STAR interview story: Situation / Task / Action / Result, tagged by competency. */
export interface StarStory {
  id: string;
  title: string; // e.g. "Led the campus fest website team"
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[]; // competencies: "Leadership", "Conflict", "Ownership", …
  updatedAt: string;
}

/** Suggested STAR competency tags (researched: tag stories by competency). */
export const STAR_TAG_SUGGESTIONS = [
  "Leadership",
  "Ownership",
  "Conflict",
  "Failure",
  "Teamwork",
  "Ambiguity",
  "Bias for action",
  "Customer focus",
];

export interface ActivityEvent {
  id: string;
  at: string; // ISO timestamp
  text: string;
  applicationId?: string;
}

export interface StoreShape {
  version: 3;
  applications: Application[];
  resumes: ResumeVersion[];
  companyNotes: CompanyNote[];
  prepItems: PrepItem[];
  starStories: StarStory[];
  activity: ActivityEvent[];
  savedViews: SavedView[]; // named filter presets on the applications page
}

/** "Applied via" suggestions (Huntr pattern: track where applications came from). */
export const APPLICATION_SOURCES = [
  "Internshala",
  "Naukri",
  "Unstop",
  "Referral",
  "T&P Cell",
  "Company site",
  "Other",
];
