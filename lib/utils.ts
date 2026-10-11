// Small formatting helpers. Date-only strings ("YYYY-MM-DD") are parsed as LOCAL dates.

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function daysUntilDeadline(isoDate: string): number {
  const ms = parseLocalDate(isoDate).getTime() - startOfToday().getTime();
  return Math.round(ms / 86400000);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDeadline(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function deadlineLabel(isoDate: string): string {
  const n = daysUntilDeadline(isoDate);
  if (n < 0) return n === -1 ? "Overdue by 1 day" : `Overdue by ${-n} days`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `in ${n} days`;
}

export function isOverdue(isoDate: string): boolean {
  return daysUntilDeadline(isoDate) < 0;
}

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function todayHeading(): string {
  const n = new Date();
  return `${WEEKDAYS[n.getDay()]}, ${n.getDate()} ${MONTHS[n.getMonth()]}`;
}

/**
 * Best-effort CTC → monthly-INR parser for comparison.
 * "12 LPA" → 100000/mo · "₹80,000/mo" → 80000 · "60k/mo" → 60000.
 * Returns null when the string can't be parsed.
 */
export function parseCtcMonthly(ctc: string): number | null {
  const s = ctc.toLowerCase().replace(/₹/g, "").replace(/,/g, "").replace(/\s+/g, "");
  const lpa = s.match(/(\d+(?:\.\d+)?)lpa/);
  if (lpa) return Math.round((parseFloat(lpa[1]) * 100000) / 12);
  const k = s.match(/(\d+(?:\.\d+)?)k\//);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const monthly = s.match(/(\d+(?:\.\d+)?)\/(mo|month|mth)/);
  if (monthly) return Math.round(parseFloat(monthly[1]));
  const bare = s.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return Math.round(parseFloat(bare[1]));
  return null;
}

/** Human-readable monthly equivalent, e.g. "₹1.0L/mo". */
export function formatMonthly(inr: number): string {
  if (inr >= 100000) return `₹${(inr / 100000).toFixed(1)}L/mo`;
  if (inr >= 1000) return `₹${(inr / 1000).toFixed(0)}k/mo`;
  return `₹${inr}/mo`;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format a local "YYYY-MM-DDTHH:mm" datetime for display, e.g. "Tue 14 Oct, 10:30 AM".
 * Returns null when the string can't be parsed.
 */
export function formatDateTime(iso: string): string | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  if (isNaN(d.getTime())) return null;
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${mm} ${ampm}`;
}

/** Days (local, day-precision) until a "YYYY-MM-DDTHH:mm" datetime. Negative = past. */
export function daysUntilDatetime(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** ISO date (YYYY-MM-DD) for a local date `days` from now. */
export function isoDateIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Split pasted JD keywords/skills into a deduplicated list (newlines, commas, semicolons). */
export function parseKeywords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const t = raw.trim().replace(/\s+/g, " ");
    if (!t) continue;
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

/** Normalise text for fuzzy keyword matching: lowercased, punctuation → spaces. */
export function normForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Score JD keywords against a corpus of "your evidence" text: returns
 *  {matched, missing} lists. Multi-word phrases use word-boundary matching on
 *  the normalised corpus, so "React" matches "react js developer" but a bare
 *  "C" doesn't match every word containing the letter c. */
export function scoreKeywords(keywords: string[], corpus: string): { matched: string[]; missing: string[] } {
  const norm = normForMatch(corpus);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    const k = normForMatch(kw);
    const hit =
      k.length > 0 && new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(norm);
    (hit ? matched : missing).push(kw);
  }
  return { matched, missing };
}

/** Filler words stripped when auto-extracting JD keywords (English + job-posting boilerplate). */
const JD_STOPWORDS = new Set(
  (
    "a,an,the,and,or,but,if,then,else,when,while,of,at,by,for,with,about,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,don,should,now," +
    "you,your,we,our,they,their,he,she,it,its,this,that,these,those,who,whom,what,which,how,why,as,is,are,was,were,be,been,being,have,has,had,do,does,did,doing,would,could,ought,must,may,might,shall," +
    "work,team,teams,role,candidate,candidates,experience,years,year,skills,skill,ability,strong,good,looking,join,help,helps,using,use,used,uses,make,makes,new,including,etc,eg,per,day,month,location,india,bengaluru,chennai,hyderabad,mysuru,remote,onsite,hybrid,full,part,apply,please,must,should,across,within,between,various,related,plus,ensure,drive,deliver,support,maintain,develop,design,build,create,implement,collaborate,communicate,understanding,knowledge,familiarity,exposure,passion,passionate,opportunity,opportunities,growth,fast,paced,environment,culture,mission,vision,company,companies,product,products,services,clients,customers,requirements,solutions,technologies,technology,tools,processes,projects,degree,bachelor,master,engineering,computer,science,field,equivalent,preferred,bonus,great,excellent,ideal,proven,track,record,self,starter,motivated,detail,oriented,deadlines,ownership,mindset,stack,handson,hands"
  ).split(",")
);

/** Curated tech/skill phrases matched as whole phrases (not split into filler-prone words). */
const JD_SKILL_PHRASES = [
  "react", "react js", "reactjs", "next.js", "nextjs", "typescript", "javascript", "node js", "nodejs",
  "express", "html", "css", "tailwind", "redux", "graphql", "rest api", "restful", "python", "django",
  "flask", "fastapi", "java", "spring", "spring boot", "kotlin", "swift", "golang", "go lang", "rust",
  "sql", "nosql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "kafka", "rabbitmq",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "git", "github", "ci/cd",
  "cicd", "linux", "bash", "microservices", "system design", "data structures", "algorithms", "dsa",
  "oops", "dbms", "operating systems", "computer networks", "machine learning", "deep learning",
  "nlp", "computer vision", "llm", "genai", "prompt engineering", "pandas", "numpy", "scikit-learn",
  "tensorflow", "pytorch", "powerbi", "tableau", "excel", "sap", "salesforce", "figma", "jira",
  "agile", "scrum", "cybersecurity", "penetration testing", "blockchain", "iot", "embedded systems",
  "matlab", "solidworks", "autocad", "verilog", "vhdl", "selenium", "cypress", "playwright", "jest",
  "postman", "firebase", "supabase", "prisma", "django rest", "flutter", "react native", "android",
  "ios", "unity", "unreal engine", "opencv", "spark", "hadoop", "airflow", "dbt", "snowflake",
];

function countPhraseOccurrences(norm: string, phrase: string): number {
  const k = normForMatch(phrase);
  if (!k) return 0;
  const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  const m = norm.match(re);
  return m ? m.length : 0;
}

/** Display label for a skill phrase: prefer the longest original spelling that was matched. */
function skillDisplayLabel(norm: string): string {
  const byNorm = new Map<string, string>();
  for (const p of JD_SKILL_PHRASES) {
    const k = normForMatch(p);
    if (!byNorm.has(k) || p.length > byNorm.get(k)!.length) byNorm.set(k, p);
  }
  return byNorm.get(norm) ?? norm;
}

/**
 * Pull candidate keywords out of raw JD text (researched: Huntr "pulls keywords
 * out of the JD"). Curated skill phrases first, then frequent non-filler
 * unigrams — ranked by frequency, capped at `limit`. All local, no network.
 */
export function extractJdKeywords(text: string, limit = 25): { keyword: string; count: number }[] {
  const norm = normForMatch(text);
  if (!norm) return [];
  const counts = new Map<string, number>();
  for (const phrase of JD_SKILL_PHRASES) {
    const n = countPhraseOccurrences(norm, phrase);
    if (n > 0) {
      const k = normForMatch(phrase);
      counts.set(k, Math.max(counts.get(k) ?? 0, n));
    }
  }
  for (const word of norm.split(" ")) {
    if (word.length < 3 || word.length > 24 || JD_STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
    if (counts.has(word)) continue; // already covered by a skill phrase
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([k, count]) => ({ keyword: skillDisplayLabel(k), count }))
    .filter((e) => e.count >= 2 || JD_SKILL_PHRASES.some((p) => normForMatch(p) === normForMatch(e.keyword)))
    .sort((a, b) => b.count - a.count || b.keyword.length - a.keyword.length)
    .slice(0, limit);
}
