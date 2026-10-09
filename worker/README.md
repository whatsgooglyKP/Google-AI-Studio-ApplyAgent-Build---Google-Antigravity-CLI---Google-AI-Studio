# Apply Agent on Cloudflare Workers (free, no API keys)

This Worker serves `../demo/index.html` and three small endpoints:

| Route | What it does |
| --- | --- |
| `GET /api/jobs?q=<title>&loc=<location>` | Entry-level and internship listings from LinkedIn's public guest job search (up to 3 pages, cached ~1 hour). If LinkedIn fails, falls back to Remotive and The Muse. |
| `GET /api/job/li-<id>` | Full description of one LinkedIn job. |
| `POST /api/tailor` | `{job, resume}` → `{score, matched, missing, bullets, cover}` from Llama 3.3 70B on Workers AI. Matched skills are checked against the resume text. |

## Search scope

The search is limited to **internship and entry-level roles in the United States**:

- The page offers four roles: Software Engineer, Software Developer, AI/ML Intern and Machine Learning Intern. "All four roles" runs all of them and merges the results.
- Location defaults to `United States`. You can narrow it to a state or city.
- LinkedIn is queried with its experience filter `f_E=1,2` (Internship, Entry level). Titles containing senior, staff, lead, principal, manager, II, III or levels 2–5 are dropped, because LinkedIn's filter lets some through.
- The Muse is queried at its Entry Level and Internship levels, in the Software Engineering and Data Science categories, and kept only for US locations. Remotive results are kept only when open to US applicants.

To change the roles, edit `ROLE_TITLES` in `demo/index.html`. To change the seniority rules, edit `SENIOR_TITLE` in `src/index.ts`.

## Keys

There is no API key anywhere. Workers AI is reached through the `AI` binding in `wrangler.toml`.
If the AI fails or the daily free allowance runs out, the page uses its local skill-overlap simulator and labels the result "local fallback".

## Cost

Use the **Workers Free plan** and don't add a payment method. On the Free plan, going over a limit makes requests fail until the daily reset; it never creates a bill.

- Workers: 100,000 requests/day.
- Workers AI: 10,000 neurons/day. The 70B model uses roughly 5x more per tailoring than the 8B one, so expect on the order of dozens of tailorings a day, not hundreds. Switch `MODEL` in `src/index.ts` to `@cf/meta/llama-3.1-8b-instruct-fast` for more volume, at the cost of a model that over-claims skills more often.
- `TAILOR_LIMIT` caps each visitor at 6 tailorings a minute.

## Deploy

1. Create a free account at https://dash.cloudflare.com/sign-up (no card needed).
2. From this folder:

   ```bash
   npm install
   ```

   ```bash
   npx wrangler login
   ```

   ```bash
   npm run deploy
   ```

3. Wrangler prints a URL like `https://apply-agent.<your-subdomain>.workers.dev`. Set that as the Squarespace iframe `src`.

## Local dev

```bash
npm run dev
```

Then open http://127.0.0.1:8787. The AI binding always runs remotely, so you need to be logged in for `/api/tailor` to work locally.
Without login, everything else works and tailoring shows the local fallback.

## Notes

- LinkedIn's User Agreement prohibits scraping. This Worker fetches one public results page per search, caches it, and never logs in. LinkedIn may block Cloudflare's IP ranges at any time; the Remotive and The Muse feeds keep search working when it does.
- Remotive and The Muse ask for credit and a link back; the page footer and each job's "View on …" link provide that.
- The in-memory cache is per Worker instance and best effort. The Cache API does nothing on `*.workers.dev` domains.
- Always deploy with `npm run deploy` (or `npx wrangler deploy --config wrangler.toml`). If a `.wrangler/deploy/config.json` exists in the repo root (created when the old React app was set up for Cloudflare), a bare `npx wrangler deploy` follows it and publishes the old app instead.
