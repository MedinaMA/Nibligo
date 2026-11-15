# Nibligo 🗨️✨

Learn any language by **speaking** it. Learners talk out loud with Sayso, a friendly AI tutor (Claude) that answers at their level, fixes mistakes as they go, and turns those mistakes into spoken review drills. XP, streaks, daily goals and confetti keep them coming back.

Learners pay a monthly subscription (Stripe), so **your API credits are covered by their payments**.

## Go live: one-time setup

You need four things, set as Vercel environment variables (production):

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → Settings → API keys |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys (`sk_live_…`, or `sk_test_…` to try it with test cards) |
| Upstash Redis (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) | added automatically by `vercel integration add upstash` |
| `SESSION_SECRET` | already set |

```bash
vercel integration add upstash                     # free database: accounts + progress
vercel env add ANTHROPIC_API_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel deploy --prod
```

Optional settings:

| Variable | Default | Meaning |
|---|---|---|
| `PRICE_CENTS` | `999` | Monthly price in cents ($9.99) |
| `PRICE_CURRENCY` | `usd` | Currency |
| `TRIAL_DAYS` | `0` | Free trial length (card required) |
| `DAILY_LIMIT` | `120` | Max tutor replies per subscriber per day (protects your margins) |
| `STRIPE_PRICE_ID` | none | Use a Price you created in Stripe instead of the built-in one |
| `SITE_URL` | request origin | Your custom domain, e.g. `https://sayso.app` |

In Stripe, turn on the **Customer portal** (Settings → Billing → Customer portal) so subscribers can cancel or update their card from the app.

## Run locally

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
DEV_FREE_ACCESS=1 npm start     # skips the paywall locally (ignored on Vercel)
```

Open http://localhost:3000 in Chrome, Edge or Safari. Without Upstash credentials, local data lives in memory.

## How it works

- `public/`: the app (plain HTML/CSS/JS, no build step). Landing page, sign-up, paywall, onboarding, Talk / Review / Me tabs.
- `api/account.js`: sign up, log in, log out, delete account (scrypt-hashed passwords, signed HttpOnly cookies).
- `api/billing.js`: Stripe Checkout and Customer Portal. Subscription status is read from Stripe and cached for 15 min, so no webhook is needed.
- `api/tutor.js`: the tutor (subscribers only, with a daily cap). Logic is in `lib/tutor.js` (Claude `claude-opus-5-5`, structured JSON, prompt caching).
- `api/progress.js`: syncs XP, streaks, review decks and tutor memory across devices.
- `dev-server.js`: local server running the same functions.
