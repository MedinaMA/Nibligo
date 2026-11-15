// Tiny key-value store used by the whole app.
//   • Neon Postgres  (DATABASE_URL / POSTGRES_URL, added by `vercel integration add neon`)
//   • Upstash Redis  (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_*)
//   • In-memory      (local development only)
import { Redis } from "@upstash/redis";
import { neon } from "@neondatabase/serverless";

const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/**
 * Postgres-backed store. `q(text, params)` runs one query and returns rows,
 * so the same code works with Neon in production and any Postgres in tests.
 */
export function sqlStore(q) {
  let ready;
  const init = () => (ready ??= q(
    "CREATE TABLE IF NOT EXISTS sayso_kv (k text PRIMARY KEY, v jsonb NOT NULL, exp timestamptz)",
    [],
  ));
  const expiry = (ex) => (ex ? new Date(Date.now() + ex * 1000).toISOString() : null);
  return {
    async get(k) {
      await init();
      const rows = await q("SELECT v FROM sayso_kv WHERE k = $1 AND (exp IS NULL OR exp > now())", [k]);
      return rows[0]?.v ?? null;
    },
    async set(k, v, opts = {}) {
      await init();
      const val = JSON.stringify(v);
      if (opts.nx) {
        // Insert only if missing or expired.
        const rows = await q(
          `INSERT INTO sayso_kv (k, v, exp) VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, exp = EXCLUDED.exp
           WHERE sayso_kv.exp IS NOT NULL AND sayso_kv.exp <= now()
           RETURNING k`,
          [k, val, expiry(opts.ex)],
        );
        return rows.length ? "OK" : null;
      }
      await q(
        `INSERT INTO sayso_kv (k, v, exp) VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, exp = EXCLUDED.exp`,
        [k, val, expiry(opts.ex)],
      );
      return "OK";
    },
    async del(k) {
      await init();
      await q("DELETE FROM sayso_kv WHERE k = $1", [k]);
    },
    async incr(k, ttlSeconds) {
      await init();
      const rows = await q(
        `INSERT INTO sayso_kv (k, v, exp) VALUES ($1, '1'::jsonb, $2)
         ON CONFLICT (k) DO UPDATE SET
           v = CASE WHEN sayso_kv.exp IS NOT NULL AND sayso_kv.exp <= now() THEN '1'::jsonb
                    ELSE to_jsonb((sayso_kv.v #>> '{}')::bigint + 1) END,
           exp = CASE WHEN sayso_kv.exp IS NOT NULL AND sayso_kv.exp <= now() THEN EXCLUDED.exp
                      ELSE COALESCE(sayso_kv.exp, EXCLUDED.exp) END
         RETURNING v`,
        [k, expiry(ttlSeconds)],
      );
      return Number(rows[0].v);
    },
  };
}

function redisStore() {
  const r = new Redis({ url: redisUrl, token: redisToken });
  return {
    get: (k) => r.get(k),
    set: (k, v, opts = {}) => r.set(k, v, { ...(opts.ex ? { ex: opts.ex } : {}), ...(opts.nx ? { nx: true } : {}) }),
    del: (k) => r.del(k),
    async incr(k, ttlSeconds) {
      const v = await r.incr(k);
      if (v === 1 && ttlSeconds) await r.expire(k, ttlSeconds);
      return v;
    },
  };
}

function memoryStore() {
  if (process.env.VERCEL) throw new Error("No database configured: connect a Neon or Upstash database to this Vercel project.");
  console.warn("[store] No database credentials: using an in-memory store (data is lost on restart).");
  const m = new Map();
  const live = (k) => {
    const e = m.get(k);
    if (e && e.exp && e.exp < Date.now()) { m.delete(k); return undefined; }
    return e;
  };
  return {
    async get(k) { return live(k)?.v ?? null; },
    async set(k, v, opts = {}) {
      if (opts.nx && live(k)) return null;
      m.set(k, { v: structuredClone(v), exp: opts.ex ? Date.now() + opts.ex * 1000 : 0 });
      return "OK";
    },
    async del(k) { m.delete(k); },
    async incr(k, ttlSeconds) {
      const e = live(k);
      const v = (e?.v ?? 0) + 1;
      m.set(k, { v, exp: e?.exp || (ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0) });
      return v;
    },
  };
}

let store;
export function db() {
  if (store) return store;
  if (pgUrl) {
    const sql = neon(pgUrl);
    return (store = sqlStore((text, params) => sql.query(text, params)));
  }
  if (redisUrl && redisToken) return (store = redisStore());
  return (store = memoryStore());
}
