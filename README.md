# Blurt Auto Poster

Posts an AI-assisted article with an AI-generated image to [Blurt](https://blurt.blog), rotating between **health**, **crypto**, **daily lifestyle** and **technology**. There's a random gap of **7 to 9 hours** between posts, about 3 a day. It runs free on GitHub Actions, so you don't need a server.

| Category | Blurt tag | Themes | Examples |
|---|---|---|---|
| Health | `health` | 18 | sleep, hydration, posture, stress, check-ups |
| Crypto (educational) | `crypto` | 16 | wallet security, seed phrases, scams, how Blurt rewards work |
| Daily lifestyle | `lifestyle` | 16 | routines, budgeting, decluttering, hobbies, digital detox |
| Technology | `technology` | 17 | AI assistants, deepfakes, passkeys, backups, EVs, solar |

Each category has its own audiences, post formats, writing rules and disclaimer (see `src/categories.js`). The same category is never posted twice in a row, and a category that hasn't appeared for a while becomes more likely, so the mix stays even without a fixed, robotic order. Within a category, a topic isn't repeated until all of them have been used.

Crypto and technology posts are deliberately **evergreen explainers**, not news. The AI models' knowledge is months old, so they're told not to state prices, predictions, release dates or version numbers.

## How it works

```
GitHub Actions (every 30 min) -> check-due.js: is it time yet?
   | yes
   v
pick topic -> Gemini writes post (Groq fallback) -> quality checks (retry with feedback)
   -> FLUX image (Cloudflare; Pollinations fallback) -> upload to Blurt image host
   -> broadcast post with posting key -> pick next time (now + random 7-9h)
   -> commit state/state.json
```

Safety nets:
- A lock stops two runs from happening at the same time.
- Before posting, it checks the chain for the account's last post, so a failed state save can't cause a double post.
- Drafts are rejected and rewritten if they contain drug or supplement doses (mg, mcg, IU), investment hype ("guaranteed returns", "100x", "to the moon"), or price predictions. Honest warnings such as "scammers promise guaranteed returns" are allowed.
- Every post gets a footer: "not medical advice" for health, "not financial advice" for crypto, plus an AI-assistance note on all posts.

## Cost: free

| Service | Free allowance (check current limits) |
|---|---|
| GitHub Actions | Unlimited on public repos. 2,000 min/month on private repos. This job uses about 1,600 min/month. |
| Google Gemini API | Free tier. Note: Google may use free-tier prompts to improve its products. |
| Cloudflare Workers AI | Daily free allowance, enough for a few images a day |
| Pollinations.ai | Free, no key needed (adds a small watermark) |
| Blurt | **Not free per post.** Each post pays a small fee in BLURT: 0.05 flat plus 0.2 per KB, so about 1 BLURT per post. Keep some BLURT in the account. |

## Setup

1. **Get the keys:**
   - **Gemini API key:** https://aistudio.google.com/apikey
   - **Cloudflare (optional, gives better images):** your account ID, plus an API token with the *Workers AI* permission
   - **Groq (optional backup):** https://console.groq.com/keys
   - **Blurt private posting key:** in your wallet, under *Keys & Permissions*. Use the **posting** key only.
2. **Try it locally** without posting:
   ```sh
   npm install
   cp .env.example .env   # fill in GEMINI_API_KEY at minimum
   npm run preview        # writes preview/post.md + preview/image.jpg
   ```
3. **Push this folder to a GitHub repository.**
4. **Add secrets.** In the repo, go to *Settings > Secrets and variables > Actions* and add these secrets: `BLURT_USERNAME`, `BLURT_POSTING_KEY`, `GEMINI_API_KEY`, and optionally `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `GROQ_API_KEY`.
5. **Post the first one.** Go to *Actions > Blurt auto post > Run workflow*, tick **force**, and check the post on blurt.blog. After that it runs on its own.

Optional repo **variables** (same settings page, *Variables* tab):
- `MIN_INTERVAL_HOURS` / `MAX_INTERVAL_HOURS` (default 7 / 9)
- `POST_CATEGORIES`: which categories to use, e.g. `health,technology` (default: all four)
- `POST_FOOTER`: custom text for every post, or `none` (default: each category's own disclaimer)

## Commands

| Command | What it does |
|---|---|
| `npm run preview` | Generates a post and image into `preview/`, posts nothing |
| `npm run post` | Posts only if the schedule says it's due |
| `npm run post:now` | Posts immediately |
| `npm test` | Runs unit tests |

## Operating notes

- **Pause:** go to *Actions > Blurt auto post > ... > Disable workflow*.
- **Failures:** a failed run doesn't move the schedule, so it retries 30 minutes later. GitHub emails you when a run fails.
- **Inactivity:** GitHub may disable scheduled workflows after 60 days with no repo activity. The bot's state commits should count as activity, but check now and then.
- **Review early posts:** read the first posts yourself, and remember that Blurt curators can downvote content they see as low-effort automation.
