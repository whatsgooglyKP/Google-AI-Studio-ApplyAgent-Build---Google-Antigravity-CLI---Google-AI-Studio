// Apply Agent Worker: live job search + Workers AI tailoring, on Cloudflare's free plan.
// No API keys: the model is reached through the AI binding in wrangler.toml.

interface Env {
  AI: { run(model: string, input: unknown): Promise<any> };
  ASSETS: { fetch(req: Request): Promise<Response> };
  TAILOR_LIMIT?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  postedAgo: string;
  url: string;
  source: 'linkedin' | 'remotive' | 'themuse';
  sourceUrl?: string;
  description?: string;
}

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?kevinpinard\.studio$/, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// ---- Small in-memory cache. The Cache API does nothing on *.workers.dev, so this is
// per-isolate and best effort; it still keeps repeat searches off LinkedIn. ----
const memo = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  if (memo.size > 200) memo.delete(memo.keys().next().value as string);
  memo.set(key, { at: Date.now(), value });
  return value;
}

// ---- Helpers ported from server.ts ----

function cleanJobTitle(input: string): string {
  if (!input) return 'Business Analyst';
  const clean = input
    .replace(/\b(in|at|near|for|with)\s+[A-Za-z\s,]+/gi, '')
    .replace(/\b(remote|hybrid|full[\s-]time|part[\s-]time)\b/gi, '')
    .trim();
  return clean || input.trim() || 'Business Analyst';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function linkedInSearchUrl(title: string, company: string): string {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${title} ${company}`.trim())}`;
}

// ---- Scope: entry-level and internship roles in the United States ----

const DEFAULT_LOCATION = 'United States';
// LinkedIn's experience filter still lets some senior roles through, so titles are checked too.
const SENIOR_TITLE = /\b(senior|sr\.?|staff|lead|principal|manager|director|head|architect|vp|chief|distinguished|expert)\b|\b(ii|iii|iv)\b|\b(level|l)\s?[3-9]\b|\b[2-5]\b/i;
const isEntryLevelTitle = (title: string) => !SENIOR_TITLE.test(title);
// US locations look like "City, ST", "United States", or a remote label.
const isUsLocation = (loc: string) =>
  (/,\s*[A-Z]{2}\b/.test(loc) || /united states|\bUSA?\b|remote/i.test(loc)) && !/canada|mexico|india|united kingdom|\bUK\b|europe/i.test(loc);

// ---- LinkedIn guest endpoint (same parsing as fetchRealLinkedInGuestJobs in server.ts) ----

async function fetchLinkedInJobs(topic: string, location: string): Promise<Job[]> {
  const jobs: Job[] = [];
  // Each page has about 10 cards; after dropping senior titles, read up to 3 pages to fill the list.
  for (const start of [0, 10, 20]) {
    const params = new URLSearchParams({ keywords: topic, location, f_E: '1,2', start: String(start) }); // f_E 1=Internship, 2=Entry level
    const res = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`, {
      headers: BROWSER_HEADERS,
      redirect: 'manual', // a redirect here means a login wall
    });
    if (!res.ok) {
      if (start === 0) throw new Error(`LinkedIn HTTP ${res.status}`);
      break;
    }
    const before = jobs.length;
    parseLinkedInCards(await res.text(), jobs);
    if (jobs.length >= 15 || jobs.length === before) break;
  }
  return jobs;
}

function parseLinkedInCards(html: string, jobs: Job[]) {
  const cardRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRegex.exec(html)) !== null && jobs.length < 25) {
    const card = m[1];
    const id = (card.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/i) || card.match(/\/jobs\/view\/[^"?]*?-(\d{8,12})/i))?.[1] || '';
    const title = stripTags(card.match(/<h3[^>]*base-search-card__title[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || '');
    const company = stripTags(
      (card.match(/<h4[^>]*base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/i) || card.match(/<a[^>]*hidden-nested-link[^>]*>([\s\S]*?)<\/a>/i))?.[1] || ''
    );
    const loc = stripTags(card.match(/<span[^>]*job-search-card__location[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '');
    const posted = stripTags(card.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] || '');
    if (!title || !company || !id || !isEntryLevelTitle(title) || jobs.some((j) => j.id === `li-${id}`)) continue;
    jobs.push({
      id: `li-${id}`,
      title,
      company,
      location: loc || 'Not listed',
      postedAgo: posted || 'Recently',
      url: `https://www.linkedin.com/jobs/view/${id}`,
      source: 'linkedin',
    });
  }
}

async function fetchLinkedInDescription(numericId: string): Promise<string> {
  const res = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${numericId}`, { headers: BROWSER_HEADERS, redirect: 'manual' });
  if (!res.ok) throw new Error(`LinkedIn HTTP ${res.status}`);
  const html = await res.text();
  const body = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/i)?.[1];
  if (!body) throw new Error('No description in LinkedIn response');
  const criteria = [...html.matchAll(/description__job-criteria-subheader[^>]*>([\s\S]*?)<\/h3>[\s\S]*?description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((c) => `${stripTags(c[1])}: ${stripTags(c[2])}`)
    .join('\n');
  return `${htmlToText(body)}${criteria ? `\n\n${criteria}` : ''}`.slice(0, 6000);
}

// ---- Keyless fallback feeds. Both ask to be credited with a link back. ----

// True when the title contains the query's main words ("intern", "machine", "software"...); generic words don't count alone.
const GENERIC_WORDS = new Set(['engineer', 'developer', 'and', 'the']);
function titleMatches(topic: string, title: string): boolean {
  const words = topic.toLowerCase().split(/[\s/]+/).filter((w) => w.length > 1);
  const key = words.filter((w) => !GENERIC_WORDS.has(w));
  const t = title.toLowerCase();
  const has = (w: string) => new RegExp(`\\b${w.replace(/[^a-z0-9]/g, '')}`).test(t);
  return (key.length ? key : words).every((w) => w === 'ai' || w === 'ml' ? /\b(ai|ml|machine learning|artificial intelligence)\b/.test(t) : has(w));
}

async function fetchRemotiveJobs(topic: string): Promise<Job[]> {
  // The free feed currently ignores ?search and returns its newest jobs, so filter by title here.
  const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(topic)}`, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } });
  if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);
  const data: any = await res.json();
  return (data.jobs || [])
    .filter((j: any) => titleMatches(topic, String(j.title || '')) && isEntryLevelTitle(String(j.title || '')))
    .filter((j: any) => !/trainer|annotat|evaluator|freelance/i.test(String(j.title || ''))) // gig work, not entry-level jobs
    .filter((j: any) => /usa|united states|americas|worldwide|anywhere/i.test(String(j.candidate_required_location || '')))
    .slice(0, 20).map((j: any): Job => ({
    id: `rm-${j.id}`,
    title: String(j.title || ''),
    company: String(j.company_name || ''),
    location: `Remote · ${j.candidate_required_location || 'Anywhere'}`,
    postedAgo: String(j.publication_date || '').slice(0, 10),
    url: linkedInSearchUrl(j.title, j.company_name),
    source: 'remotive',
    sourceUrl: j.url,
    description: htmlToText(String(j.description || '')).slice(0, 6000),
  }));
}

// The Muse has no free-text search, so use its engineering and data science categories at Entry Level and
// Internship, then filter by title words and US locations.
async function fetchMusePage(topic: string, page: number): Promise<any[]> {
  const params = new URLSearchParams({ page: String(page) });
  ['Software Engineering', 'Data Science'].forEach((c) => params.append('category', c));
  (/\bintern/i.test(topic) ? ['Internship'] : ['Entry Level', 'Internship']).forEach((l) => params.append('level', l));
  const res = await fetch(`https://www.themuse.com/api/public/jobs?${params}`, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } });
  if (!res.ok) throw new Error(`The Muse HTTP ${res.status}`);
  const data: any = await res.json();
  return data.results || [];
}

async function fetchMuseJobs(topic: string): Promise<Job[]> {
  // 20 jobs per page and no text search, so read a few pages to find title matches.
  const pages = await Promise.allSettled([0, 1, 2, 3, 4].map((p) => fetchMusePage(topic, p)));
  const raw = pages.flatMap((p) => (p.status === 'fulfilled' ? p.value : []));
  if (!raw.length && pages[0].status === 'rejected') throw pages[0].reason;
  const all: Job[] = raw.map((j: any): Job => ({
    id: `muse-${j.id}`,
    title: String(j.name || ''),
    company: String(j.company?.name || ''),
    location: (j.locations || []).map((l: any) => l.name).join(' / ') || 'Not listed',
    postedAgo: String(j.publication_date || '').slice(0, 10),
    url: linkedInSearchUrl(j.name, j.company?.name || ''),
    source: 'themuse',
    sourceUrl: j.refs?.landing_page,
    description: htmlToText(String(j.contents || '')).slice(0, 6000),
  }));
  const seen = new Set<string>();
  return all
    .filter((j) => !seen.has(j.id) && !!seen.add(j.id) && titleMatches(topic, j.title) && isUsLocation(j.location))
    .slice(0, 20);
}

async function searchJobs(query: string, loc: string) {
  const topic = cleanJobTitle(query);
  const location = loc.trim() || DEFAULT_LOCATION;
  const notes: string[] = [];
  try {
    const li = await cached(`li:${topic}|${location}`, 60 * 60 * 1000, () => fetchLinkedInJobs(topic, location));
    if (li.length) return { jobs: li, source: 'linkedin', notes };
    notes.push('LinkedIn returned no cards');
  } catch (e: any) {
    notes.push(e?.message || 'LinkedIn failed');
  }
  const settled = await Promise.allSettled([
    cached(`rm:${topic}`, 60 * 60 * 1000, () => fetchRemotiveJobs(topic)),
    cached(`muse:${topic}`, 60 * 60 * 1000, () => fetchMuseJobs(topic)),
  ]);
  const jobs: Job[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') jobs.push(...s.value);
    else notes.push(String(s.reason?.message || s.reason));
  }
  return { jobs, source: 'fallback', notes };
}

// ---- Tailoring with Workers AI ----

const TAILOR_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer' },
    matched: { type: 'array', items: { type: 'string' } },
    missing: { type: 'array', items: { type: 'string' } },
    bullets: { type: 'array', items: { type: 'string' } },
    cover: { type: 'string' },
  },
  required: ['score', 'matched', 'missing', 'bullets', 'cover'],
};

function parseJsonLoose(v: unknown): any {
  if (v && typeof v === 'object') return v;
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

const strList = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim()) : null;

function validateTailor(r: any) {
  if (!r || typeof r !== 'object') return null;
  const score = Number(r.score);
  const matched = strList(r.matched), missing = strList(r.missing), bullets = strList(r.bullets);
  if (!Number.isFinite(score) || !matched || !missing || !bullets?.length || typeof r.cover !== 'string' || !r.cover.trim()) return null;
  return { score: Math.max(0, Math.min(100, Math.round(score))), matched: matched.slice(0, 10), missing: missing.slice(0, 10), bullets: bullets.slice(0, 3), cover: r.cover.trim() };
}

async function tailor(env: Env, job: any, resume: string) {
  const system =
    'You are a resume tailoring assistant. Respond with one JSON object only, no markdown. ' +
    'Schema: {"score": integer 0-100, "matched": string[], "missing": string[], "bullets": string[3], "cover": string}. ' +
    'First identify the 6-8 most important skills the job asks for. "matched" lists those the resume shows, "missing" lists the rest. ' +
    '"score" reflects how well the resume fits the job. These are entry-level and internship roles, so weigh skills, projects and ' +
    'coursework rather than years of experience. "bullets" are exactly three resume bullets rewritten from the resume for this job, ' +
    'each under 35 words, never inventing employers, titles, or numbers. "cover" is a cover letter under 140 words signed with the name at the top of the resume.';
  const skills = Array.isArray(job.skills) && job.skills.length ? `\nListed skills: ${job.skills.join(', ')}` : '';
  const user =
    `JOB\nTitle: ${String(job.title || '').slice(0, 200)}\nCompany: ${String(job.company || '').slice(0, 200)}${skills}\n` +
    `Description:\n${String(job.description || '').slice(0, 6000)}\n\nRESUME\n${resume}`;
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];

  let out: any;
  try {
    try {
      out = await env.AI.run(MODEL, { messages, max_tokens: 1200, response_format: { type: 'json_schema', json_schema: TAILOR_SCHEMA } });
    } catch {
      out = await env.AI.run(MODEL, { messages, max_tokens: 1200 }); // retry without JSON mode
    }
  } catch (e) {
    console.warn('Workers AI failed:', e); // e.g. daily free allowance used up
    throw new Error('model error or daily free limit reached');
  }
  const result = validateTailor(parseJsonLoose(out?.response));
  if (!result) throw new Error('Model reply was not the expected JSON');
  return result;
}

// ---- Router ----

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
}

function corsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get('Origin');
  if (!origin || origin === new URL(req.url).origin) return {};
  if (ALLOWED_ORIGINS.some((re) => re.test(origin))) return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  return null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);

    const cors = corsHeaders(req);
    if (!cors) return json({ error: 'Origin not allowed' }, 403);
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    try {
      if (url.pathname === '/api/jobs' && req.method === 'GET') {
        const q = (url.searchParams.get('q') || '').slice(0, 100);
        const loc = (url.searchParams.get('loc') || '').slice(0, 100);
        if (!q.trim()) return json({ error: 'Missing q' }, 400, cors);
        return json(await searchJobs(q, loc), 200, cors);
      }

      const detail = url.pathname.match(/^\/api\/job\/li-(\d{6,15})$/);
      if (detail && req.method === 'GET') {
        const description = await cached(`desc:${detail[1]}`, 6 * 60 * 60 * 1000, () => fetchLinkedInDescription(detail[1]));
        return json({ description }, 200, cors);
      }

      if (url.pathname === '/api/tailor' && req.method === 'POST') {
        if (env.TAILOR_LIMIT) {
          const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
          const { success } = await env.TAILOR_LIMIT.limit({ key: ip });
          if (!success) return json({ error: 'Too many requests, try again in a minute' }, 429, cors);
        }
        const body: any = await req.json().catch(() => null);
        const resume = String(body?.resume || '').trim().slice(0, 8000);
        if (!body?.job || resume.length < 40) return json({ error: 'Need job and resume' }, 400, cors);
        return json({ ...(await tailor(env, body.job, resume)), model: MODEL }, 200, cors);
      }

      return json({ error: 'Not found' }, 404, cors);
    } catch (e: any) {
      return json({ error: e?.message || 'Upstream error' }, 502, cors);
    }
  },
};
