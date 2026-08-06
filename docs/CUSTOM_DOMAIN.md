# Custom domain — Ascent Bookings Dashboard

**Recommended production URL:** `https://dashboard.ascentbuildings.com`

Company apex: [ascentbuildings.com](https://ascentbuildings.com)  
DNS host: **GoDaddy** (`pdns13/14.domaincontrol.com`)

---

## Prerequisites

1. Vercel project deployed from this repo ([one-click deploy](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSpiderForce-Star%2FAscent-Bookings-Dashboard-Performance&project-name=ascent-bookings-dashboard&env=VITE_AUTH_ENABLED&envDescription=Set%20VITE_AUTH_ENABLED%3Dfalse%20for%20public%20executive%20access)).
2. Access to GoDaddy DNS for `ascentbuildings.com`.
3. Env on Vercel:

| Variable | Value |
| --- | --- |
| `VITE_AUTH_ENABLED` | `false` (public executive access) |
| `BETTER_AUTH_URL` | `https://dashboard.ascentbuildings.com` (only if you turn auth on later) |
| `SITE_URL` | `https://dashboard.ascentbuildings.com` |

---

## Step 1 — Add domain in Vercel (2 min)

1. Open your project on [vercel.com/dashboard](https://vercel.com/dashboard).
2. **Settings → Domains → Add**.
3. Enter: `dashboard.ascentbuildings.com`
4. Vercel shows the DNS record to create (usually a **CNAME**).

### Typical Vercel DNS target

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| **CNAME** | `dashboard` | `cname.vercel-dns.com` | 600 (or 1 hour) |

> If Vercel shows a different target (project-specific CNAME or A records), **use exactly what Vercel displays**.

Optional aliases (same target):

- `bookings.ascentbuildings.com`
- `performance.ascentbuildings.com`

---

## Step 2 — Create the record in GoDaddy (2 min)

1. Sign in at [dcc.godaddy.com](https://dcc.godaddy.com/) → **My Products → Domains**.
2. Open **ascentbuildings.com** → **DNS** / **Manage DNS**.
3. **Add** record:

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `dashboard` |
| Value / Points to | `cname.vercel-dns.com` *(or the value Vercel shows)* |
| TTL | 1 Hour (or 600 seconds) |

4. Save. Do **not** create a conflicting A record for `dashboard`.

### Screenshot checklist

- [ ] Record type is **CNAME**, not A  
- [ ] Name is only `dashboard` (GoDaddy adds `.ascentbuildings.com`)  
- [ ] No trailing space in the value  
- [ ] Apex `ascentbuildings.com` / `www` left unchanged (marketing site stays on GoDaddy)  

---

## Step 3 — Wait for SSL + verification

| Check | Expected |
| --- | --- |
| Vercel Domains UI | Domain **Valid** |
| Certificate | Vercel auto-issues HTTPS (Let's Encrypt) — usually < 5–30 min after DNS propagates |
| Browser | `https://dashboard.ascentbuildings.com` loads the dashboard |

Propagation is often fast on GoDaddy; allow up to **24–48 hours** in rare cases.

```bash
# From any machine with dig/nslookup:
# dig CNAME dashboard.ascentbuildings.com +short
# → should return cname.vercel-dns.com (or Vercel's target)
```

---

## Step 4 — Confirm env after domain is live

In Vercel → **Settings → Environment Variables** (Production):

```
VITE_AUTH_ENABLED=false
SITE_URL=https://dashboard.ascentbuildings.com
```

Redeploy once after env changes (**Deployments → … → Redeploy**).

---

## CLI (if you have a Vercel token)

```bash
# Link project once
vercel link

# Add domain to the project
vercel domains add dashboard.ascentbuildings.com

# Inspect
vercel domains ls
```

Then create the same CNAME in GoDaddy as above.

---

## Why not the apex (`ascentbuildings.com`)?

The marketing site already runs on the apex (`50.63.19.223`). Pointing the apex at Vercel would take down the public website. A **subdomain** keeps both:

| Host | Purpose |
| --- | --- |
| `ascentbuildings.com` / `www` | Public marketing site (unchanged) |
| `dashboard.ascentbuildings.com` | Bookings / executive dashboard (this app) |

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Vercel: “Invalid configuration” | CNAME name/value mismatch; remove old A record for `dashboard` |
| SSL pending | Wait for DNS propagation; ensure CNAME is correct |
| 404 on Vercel | Domain not assigned to this project; re-add under Domains |
| Mixed content / wrong app | Confirm only one project owns the domain |
| Auth redirect issues | Set `BETTER_AUTH_URL=https://dashboard.ascentbuildings.com` if auth is enabled |

---

## Summary for IT / registrar owner

```
Add CNAME:  dashboard  →  cname.vercel-dns.com
Domain:     ascentbuildings.com  (GoDaddy)
App:        Ascent Bookings Dashboard (Vercel)
Result:     https://dashboard.ascentbuildings.com
```
