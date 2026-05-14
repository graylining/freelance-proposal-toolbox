# Upwork Sidekick

A Chrome side-panel extension that scrapes your Upwork profile + a specific job page, then assembles a structured, human-sounding prompt you can paste into Claude / ChatGPT / any LLM to draft a proposal worth submitting.

No backend. No accounts. Everything runs locally and saves to `chrome.storage.local`.

---

## What it does

- **Sync your Upwork profile** once (Dashboard → Sync Profile). Scrapes your headline, hourly rate, skills, employment history, portfolio (via Upwork's GraphQL), and client feedback. Saved locally and editable in the Profile tab.
- **Set search filters** (Filters tab) — composes the Upwork search URL with hourly/fixed, contractor tier, budget brackets, project length, client-history bands, location, etc. Click "Open in Upwork" to launch the filtered search in a real tab.
- **Scan a job page** — open any Upwork job at `/jobs/~cipher` and hit Scan Job. The extension pulls the title, description, budget (hourly range or fixed price), screening questions, client stats, and skills.
- **Generate a copy-paste-ready prompt** — combines your saved profile + the scraped job into a single prompt with strict format and voice rules (no AI tells, no em dashes, no banned filler words, "you-first" copywriting, 7-beat cover-letter structure). Produces **two distinct proposal variations** plus pricing, milestone dates, effort-vs-pay verdict, rate-increase schedule, success probability, and strategic advice mined from client signals.
- **Custom prompt + agency mode toggles** in the Job tab — persistent text areas for extra instructions and agency framing.

## Install (dev)

```bash
npm install
npm run build
```

Then load `dist/` as an unpacked extension at `chrome://extensions` (Developer mode → Load unpacked).

For iterative development:

```bash
npm run dev   # vite build --watch
```

## Scripts

| script | what it does |
|---|---|
| `npm run build` | rasterizes the SVG icon to PNGs, type-checks, then `vite build` |
| `npm run dev` | watch-mode build |
| `npm run icons` | regenerate icon-16/32/48/128.png from `public/favicon.svg` (via `sharp`) |
| `npm run lint` | eslint |

## Architecture

```
src/
  sidepanel/        React app shown in Chrome's side panel
    App.tsx           tab nav, theme handling, version pill
    views/
      Dashboard.tsx       Profile Sync + Recent Jobs list
      Profile.tsx         editable profile fields (Profile tab)
      Filters.tsx         Upwork search filter builder
      Job.tsx             Scan Job + prompt-option toggles
      Prompt.tsx          generated prompt + copy
      About.tsx           version, theme, page context, storage stats
  content/          Runs on www.upwork.com
    index.ts            scrapeJob() + scrapeProfile() DOM scrapers, message handlers
    portfolio.ts        GraphQL fetch for full portfolio (cookies + bearer from localStorage)
  background/       Service worker
    index.ts            message router, profile-sync orchestrator, content-script injection fallback
  shared/           Types, constants, prompt builder, search URL builder
    prompt.ts           the prompt template + compaction logic
    profileTypes.ts     ScrapedProfile + nested shapes
    jobTypes.ts         ScrapedJobPage shape
    jobFilters.ts       Upwork search URL composer
    constants.ts        chrome.storage keys, theme, MAX_SAVED_JOBS
    pageContext.ts      detect job / profile / unknown page from active tab URL
```

### Storage

All state lives in `chrome.storage.local`:

| key | what |
|---|---|
| `profile` | the latest scraped profile (ScrapedProfile) |
| `profileSyncedAt` | timestamp of last sync |
| `savedJobs` | array of scanned jobs (most-recent first, capped at 500) |
| `jobFilters` | saved Upwork search filter set |
| `promptOptions` | toggles (allow filling gaps, differentiation, agency mode), agency info, custom prompt |
| `theme` | `'dark'` or `'light'` |

### Theming

- All neutral colors use Tailwind's `neutral-*` scale. The `.light` class on `<html>` inverts the entire neutral palette via CSS variables, so existing utility classes flip without per-component refactoring.
- Brand color is `--color-upwork-*`. In dark mode it's the standard #14a800 Upwork green; in light mode the same tokens shift to darker greens for contrast on white.

## Auth caveats

- The portfolio scrape uses a GraphQL endpoint that needs the elevated bearer token from `localStorage.<nid>_api_token` and the `current_organization_uid` cookie. Both are read from the active Upwork tab by the content script. If you're not logged in, sync fails with a clear error.
- The per-job scrape is pure DOM, no auth.

## Project layout

This folder (`freelance-cold-start/`) is the extension only. There is a legacy `api/` sibling folder that was an Express + SQLite backend; it is no longer used. The extension has been migrated entirely to `chrome.storage.local` and the `api/` directory can be deleted at any time.
