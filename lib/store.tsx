"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STAGES } from "./types";
import type {
  ActivityEvent,
  Application,
  Attachment,
  CompanyNote,
  InterviewRound,
  OfferOutcome,
  PrepItem,
  ResumeVersion,
  SavedView,
  Stage,
  StageChange,
  StarStory,
  StoreShape,
} from "./types";

const STORAGE_KEY = "placetrack.v1";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function isoDaysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local "YYYY-MM-DDTHH:mm" datetime N days ahead at a given hour/minute (for seed rounds). */
function isoDatetimeDaysAhead(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function emptyShape(): StoreShape {
  return {
    version: 3,
    applications: [],
    resumes: [],
    companyNotes: [],
    prepItems: [],
    starStories: [],
    activity: [],
    savedViews: [],
  };
}

/** Realistic sample data so the app feels alive on first run. Removable via "Reset sample data". */
function seed(): StoreShape {
  const applications: Application[] = [
    {
      id: "seed_tcs",
      source: "T&P Cell",
      tags: [],
      company: "TCS",
      role: "Ninja Developer",
      stage: "applied",
      ctc: "7 LPA",
      location: "Chennai",
      workMode: "onsite",
      deadline: isoDaysAhead(7),
      nextAction: "Check mail for interview slot",
      nextActionDate: isoDaysAhead(4),
      notes: "Applied through NQT. Waiting for interview slot mail.",
      contacts: [],
      createdAt: isoDaysAgo(12),
      updatedAt: isoDaysAgo(2),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(20) },
        { stage: "applied", at: isoDaysAgo(12) },
      ],
    },
    {
      id: "seed_infosys",
      source: "T&P Cell",
      tags: [],
      company: "Infosys",
      role: "System Engineer",
      stage: "assessment",
      ctc: "9.5 LPA",
      location: "Mysuru",
      workMode: "onsite",
      deadline: isoDaysAhead(3),
      nextAction: "Mail T&P cell for the assessment slot",
      nextActionDate: isoDaysAhead(2),
      notes: "InfyTQ certification round cleared. Technical assessment next.",
      contacts: [{ name: "Campus T&P Cell", detail: "Shared the assessment link" }],
      referredBy: "A senior from the 2023 batch",
      createdAt: isoDaysAgo(15),
      updatedAt: isoDaysAgo(1),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(25) },
        { stage: "applied", at: isoDaysAgo(15) },
        { stage: "assessment", at: isoDaysAgo(4) },
      ],
    },
    {
      id: "seed_amazon",
      source: "Internshala",
      tags: ["High Priority"],
      company: "Amazon",
      role: "SDE Intern (Summer 2027)",
      stage: "assessment",
      ctc: "₹80,000/mo",
      interest: 4,
      location: "Bengaluru",
      workMode: "hybrid",
      link: "https://www.amazon.jobs",
      deadline: isoDaysAhead(1),
      nextAction: "Attempt the online assessment",
      nextActionDate: isoDaysAhead(1),
      notes: "OA has 2 DSA questions + work simulation. Practice LP/OOAD.",
      contacts: [],
      attachments: [
        { id: "seed_att_amazon_1", label: "OA practice portal", url: "https://www.amazon.jobs/content/en/how-we-hire/assessments" },
      ],
      createdAt: isoDaysAgo(9),
      updatedAt: isoDaysAgo(1),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(30) },
        { stage: "applied", at: isoDaysAgo(9) },
        { stage: "assessment", at: isoDaysAgo(2) },
      ],
    },
    {
      id: "seed_zoho",
      source: "Unstop",
      tags: [],
      company: "Zoho",
      role: "Software Developer",
      stage: "interview",
      ctc: "8.4 LPA",
      location: "Chennai",
      workMode: "onsite",
      deadline: isoDaysAhead(9),
      notes: "Cleared programming round. HR + technical interview scheduled.",
      resumeId: "seed_resume_v3",
      contacts: [{ name: "Zoho HR", detail: "Call scheduled — check mail for link" }],
      interviews: [
        {
          id: "seed_round_zoho_1",
          label: "Technical HR round",
          at: isoDatetimeDaysAhead(2, 10, 30),
          interviewer: "Zoho HR",
          notes: "DSA + project deep-dive. Bring internship certs.",
        },
      ],
      createdAt: isoDaysAgo(22),
      updatedAt: isoDaysAgo(0),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(35) },
        { stage: "applied", at: isoDaysAgo(22) },
        { stage: "assessment", at: isoDaysAgo(10) },
        { stage: "interview", at: isoDaysAgo(1) },
      ],
    },
    {
      id: "seed_flipkart",
      source: "Referral",
      tags: ["Referral"],
      company: "Flipkart",
      role: "SDE Intern",
      stage: "interview",
      ctc: "₹1,00,000/mo",
      location: "Bengaluru",
      workMode: "hybrid",
      deadline: isoDaysAhead(14),
      notes: "Referral from senior. Round 1: DSA + project deep-dive.",
      resumeId: "seed_resume_v3",
      contacts: [],
      interviews: [
        {
          id: "seed_round_flipkart_1",
          label: "Round 1 — DSA + projects",
          at: isoDatetimeDaysAhead(4, 14, 0),
          link: "https://meet.google.com",
          notes: "2 DSA mediums + FixMyCampus walkthrough.",
        },
      ],
      createdAt: isoDaysAgo(11),
      updatedAt: isoDaysAgo(3),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(28) },
        { stage: "applied", at: isoDaysAgo(11) },
        { stage: "assessment", at: isoDaysAgo(6) },
        { stage: "interview", at: isoDaysAgo(3) },
      ],
    },
    {
      id: "seed_cognizant",
      source: "T&P Cell",
      tags: ["Backup"],
      company: "Cognizant",
      role: "GenC Developer",
      stage: "offer",
      ctc: "4 LPA",
      interest: 2,
      location: "Chennai",
      workMode: "onsite",
      notes: "Offer letter received. Keep as backup while aiming higher.",
      contacts: [],
      createdAt: isoDaysAgo(40),
      updatedAt: isoDaysAgo(5),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(60) },
        { stage: "applied", at: isoDaysAgo(40) },
        { stage: "assessment", at: isoDaysAgo(28) },
        { stage: "interview", at: isoDaysAgo(15) },
        { stage: "offer", at: isoDaysAgo(5) },
      ],
    },
    {
      id: "seed_accenture",
      source: "Company site",
      tags: [],
      company: "Accenture",
      role: "Associate Software Engineer",
      stage: "applied",
      ctc: "4.5 LPA",
      location: "Chennai",
      workMode: "onsite",
      deadline: isoDaysAgo(2), // overdue — intentional, to demo overdue highlighting
      notes: "Deadline slipped — check if the portal still accepts applications.",
      contacts: [],
      createdAt: isoDaysAgo(18),
      updatedAt: isoDaysAgo(6),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(32) },
        { stage: "applied", at: isoDaysAgo(18) },
      ],
    },
    {
      id: "seed_wipro",
      source: "T&P Cell",
      tags: [],
      company: "Wipro",
      role: "Project Engineer",
      stage: "rejected",
      ctc: "3.5 LPA",
      location: "Hyderabad",
      workMode: "onsite",
      notes: "Rejected after HR round. Asked to reapply in 6 months.",
      contacts: [],
      createdAt: isoDaysAgo(45),
      updatedAt: isoDaysAgo(12),
      stageHistory: [
        { stage: "wishlist", at: isoDaysAgo(70) },
        { stage: "applied", at: isoDaysAgo(45) },
        { stage: "assessment", at: isoDaysAgo(30) },
        { stage: "rejected", at: isoDaysAgo(12) },
      ],
    },
    {
      id: "seed_freshworks",
      source: "Internshala",
      tags: [],
      company: "Freshworks",
      role: "SDE Intern",
      stage: "wishlist",
      ctc: "₹60,000/mo",
      interest: 4,
      location: "Chennai",
      workMode: "hybrid",
      deadline: isoDaysAhead(25),
      notes: "Crack-issue: applications open soon. Prep React + DSA.",
      contacts: [],
      createdAt: isoDaysAgo(3),
      updatedAt: isoDaysAgo(3),
      stageHistory: [{ stage: "wishlist", at: isoDaysAgo(3) }],
    },
    {
      id: "seed_atlassian",
      source: "Naukri",
      tags: ["Dream"],
      company: "Atlassian",
      role: "Backend Intern",
      stage: "wishlist",
      ctc: "₹1,00,000/mo",
      interest: 5,
      location: "Bengaluru",
      workMode: "remote",
      deadline: isoDaysAhead(20),
      notes: "Dream company. Need strong system-design basics even for intern loop.",
      contacts: [],
      createdAt: isoDaysAgo(5),
      updatedAt: isoDaysAgo(5),
      stageHistory: [{ stage: "wishlist", at: isoDaysAgo(5) }],
    },
  ];

  return {
    version: 3,
    applications,
    resumes: [
      {
        id: "seed_resume_v3",
        name: "Resume v3 — SDE focused",
        isDefault: true,
        fileName: "rohan_resume_v3.pdf",
        updatedAt: isoDaysAgo(6),
        notes: "Added FixMyCampus + internship projects. 1 page.",
      },
      {
        id: "seed_resume_v2",
        name: "Resume v2 — general",
        fileName: "rohan_resume_v2.pdf",
        updatedAt: isoDaysAgo(30),
        notes: "Older version, kept for reference.",
      },
    ],
    companyNotes: [
      {
        company: "Zoho",
        about: "Chennai-based SaaS. Known for deep programming rounds (C/Java) over DSA puzzles.",
        process: "Aptitude → Programming (5 problems) → Technical HR → General HR",
        questions: [
          "Reverse a linked list without extra space",
          "Design a parking lot (OOAD)",
          "Explain your FixMyCampus schema choices",
        ],
        updatedAt: isoDaysAgo(4),
      },
      {
        company: "TCS",
        about: "NQT is the common entry gate for Ninja/Digital roles.",
        process: "NQT (aptitude + coding) → Technical → Managerial → HR",
        questions: ["NQT coding: array rotation, string manipulation"],
        updatedAt: isoDaysAgo(8),
      },
    ],
    prepItems: [
      { id: "seed_prep_1", applicationId: "seed_zoho", label: "Revise OOP + OOAD parking-lot design", done: true },
      { id: "seed_prep_2", applicationId: "seed_zoho", label: "Prepare 2-minute intro + project walkthrough", done: true },
      { id: "seed_prep_3", applicationId: "seed_zoho", label: "Mock HR round with a friend", done: false },
      { id: "seed_prep_4", applicationId: "seed_amazon", label: "Finish 10 LP principle stories (STAR)", done: false },
      { id: "seed_prep_5", applicationId: "seed_amazon", label: "2 timed OA mocks", done: false },
    ],
    starStories: [
      {
        id: "seed_story_1",
        title: "Rebuilt the fest site under a 10-day deadline",
        situation: "Our college tech fest's registration site crashed two days after launch; the team maintaining it had graduated.",
        task: "As the new web lead, I had to get a stable replacement live before registrations closed in 10 days.",
        action: "Scoped the rebuild to the three flows that mattered, set up a shared component library so 6 volunteers could contribute without conflicts, and ran nightly deploys with a rollback checklist.",
        result: "Site went live in 8 days with zero downtime during the fest; 2,400+ registrations processed, and the team reused the component library the next year.",
        tags: ["Leadership", "Bias for action"],
        updatedAt: isoDaysAgo(12),
      },
      {
        id: "seed_story_2",
        title: "Fixed the flaky checkout flow",
        situation: "Users of my internship project's app were abandoning checkout; logs showed intermittent 500s from a race condition.",
        task: "Find and fix the root cause without breaking the release cadence.",
        action: "Reproduced it with a load script, traced it to an unindexed query plus unsynchronised inventory decrement, added the index, made the decrement transactional, and added a regression test.",
        result: "Checkout errors dropped 98% the following week; the fix shipped in the regular sprint with no hotfix needed.",
        tags: ["Ownership", "Ambiguity"],
        updatedAt: isoDaysAgo(20),
      },
    ],
    activity: [
      { id: "seed_act_1", at: isoDaysAgo(0), text: "Zoho moved to Interview", applicationId: "seed_zoho" },
      { id: "seed_act_2", at: isoDaysAgo(1), text: "Amazon OA deadline is tomorrow", applicationId: "seed_amazon" },
      { id: "seed_act_3", at: isoDaysAgo(1), text: "Infosys moved to Online Assessment", applicationId: "seed_infosys" },
      { id: "seed_act_4", at: isoDaysAgo(2), text: "Applied to TCS (Ninja Developer)", applicationId: "seed_tcs" },
      { id: "seed_act_5", at: isoDaysAgo(3), text: "Flipkart moved to Interview", applicationId: "seed_flipkart" },
      { id: "seed_act_6", at: isoDaysAgo(3), text: "Added Freshworks SDE Intern to wishlist", applicationId: "seed_freshworks" },
      { id: "seed_act_7", at: isoDaysAgo(5), text: "Received offer from Cognizant 🎉", applicationId: "seed_cognizant" },
    ],
    savedViews: [],
  };
}

interface StoreContextValue {
  data: StoreShape;
  loaded: boolean;
  addApplication: (
    input: Omit<
      Application,
      "id" | "createdAt" | "updatedAt" | "stageHistory" | "contacts" | "tags"
    > & {
      contacts?: Application["contacts"];
      tags?: Application["tags"];
    }
  ) => void;
  moveApplication: (id: string, stage: Stage) => void;
  /** Bulk-import applications (e.g. from a CSV): one activity entry, returns count added. */
  importApplications: (
    inputs: Array<Partial<Application> & { company: string; role: string; stage: Stage }>
  ) => number;
  /** Re-apply to a rejected role: clones the application as a fresh wishlist
   *  record (fields carried over, stage-specific state cleared). Returns the new id. */
  reapplyApplication: (id: string) => string | null;
  updateApplication: (id: string, patch: Partial<Application>) => void;
  duplicateApplication: (id: string) => string | null;
  deleteApplication: (id: string) => void;
  setOutcome: (id: string, outcome: OfferOutcome) => void;
  completeNextAction: (id: string) => void;
  /** Push an application's deadline forward by `days` (snooze), e.g. "remind me later". */
  snoozeDeadline: (id: string, days: number) => void;
  togglePrepItem: (id: string) => void;
  addContact: (applicationId: string, name: string, detail: string) => void;
  setContactFollowUp: (applicationId: string, index: number, date: string | undefined) => void;
  setContactMetHow: (applicationId: string, index: number, metHow: string | undefined) => void;
  removeContact: (applicationId: string, index: number) => void;
  addInterviewRound: (
    applicationId: string,
    input: Omit<InterviewRound, "id">
  ) => void;
  updateInterviewRound: (
    applicationId: string,
    roundId: string,
    patch: Partial<Omit<InterviewRound, "id">>
  ) => void;
  deleteInterviewRound: (applicationId: string, roundId: string) => void;
  addAttachment: (applicationId: string, label: string, url: string) => void;
  removeAttachment: (applicationId: string, attachmentId: string) => void;
  upsertCompanyNote: (company: string, patch: Partial<CompanyNote>) => void;
  addQuestion: (company: string, question: string) => void;
  deleteQuestion: (company: string, index: number) => void;
  addResume: (input: { name: string; fileName?: string; notes?: string; fileData?: string; fileSize?: number }) => void;
  updateResume: (id: string, patch: Partial<ResumeVersion>) => void;
  deleteResume: (id: string) => void;
  setDefaultResume: (id: string) => void;
  addSavedView: (name: string, filters: Omit<SavedView, "id" | "name">) => void;
  deleteSavedView: (id: string) => void;
  addPrepItem: (applicationId: string, label: string) => void;
  deletePrepItem: (id: string) => void;
  addStarStory: (input: { title: string; situation: string; task: string; action: string; result: string; tags: string[] }) => void;
  updateStarStory: (id: string, patch: Partial<StarStory>) => void;
  deleteStarStory: (id: string) => void;
  addActivity: (text: string, applicationId?: string) => void;
  resetToSeed: () => void;
  replaceAll: (shape: StoreShape) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function migrate(parsed: StoreShape): StoreShape {
  const v = (parsed as { version: number }).version;
  // Older saves lack `starStories` (added after v3) — default it before any version logic.
  // Same for `savedViews` (added after v3).
  const withStories: StoreShape = {
    ...parsed,
    starStories: (parsed as Partial<StoreShape>).starStories ?? [],
    savedViews: (parsed as Partial<StoreShape>).savedViews ?? [],
  };
  // v1 -> v2: applications gain a tags array
  if (v === 1) {
    const s2 = {
      ...withStories,
      version: 2 as const,
      applications: withStories.applications.map((a) => ({ ...a, tags: [] })),
    };
    // v2 -> v3: optional `source` ("applied via") field on applications
    return { ...s2, version: 3 as const };
  }
  if (v === 2) {
    return { ...withStories, version: 3 as const };
  }
  return withStories;
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as StoreShape;
    const v = (parsed as unknown as { version: unknown }).version;
    if ((v !== 1 && v !== 2 && v !== 3) || !Array.isArray(parsed.applications)) return seed();
    return migrate(parsed);
  } catch {
    return seed();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreShape>(emptyShape);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setData(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full / unavailable — app still works in memory
    }
  }, [data, loaded]);

  const pushActivity = useCallback(
    (draft: StoreShape, text: string, applicationId?: string): StoreShape => ({
      ...draft,
      activity: [
        { id: uid("act"), at: new Date().toISOString(), text, applicationId },
        ...draft.activity,
      ].slice(0, 100),
    }),
    []
  );

  const addApplication: StoreContextValue["addApplication"] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const app: Application = {
        ...input,
        contacts: input.contacts ?? [],
        tags: input.tags ?? [],
        id: uid("app"),
        createdAt: now,
        updatedAt: now,
        stageHistory: [{ stage: input.stage, at: now }],
      };
      setData((d) =>
        pushActivity(
          { ...d, applications: [app, ...d.applications] },
          `Added ${app.company} (${app.role}) to ${app.stage}`,
          app.id
        )
      );
    },
    [pushActivity]
  );

  /** Bulk-import applications (e.g. from a CSV): appends all rows, one
   *  activity entry. Returns the number added. */
  const importApplications: StoreContextValue["importApplications"] = useCallback(
    (inputs) => {
      const now = new Date().toISOString();
      const apps: Application[] = inputs.map((input) => {
        const stage = STAGES.includes(input.stage) ? input.stage : "wishlist";
        const createdAt = input.createdAt ?? now;
        return {
          ...input,
          contacts: input.contacts ?? [],
          tags: input.tags ?? [],
          id: uid("app"),
          createdAt,
          updatedAt: now,
          stage: stage,
          stageHistory: [{ stage, at: createdAt }],
        };
      });
      setData((d) =>
        pushActivity(
          { ...d, applications: [...apps, ...d.applications] },
          `Imported ${apps.length} application${apps.length === 1 ? "" : "s"} from CSV`
        )
      );
      return apps.length;
    },
    [pushActivity]
  );

  const reapplyApplication: StoreContextValue["reapplyApplication"] = useCallback(
    (id) => {
      const now = new Date().toISOString();
      let newId: string | null = null;
      setData((d) => {
        const src = d.applications.find((a) => a.id === id);
        if (!src) return d;
        newId = uid("app");
        const app: Application = {
          id: newId,
          company: src.company,
          role: src.role,
          stage: "wishlist",
          ctc: src.ctc,
          location: src.location,
          workMode: src.workMode,
          link: src.link,
          notes: src.notes,
          resumeId: src.resumeId,
          source: src.source,
          loop: src.loop,
          referredBy: src.referredBy,
          jdKeywords: src.jdKeywords,
          interest: src.interest,
          contacts: src.contacts.map((c) => ({ ...c })),
          tags: [...src.tags],
          attachments: src.attachments?.map((a) => ({ ...a })),
          // stage-specific state starts fresh
          outcome: undefined,
          rejectionReason: undefined,
          nextAction: undefined,
          nextActionDate: undefined,
          deadline: undefined,
          interviews: undefined,
          createdAt: now,
          updatedAt: now,
          stageHistory: [{ stage: "wishlist", at: now }],
        };
        return pushActivity(
          { ...d, applications: [app, ...d.applications] },
          `Re-applied to ${app.company} (${app.role}) — new attempt`,
          app.id
        );
      });
      return newId;
    },
    [pushActivity]
  );

  const moveApplication = useCallback(
    (id: string, stage: Stage) => {
      setData((d) => {
        const app = d.applications.find((a) => a.id === id);
        if (!app || app.stage === stage) return d;
        const now = new Date().toISOString();
        const updated: Application = {
          ...app,
          stage,
          updatedAt: now,
          stageHistory: [...app.stageHistory, { stage, at: now } as StageChange],
        };
        const next = {
          ...d,
          applications: d.applications.map((a) => (a.id === id ? updated : a)),
        };
        return pushActivity(
          next,
          `${app.company} moved to ${stage === "assessment" ? "Online Assessment" : stage[0].toUpperCase() + stage.slice(1)}`,
          id
        );
      });
    },
    [pushActivity]
  );

  const updateApplication = useCallback((id: string, patch: Partial<Application>) => {
    setData((d) => ({
      ...d,
      applications: d.applications.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
      ),
    }));
  }, []);

  /** Clone an application as a fresh wishlist record (new ID, history reset). */
  const duplicateApplication = useCallback(
    (id: string): string | null => {
      let newId: string | null = null;
      setData((d) => {
        const src = d.applications.find((a) => a.id === id);
        if (!src) return d;
        const now = new Date().toISOString();
        newId = uid("app");
        const app: Application = {
          ...src,
          id: newId,
          stage: "wishlist",
          outcome: undefined,
          rejectionReason: undefined,
          deadline: undefined,
          postedAt: undefined,
          nextAction: undefined,
          nextActionDate: undefined,
          interviews: undefined,
          createdAt: now,
          updatedAt: now,
          stageHistory: [{ stage: "wishlist", at: now }],
        };
        return pushActivity(
          { ...d, applications: [app, ...d.applications] },
          `Duplicated ${src.company} (${src.role}) as a new wishlist application`,
          app.id
        );
      });
      return newId;
    },
    [pushActivity]
  );

  const deleteApplication = useCallback(
    (id: string) => {
      setData((d) => {
        const app = d.applications.find((a) => a.id === id);
        if (!app) return d;
        const next = {
          ...d,
          applications: d.applications.filter((a) => a.id !== id),
          prepItems: d.prepItems.filter((p) => p.applicationId !== id),
        };
        return pushActivity(next, `Deleted ${app.company} (${app.role}) application`);
      });
    },
    [pushActivity]
  );

  /** Set the decision on an offer-stage application (waiting → accepted/declined). */
  const setOutcome = useCallback(
    (id: string, outcome: OfferOutcome) => {
      setData((d) => {
        const app = d.applications.find((a) => a.id === id);
        if (!app || app.outcome === outcome) return d;
        const next = {
          ...d,
          applications: d.applications.map((a) =>
            a.id === id ? { ...a, outcome, updatedAt: new Date().toISOString() } : a
          ),
        };
        if (outcome === "accepted") {
          return pushActivity(next, `Accepted offer from ${app.company} 🎉`, id);
        }
        if (outcome === "declined") {
          return pushActivity(next, `Declined offer from ${app.company}`, id);
        }
        return next;
      });
    },
    [pushActivity]
  );

  /** Complete the pending follow-up (next action) and record it in the activity feed. */
  const completeNextAction = useCallback(
    (id: string) => {
      setData((d) => {
        const app = d.applications.find((a) => a.id === id);
        if (!app || !app.nextAction) return d;
        const next = {
          ...d,
          applications: d.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  nextAction: undefined,
                  nextActionDate: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        };
        return pushActivity(
          next,
          `Completed follow-up "${app.nextAction}" for ${app.company}`,
          id
        );
      });
    },
    [pushActivity]
  );

  /**
   * Push an application's deadline forward by `days` (snooze it).
   * Pure date-string math — no clock reads, so it's prerender-safe.
   */
  const snoozeDeadline = useCallback(
    (id: string, days: number) => {
      setData((d) => {
        const app = d.applications.find((a) => a.id === id);
        if (!app || !app.deadline) return d;
        const [y, m, day] = app.deadline.split("-").map(Number);
        if (!y || !m || !day) return d;
        const shifted = new Date(y, m - 1, day + days);
        const iso = `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(shifted.getDate()).padStart(2, "0")}`;
        const next = {
          ...d,
          applications: d.applications.map((a) =>
            a.id === id
              ? { ...a, deadline: iso, updatedAt: new Date().toISOString() }
              : a
          ),
        };
        return pushActivity(
          next,
          `Snoozed ${app.company} deadline by ${days === 1 ? "a day" : `${days} days`}`,
          id
        );
      });
    },
    [pushActivity]
  );

  const togglePrepItem = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      prepItems: d.prepItems.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
    }));
  }, []);

  const addContact = useCallback((applicationId: string, name: string, detail: string) => {
    setData((d) => ({
      ...d,
      applications: d.applications.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              contacts: [...a.contacts, { name, detail }],
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    }));
  }, []);

  const addInterviewRound: StoreContextValue["addInterviewRound"] = useCallback(
    (applicationId, input) => {
      const round: InterviewRound = { ...input, id: uid("round") };
      setData((d) => {
        const app = d.applications.find((a) => a.id === applicationId);
        if (!app) return d;
        const next = {
          ...d,
          applications: d.applications.map((a) =>
            a.id === applicationId
              ? {
                  ...a,
                  interviews: [...(a.interviews ?? []), round],
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        };
        return pushActivity(
          next,
          `Scheduled interview round "${round.label}" for ${app.company}`,
          applicationId
        );
      });
    },
    [pushActivity]
  );

  const updateInterviewRound: StoreContextValue["updateInterviewRound"] = useCallback(
    (applicationId, roundId, patch) => {
      setData((d) => ({
        ...d,
        applications: d.applications.map((a) =>
          a.id === applicationId
            ? {
                ...a,
                interviews: (a.interviews ?? []).map((r) =>
                  r.id === roundId ? { ...r, ...patch } : r
                ),
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      }));
    },
    []
  );

  const deleteInterviewRound: StoreContextValue["deleteInterviewRound"] = useCallback(
    (applicationId, roundId) => {
      setData((d) => {
        const app = d.applications.find((a) => a.id === applicationId);
        const round = app?.interviews?.find((r) => r.id === roundId);
        if (!app || !round) return d;
        const next = {
          ...d,
          applications: d.applications.map((a) =>
            a.id === applicationId
              ? {
                  ...a,
                  interviews: (a.interviews ?? []).filter((r) => r.id !== roundId),
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        };
        return pushActivity(
          next,
          `Removed interview round "${round.label}" for ${app.company}`,
          applicationId
        );
      });
    },
    [pushActivity]
  );

  const addAttachment = useCallback(
    (applicationId: string, label: string, url: string) => {
      const attachment: Attachment = { id: uid("att"), label, url };
      setData((d) => {
        const app = d.applications.find((a) => a.id === applicationId);
        if (!app) return d;
        const next = {
          ...d,
          applications: d.applications.map((a) =>
            a.id === applicationId
              ? {
                  ...a,
                  attachments: [...(a.attachments ?? []), attachment],
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        };
        return pushActivity(
          next,
          `Added link "${label}" to ${app.company}`,
          applicationId
        );
      });
    },
    [pushActivity]
  );

  const removeAttachment = useCallback(
    (applicationId: string, attachmentId: string) => {
      setData((d) => {
        const app = d.applications.find((a) => a.id === applicationId);
        const att = app?.attachments?.find((x) => x.id === attachmentId);
        if (!app || !att) return d;
        const next = {
          ...d,
          applications: d.applications.map((a) =>
            a.id === applicationId
              ? {
                  ...a,
                  attachments: (a.attachments ?? []).filter((x) => x.id !== attachmentId),
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        };
        return pushActivity(
          next,
          `Removed link "${att.label}" from ${app.company}`,
          applicationId
        );
      });
    },
    [pushActivity]
  );

  const upsertCompanyNote = useCallback((company: string, patch: Partial<CompanyNote>) => {
    setData((d) => {
      const existing = d.companyNotes.find(
        (n) => n.company.toLowerCase() === company.toLowerCase()
      );
      const now = new Date().toISOString();
      if (existing) {
        return {
          ...d,
          companyNotes: d.companyNotes.map((n) =>
            n === existing ? { ...n, ...patch, updatedAt: now } : n
          ),
        };
      }
      const note: CompanyNote = {
        company,
        about: patch.about,
        process: patch.process,
        questions: patch.questions ?? [],
        updatedAt: now,
      };
      return { ...d, companyNotes: [...d.companyNotes, note] };
    });
  }, []);

  const addQuestion = useCallback((company: string, question: string) => {
    setData((d) => {
      const existing = d.companyNotes.find(
        (n) => n.company.toLowerCase() === company.toLowerCase()
      );
      const now = new Date().toISOString();
      if (existing) {
        return {
          ...d,
          companyNotes: d.companyNotes.map((n) =>
            n === existing
              ? { ...n, questions: [...n.questions, question], updatedAt: now }
              : n
          ),
        };
      }
      return {
        ...d,
        companyNotes: [
          ...d.companyNotes,
          { company, questions: [question], updatedAt: now },
        ],
      };
    });
  }, []);

  const addResume = useCallback((input: { name: string; fileName?: string; notes?: string; fileData?: string; fileSize?: number }) => {
    const now = new Date().toISOString();
    const resume: ResumeVersion = {
      id: uid("resume"),
      name: input.name,
      fileName: input.fileName,
      fileData: input.fileData,
      fileSize: input.fileSize,
      notes: input.notes,
      updatedAt: now,
    };
    setData((d) =>
      pushActivity(
        { ...d, resumes: [resume, ...d.resumes] },
        `Added resume "${resume.name}" to the vault`
      )
    );
  }, [pushActivity]);

  const updateResume = useCallback((id: string, patch: Partial<ResumeVersion>) => {
    setData((d) => ({
      ...d,
      resumes: d.resumes.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
      ),
    }));
  }, []);

  const deleteResume = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      resumes: d.resumes.filter((r) => r.id !== id),
      // Unlink from applications that used it
      applications: d.applications.map((a) =>
        a.resumeId === id ? { ...a, resumeId: undefined } : a
      ),
    }));
  }, []);

  const setDefaultResume = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      resumes: d.resumes.map((r) => ({ ...r, isDefault: r.id === id })),
    }));
  }, []);

  const addSavedView = useCallback(
    (name: string, filters: Omit<SavedView, "id" | "name">) => {
      const view: SavedView = { id: uid("view"), name: name.trim(), ...filters };
      setData((d) => ({ ...d, savedViews: [...d.savedViews, view] }));
    },
    []
  );

  const deleteSavedView = useCallback((id: string) => {
    setData((d) => ({ ...d, savedViews: d.savedViews.filter((v) => v.id !== id) }));
  }, []);

  const deleteQuestion = useCallback((company: string, index: number) => {
    setData((d) => ({
      ...d,
      companyNotes: d.companyNotes.map((n) =>
        n.company.toLowerCase() === company.toLowerCase()
          ? {
              ...n,
              questions: n.questions.filter((_, i) => i !== index),
              updatedAt: new Date().toISOString(),
            }
          : n
      ),
    }));
  }, []);

  const removeContact = useCallback((applicationId: string, index: number) => {
    setData((d) => ({
      ...d,
      applications: d.applications.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              contacts: a.contacts.filter((_, i) => i !== index),
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    }));
  }, []);

  /** Set (or clear) a contact's follow-up date — "nudge this person again by". */
  const setContactFollowUp = useCallback(
    (applicationId: string, index: number, date: string | undefined) => {
      setData((d) => ({
        ...d,
        applications: d.applications.map((a) =>
          a.id === applicationId
            ? {
                ...a,
                contacts: a.contacts.map((c, i) =>
                  i === index ? { ...c, followUpAt: date } : c
                ),
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      }));
    },
    []
  );

  /** Record how a contact was met — the "how you met" half of a network CRM. */
  const setContactMetHow = useCallback(
    (applicationId: string, index: number, metHow: string | undefined) => {
      setData((d) => ({
        ...d,
        applications: d.applications.map((a) =>
          a.id === applicationId
            ? {
                ...a,
                contacts: a.contacts.map((c, i) =>
                  i === index ? { ...c, metHow } : c
                ),
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      }));
    },
    []
  );

  const addPrepItem = useCallback(
    (applicationId: string, label: string) => {
      const item: PrepItem = { id: uid("prep"), applicationId, label, done: false };
      setData((d) => ({ ...d, prepItems: [...d.prepItems, item] }));
    },
    []
  );

  const deletePrepItem = useCallback((id: string) => {
    setData((d) => ({ ...d, prepItems: d.prepItems.filter((p) => p.id !== id) }));
  }, []);

  const addStarStory: StoreContextValue["addStarStory"] = useCallback((input) => {
    const story: StarStory = { ...input, id: uid("story"), updatedAt: new Date().toISOString() };
    setData((d) =>
      pushActivity({ ...d, starStories: [story, ...d.starStories] }, `Added STAR story “${story.title}”`)
    );
  }, [pushActivity]);

  const updateStarStory = useCallback((id: string, patch: Partial<StarStory>) => {
    setData((d) => ({
      ...d,
      starStories: d.starStories.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
      ),
    }));
  }, []);

  const deleteStarStory = useCallback((id: string) => {
    setData((d) => ({ ...d, starStories: d.starStories.filter((s) => s.id !== id) }));
  }, []);

  const addActivity = useCallback(
    (text: string, applicationId?: string) => {
      setData((d) => pushActivity(d, text, applicationId));
    },
    [pushActivity]
  );

  const resetToSeed = useCallback(() => {
    setData(seed());
  }, []);

  const replaceAll = useCallback((shape: StoreShape) => {
    setData(migrate(shape));
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      data,
      loaded,
      addApplication,
      importApplications,
      moveApplication,
      reapplyApplication,
      duplicateApplication,
      updateApplication,
      deleteApplication,
      setOutcome,
      togglePrepItem,
      completeNextAction,
      snoozeDeadline,
      addPrepItem,
      deletePrepItem,
      addStarStory,
      updateStarStory,
      deleteStarStory,
      addContact,
      setContactFollowUp,
      setContactMetHow,
      removeContact,
      addInterviewRound,
      updateInterviewRound,
      deleteInterviewRound,
      addAttachment,
      removeAttachment,
      upsertCompanyNote,
      addQuestion,
      deleteQuestion,
      addResume,
      updateResume,
      deleteResume,
      setDefaultResume,
      addSavedView,
      deleteSavedView,
      addActivity,
      resetToSeed,
      replaceAll,
    }),
    [
      data,
      loaded,
      addApplication,
      importApplications,
      moveApplication,
      reapplyApplication,
      duplicateApplication,
      updateApplication,
      deleteApplication,
      setOutcome,
      togglePrepItem,
      addPrepItem,
      deletePrepItem,
      addStarStory,
      updateStarStory,
      deleteStarStory,
      completeNextAction,
      snoozeDeadline,
      addContact,
      setContactFollowUp,
      setContactMetHow,
      removeContact,
      addInterviewRound,
      updateInterviewRound,
      deleteInterviewRound,
      addAttachment,
      removeAttachment,
      upsertCompanyNote,
      addQuestion,
      deleteQuestion,
      addResume,
      updateResume,
      deleteResume,
      setDefaultResume,
      addSavedView,
      deleteSavedView,
      addActivity,
      resetToSeed,
      replaceAll,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
