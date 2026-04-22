# Promo Pricing Monitor

Competitive intelligence dashboard for fintech promotions tracking — built with Next.js 15, TypeScript, and Tailwind CSS.

## What this app does

| View | Description |
|---|---|
| **Monitor** | Shows the live pricing comparison table per market/competitor, with active promo alerts and KPI cards. Data comes from a published Google Sheet (CSV). |
| **Insights** | AI-powered analysis of the raw promo feed. Shows period KPIs, bar charts per product/competitor, and 4 Anthropic-generated strategic bullets. |

---

## Architecture

```
/app
  page.tsx                  ← Client-side dashboard (Monitor + Insights views)
  layout.tsx                ← Root layout + metadata
  globals.css               ← CSS custom properties (design tokens) + base styles
  /api
    /monitor-data/route.ts  ← Server: proxies + parses Monitor Google Sheet CSV
    /promo-raw/route.ts     ← Server: proxies + parses Promo Raw Google Sheet CSV
    /insights/route.ts      ← Server: calls Anthropic API for AI analysis

/components
  DashboardHeader.tsx       ← Sticky top bar with refresh button
  Sidebar.tsx               ← Left nav (markets + insights link)
  StatsCards.tsx            ← 4-column KPI strip
  PromoAlerts.tsx           ← Active promo alert cards
  MarketTable.tsx           ← Per-market competitor pricing table
  InsightsView.tsx          ← Full Insights panel (AI cards + charts + raw table)
  BarChart.tsx              ← Horizontal bar chart
  Toast.tsx                 ← Toast notification system

/lib
  types.ts                  ← All TypeScript interfaces
  csv.ts                    ← RFC 4180 CSV parser
  format.ts                 ← Date parsing, flag emoji, status/delta helpers
  constants.ts              ← Google Sheet URLs, keyword lists
```

---

## Local setup

### 1. Clone / copy the project

```bash
cd promo-pricing-monitor
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required for AI analysis (Insights view)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: override the Google Sheets URLs
# MONITOR_SHEET_URL=https://...
# PROMO_RAW_SHEET_URL=https://...
```

> **Note:** If `ANTHROPIC_API_KEY` is not set, the app still works — the Monitor view is fully functional, and the Insights view will show data/charts but display an error message where the AI cards should appear.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts, then add environment variables:

```bash
vercel env add ANTHROPIC_API_KEY
```

### Option B — Vercel Dashboard

1. Push to GitHub/GitLab/Bitbucket.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected).
4. In **Environment Variables**, add:

| Key | Value | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | For Insights AI |
| `MONITOR_SHEET_URL` | Your CSV URL | Optional (has default) |
| `PROMO_RAW_SHEET_URL` | Your CSV URL | Optional (has default) |

5. Click **Deploy**.

---

## Google Sheets setup

Your sheets must be **published as CSV**:

1. Open the sheet in Google Sheets.
2. **File → Share → Publish to web**.
3. Select the specific tab → **Comma-separated values (.csv)** → **Publish**.
4. Copy the URL and paste it into your `.env.local`.

### Monitor sheet format

Expected columns (first data row after header must have "market" in col A):

```
Market | Competitor | Product | Status | Base ∆ | Promo Impact | Promo ∆ | Promo Description
```

- The first two columns use "merge-down" — only the first row of each group needs a value.
- `Promo Impact` column should contain the word `Active` if the promo is active.

### Promo Raw sheet format

The parser auto-detects the header row by looking for ≥2 cells matching known keywords:
`date`, `competitor`, `market`, `product`, `promo type`, `status`, `active`, etc.

---

## How to test

1. **Monitor view**: open the app. If the Google Sheet is correctly published and the URL is set, you should see KPI cards, promo alerts (if any), and per-market tables.

2. **Insights view**: click "✦ Promo Insights" in the sidebar. Charts render immediately from the sheet data. AI cards render once the Anthropic API responds (5–15 seconds). If `ANTHROPIC_API_KEY` is missing, the AI cards show a clear error.

3. **Refresh**: click "Actualizar" in the header to reload all data from both sheets.

---

## Environment variables reference

| Variable | Default | Secret? | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | — | ✅ Yes | Never expose in client code |
| `MONITOR_SHEET_URL` | Hardcoded fallback | No | Override with your own sheet |
| `PROMO_RAW_SHEET_URL` | Hardcoded fallback | No | Override with your own sheet |
| `NEXT_PUBLIC_APP_NAME` | `Promo Pricing Monitor` | No | Browser-visible |

---

## Vercel serverless notes

- All API routes use `runtime = "nodejs"` — compatible with Vercel's Node.js serverless functions.
- `/api/insights` has `maxDuration = 60` (requires **Vercel Pro** for durations > 10 s on Hobby plan). On Hobby, reduce `max_tokens` or use a faster model if timeouts occur.
- No native Node APIs (fs, path, etc.) are used in route handlers — safe for serverless.

---

## Roadmap / optional improvements

- [ ] Competitor search via SerpAPI or Brave Search API (`/api/search-competitor`)
- [ ] URL content extraction via Firecrawl or Jina AI (`/api/scan-urls`)
- [ ] Manual text extraction with AI structuring (`/api/extract`)
- [ ] localStorage persistence of the raw promo table
- [ ] CSV export of the raw promo table
- [ ] JSON import of promos with Zod validation
- [ ] Deduplication by fingerprint (competitor + market + promoType + description hash)
- [ ] Supabase or PlanetScale backend for persistent storage
