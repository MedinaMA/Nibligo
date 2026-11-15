// Stripe subscriptions. Stripe is the source of truth; we cache the status briefly.
import Stripe from "stripe";
import { saveUser } from "./auth.js";
import { HttpError } from "./http.js";

export const PLAN = {
  name: "Sayso Plus",
  cents: Number(process.env.PRICE_CENTS) || 999,
  currency: (process.env.PRICE_CURRENCY || "usd").toLowerCase(),
  trialDays: Number(process.env.TRIAL_DAYS) || 0,
  dailyLimit: Number(process.env.DAILY_LIMIT) || 120, // tutor replies per subscriber per day
};

const ACTIVE = new Set(["active", "trialing"]);
const RECHECK_MS = 15 * 60 * 1000;

let stripe;
function client() {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(503, "Payments aren't set up yet. Check back soon!");
  return (stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

/** Local development without Stripe: set DEV_FREE_ACCESS=1 (ignored on Vercel). */
const devFree = () => process.env.DEV_FREE_ACCESS === "1" && !process.env.VERCEL;

async function ensureCustomer(user) {
  if (user.customerId) return user.customerId;
  const customer = await client().customers.create({ email: user.email, metadata: { app: "sayso" } });
  user.customerId = customer.id;
  await saveUser(user);
  return customer.id;
}

export async function createCheckout(user, baseUrl) {
  const customer = await ensureCustomer(user);
  const session = await client().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.email,
    line_items: [{
      quantity: 1,
      price: process.env.STRIPE_PRICE_ID || undefined,
      price_data: process.env.STRIPE_PRICE_ID ? undefined : {
        currency: PLAN.currency,
        unit_amount: PLAN.cents,
        recurring: { interval: "month" },
        product_data: { name: PLAN.name, description: "Unlimited* speaking practice with your Sayso AI tutor" },
      },
    }],
    subscription_data: PLAN.trialDays ? { trial_period_days: PLAN.trialDays } : undefined,
    allow_promotion_codes: true,
    success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
  });
  return session.url;
}

export async function createPortal(user, baseUrl) {
  if (!user.customerId) throw new HttpError(400, "No subscription found.");
  const s = await client().billingPortal.sessions.create({ customer: user.customerId, return_url: baseUrl });
  return s.url;
}

/** Re-read the subscription from Stripe (cached for 15 minutes) and return whether it's active. */
export async function refreshSubscription(user, { force = false } = {}) {
  if (devFree()) return true;
  if (!user.customerId || !process.env.STRIPE_SECRET_KEY) return false;
  if (!force && user.subCheckedAt && Date.now() - user.subCheckedAt < RECHECK_MS) return !!user.subscribed;
  const subs = await client().subscriptions.list({ customer: user.customerId, status: "all", limit: 10 });
  user.subscribed = subs.data.some((s) => ACTIVE.has(s.status));
  user.subCheckedAt = Date.now();
  await saveUser(user);
  return user.subscribed;
}

/** After Checkout redirects back: confirm the session belongs to this user, then refresh. */
export async function confirmCheckout(user, sessionId) {
  if (!sessionId) return refreshSubscription(user, { force: true });
  const session = await client().checkout.sessions.retrieve(sessionId);
  if (session.customer !== user.customerId) throw new HttpError(403, "That checkout belongs to someone else.");
  return refreshSubscription(user, { force: true });
}
