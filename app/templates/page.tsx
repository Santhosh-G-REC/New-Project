"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../lib/store";

interface Template {
  id: string;
  title: string;
  when: string;
  subject: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: "followup-applied",
    title: "Follow up after applying",
    when: "Sent 7–10 days after an application with no response.",
    subject: "Following up — [Role] application at [Company]",
    body: `Hi [Hiring team / Recruiter name],

I applied for the [Role] role at [Company] on [date] and wanted to check if there is any update on my application.

I'm excited about this role because [one line on why — a project, the team's work, the product].

Happy to share anything else that would help with the review. Thank you for your time.

Best,
[Your name]`,
  },
  {
    id: "thankyou-interview",
    title: "Thank-you after an interview",
    when: "Send within 24 hours of the interview round.",
    subject: "Thank you — [Role] interview at [Company]",
    body: `Hi [Interviewer name],

Thank you for speaking with me today about the [Role] role. I really enjoyed our conversation, especially [one specific thing discussed — a problem, the team's roadmap, a tech choice].

It made me even more excited about [Company]. Please let me know if there's anything else I can share.

Best regards,
[Your name]`,
  },
  {
    id: "status-inquiry",
    title: "Status inquiry after silence",
    when: "A stage has gone quiet for 2+ weeks.",
    subject: "Checking in — [Role] at [Company]",
    body: `Hi [Recruiter name],

I hope you're well. I'm writing to check on the status of my application for the [Role] role — we last spoke on [date / stage].

I'm still very interested in [Company] and would love to know if there are any next steps, or a timeline I should expect.

Thank you,
[Your name]`,
  },
  {
    id: "offer-accept",
    title: "Accepting an offer",
    when: "Keep it warm, confirm the details in writing.",
    subject: "Accepting the [Role] offer — [Your name]",
    body: `Hi [Recruiter name],

Thank you for the offer for the [Role] position at [Company]. I'm delighted to accept.

Could you please share the formal offer letter with the joining date, compensation break-up, and any documents you need from me?

Looking forward to joining the team.

Best,
[Your name]`,
  },
  {
    id: "contact-checkin",
    title: "Warm check-in with a contact",
    when: "Keeping a recruiter or referrer warm between updates.",
    subject: "Quick hello — [Role] at [Company]",
    body: `Hi [Recruiter name],

Just a quick note to say I'm still very keen on the [Role] opportunity at [Company]. Happy to jump on a call or share anything that would help move things forward.

Thanks again for your time — I really appreciate it.

Best,
[Your name]`,
  },
  {
    id: "referral-ask",
    title: "Asking for a referral",
    when: "To a senior, alum, or contact at the company.",
    subject: "Referral request — [Role] at [Company]",
    body: `Hi [Name],

I hope you're doing well. I noticed [Company] is hiring for [Role], and given my experience in [your 1-line pitch], I believe I'd be a strong fit.

Would you be open to referring me? I've attached my resume and the job link is here: [link].

No worries at all if you're not comfortable — I completely understand. Thanks either way.

Best,
[Your name]`,
  },
];

function fill(text: string, fields: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(fields)) {
    out = out.split(`[${k}]`).join(v.trim() || `[${k}]`);
  }
  return out;
}

function TemplateCard({
  t,
  fields,
}: {
  t: Template;
  fields: Record<string, string>;
}) {
  const [copied, setCopied] = useState(false);
  const rendered = useMemo(
    () => `Subject: ${fill(t.subject, fields)}\n\n${fill(t.body, fields)}`,
    [t, fields]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rendered);
    } catch {
      // clipboard unavailable — select the text instead
      const el = document.getElementById(`tpl-${t.id}`);
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{t.title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{t.when}</p>
        </div>
        <button
          onClick={copy}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre
        id={`tpl-${t.id}`}
        className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 font-sans text-sm leading-relaxed text-zinc-700"
      >
        {rendered}
      </pre>
    </section>
  );
}

export default function Templates() {
  const { data, loaded } = useStore();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [appId, setAppId] = useState("");
  const [contactIdx, setContactIdx] = useState(0);

  const selectedApp = useMemo(
    () => data.applications.find((a) => a.id === appId),
    [data.applications, appId]
  );

  // Client-only clock: Next 16 prerender must never read the current time.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    );
  }, []);

  const contactName = selectedApp?.contacts[contactIdx]?.name ?? selectedApp?.contacts[0]?.name ?? "";

  const fields = useMemo(() => {
    const app = selectedApp;
    return {
      "Your name": name,
      Company: app ? app.company : company,
      Role: app ? app.role : role,
      date: today ?? "",
      link: app?.link ?? "",
      "Recruiter name": contactName,
      "Interviewer name": "",
      "Hiring team / Recruiter name": contactName,
    };
  }, [name, company, role, selectedApp, contactName, today]);

  const inputCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Email templates</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Follow-ups and thank-yous that don&apos;t sound like templates. Fill in the fields once — every template updates.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Your name</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohan V" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Company</span>
          <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Zoho" disabled={!!appId} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Role</span>
          <input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Developer" disabled={!!appId} />
        </label>
      </div>

      {loaded && data.applications.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="tpl-app" className="text-xs font-medium text-zinc-600">
            Or fill from an application:
          </label>
          <select
            id="tpl-app"
            className="max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
            value={appId}
            onChange={(e) => {
              setAppId(e.target.value);
              setContactIdx(0);
            }}
          >
            <option value="">Manual entry</option>
            {data.applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.company} — {a.role}
              </option>
            ))}
          </select>
          {selectedApp && selectedApp.contacts.length > 0 && (
            <>
              <label htmlFor="tpl-contact" className="text-xs font-medium text-zinc-600">
                Recipient:
              </label>
              <select
                id="tpl-contact"
                className="max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
                value={contactIdx}
                onChange={(e) => setContactIdx(parseInt(e.target.value, 10))}
              >
                {selectedApp.contacts.map((c, i) => (
                  <option key={i} value={i}>
                    {c.name}
                    {c.detail ? ` — ${c.detail}` : ""}
                  </option>
                ))}
              </select>
            </>
          )}
          <span className="text-xs text-zinc-400">
            Company, role, job link and recruiter name auto-fill; [date] always uses today.
          </span>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} t={t} fields={fields} />
        ))}
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Tip: always replace the bracketed prompts ([date], [Interviewer name], [one line on why]) before sending — that&apos;s what makes it not sound like a template.
      </p>
    </div>
  );
}
