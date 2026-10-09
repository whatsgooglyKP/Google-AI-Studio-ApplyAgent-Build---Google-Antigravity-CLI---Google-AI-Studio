# Apply Agent on Cloudflare Workers (free, no API keys)

This Worker serves `../demo/index.html` and three small endpoints:

| Route | What it does |
| --- | --- |
| `GET /api/jobs?q=<title>&loc=<location>` | Live listings from LinkedIn's public guest job search (one page, cached ~1 hour). If LinkedIn fails, falls back to Remotive and The Muse. |
| `GET /api/job/li-<id>` | Full description of one LinkedIn job. |
| `POST /api/tailor` | `{job, resume}` → `{score, matched, missing, bullets, cover}` from Llama 3.1 on Workers AI. |

There is no API key anywhere. Workers AI is reached through the `AI` binding in `wrangler.toml`.
If the AI fails or the daily free allowance runs out, the page uses its local skill-overlap simulator and labels the result "local fallback".

## Cost

Use the **Workers Free plan** and don't add a payment method. On the Free plan, going over a limit makes requests fail until the daily reset; it never creates a bill.

- Workers: 100,000 requests/day.
- Workers AI: 10,000 neurons/day, roughly a few hundred tailorings with the 8B model.
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
   npx wrangler deploy
   ```

3. Wrangler prints a URL like `https://apply-agent.<your-subdomain>.workers.dev`. Set that as the Squarespace iframe `src`.

## Local dev

```bash
npx wrangler dev
```

Then open http://127.0.0.1:8787. The AI binding always runs remotely, so you need to be logged in for `/api/tailor` to work locally.
Without login, everything else works and tailoring shows the local fallback.

## Notes

- LinkedIn's User Agreement prohibits scraping. This Worker fetches one public results page per search, caches it, and never logs in. LinkedIn may block Cloudflare's IP ranges at any time; the Remotive and The Muse feeds keep search working when it does.
- Remotive and The Muse ask for credit and a link back; the page footer and each job's "View on …" link provide that.
- The in-memory cache is per Worker instance and best effort. The Cache API does nothing on `*.workers.dev` domains.
