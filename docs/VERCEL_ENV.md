# Vercel Environment Variables

Configure these on your Vercel project so the Ascent Bookings Dashboard runs correctly in production (public exec review + optional integrations).

---

## Where to set them

1. Open [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select project **ascent-bookings-dashboard** (or whatever you named the import)
3. **Settings → Environment Variables**
4. Add each variable below
5. Scope: **Production** (also check **Preview** if you want PR previews to match)
6. **Save** → **Deployments → … on latest → Redeploy**  
   *(Env changes apply only after a new deploy)*

> **Important:** `VITE_*` variables are baked in at **build time**. After changing them, you must **Redeploy**.

---

## Required for public executive dashboard

| Name | Value | Environments | Notes |
| --- | --- | --- | --- |
| `VITE_AUTH_ENABLED` | `false` | Production, Preview | **No login wall** — execs open the URL and use the app |

Without this set to `false`, the app may expect sign-in (Better Auth) and block casual review.

---

## Recommended (custom domain)

| Name | Value | Environments |
| --- | --- | --- |
| `SITE_URL` | `https://dashboard.ascentbuildings.com` | Production |

Use your real `*.vercel.app` URL until the custom domain is live, e.g.  
`https://ascent-bookings-dashboard.vercel.app`

---

## Optional — leave blank unless you need them

### Database (shared Postgres)

| Name | Value | When |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://…` (Neon or other) | Only if you want a real shared DB. **If unset**, the app uses embedded PGLite (fine for demo/review). |

> If you set `DATABASE_URL`, do **not** leave auth disabled in a way that conflicts — see auth notes in code. For public exec demo, **omit** `DATABASE_URL`.

### Auth (only if you turn login on later)

| Name | Value |
| --- | --- |
| `VITE_AUTH_ENABLED` | `true` |
| `BETTER_AUTH_URL` | `https://dashboard.ascentbuildings.com` |
| `BETTER_AUTH_SECRET` | long random string (e.g. `openssl rand -hex 32`) |
| `GROK_AUTH_ISSUER` / `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` | Only if using Grok broker federation |

For **corporate review now**, keep auth **off** (`VITE_AUTH_ENABLED=false`) and skip the rest.

### Dodge Construction Network (live project pipeline)

| Name | Value |
| --- | --- |
| `DODGE_API_BASE_URL` | URL Dodge issues (example shape: `https://api.construction.com/v1`) |
| `DODGE_CLIENT_ID` | from Dodge |
| `DODGE_CLIENT_SECRET` | from Dodge |
| `DODGE_TOKEN_URL` | optional override |
| `DODGE_ACCESS_TOKEN` | optional bearer instead of client credentials |
| `DODGE_API_KEY` | optional static key some tenants use |

Without these, the **Dodge pipeline** tab shows the labeled **demo** SE pipeline (works offline for review).

FRED + BLS market feeds need **no** API keys.

---

## Copy-paste checklist (minimum)

Add these three (or just the first) in Vercel:

```
VITE_AUTH_ENABLED=false
SITE_URL=https://dashboard.ascentbuildings.com
```

Then **Redeploy**.

---

## CLI alternative (if you have a Vercel token)

```bash
# From the project root, after: vercel login && vercel link
vercel env add VITE_AUTH_ENABLED production
# paste: false

vercel env add SITE_URL production
# paste: https://dashboard.ascentbuildings.com

vercel --prod
```

Or bulk via file (never commit secrets):

```bash
# .env.vercel.local  (gitignored)
VITE_AUTH_ENABLED=false
SITE_URL=https://dashboard.ascentbuildings.com

vercel env pull   # optional reverse
```

---

## After saving

| Check | Expected |
| --- | --- |
| Redeploy finished | Ready |
| Open production URL | Dashboard loads without login |
| Market feeds tab | Live or partial FRED/BLS |
| Dodge pipeline tab | Demo pipeline (until Dodge credentials) |
| Custom domain | After DNS CNAME — see [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) |

---

## Screenshot map (Vercel UI)

```
Project → Settings → Environment Variables
  [Add New]
    Key:   VITE_AUTH_ENABLED
    Value: false
    ☑ Production  ☑ Preview
  [Save]
→ Deployments → Redeploy
```
