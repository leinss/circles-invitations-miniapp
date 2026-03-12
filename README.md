# Circles Invitations Miniapp

Miniapp for creating and managing Circles invitation referral links. Runs inside the [CirclesMiniApps](https://circles.gnosis.io/miniapps) host iframe, using the host's passkey wallet (Cometh Connect → Safe on Gnosis Chain).

Replaces the React UI from `circles-invitations-at-scale-backend/ui/`.

## Architecture

```
CirclesMiniApps Host (circles.gnosis.io/miniapps)
  │ Passkey auth via Cometh → Safe wallet
  │ iframe + postMessage IPC
  ▼
Invitations Miniapp (this repo, GitHub Pages)
  │ @aboutcircles/miniapp-sdk (wallet_connected, sendTransactions, signMessage)
  │ SIWE auth flow → JWT for backend API calls
  │ viem for ABI encoding + RPC reads
  ▼
Invitations Backend (referrals.aboutcircles.com)
  │ Hono + PostgreSQL, JWT auth (RS256/JWKS)
  │ Referrals CRUD, Distribution sessions, /d/{slug} dispense
```

## Features

| View | Description |
|---|---|
| **My Referrals** | List referrals, status badges (pending/confirmed/claimed), copy key/link |
| **Create** | Single + batch invitation creation (96 CRC each), preflight checks, results with claim links |
| **Sessions** | Distribution session CRUD, add keys, pause/resume, shareable slug URLs |

## Auth Flow

1. Host connects wallet → miniapp receives `wallet_connected { address }`
2. Miniapp → `POST auth-service/challenge { address, audience: "referrals-api" }`
3. Auth-service returns SIWE challenge message
4. Miniapp → `signMessage(challenge)` via SDK → host passkey approval → ERC-1271 signature
5. Miniapp → `POST auth-service/verify { challengeId, signature }` → JWT
6. JWT stored in `sessionStorage`, used for all subsequent API calls

## Development

```bash
npm install
npm run dev
# → http://localhost:5182/circles-invitations-miniapp/
```

### Testing inside the host

1. Start dev server: `npm run dev`
2. Add entry to `CirclesMiniapps/static/miniapps.json`:
   ```json
   {
     "slug": "invitations",
     "name": "Circles Invitations",
     "url": "http://localhost:5182/circles-invitations-miniapp/",
     "description": "Create and manage Circles invitation referral links.",
     "tags": ["invitations", "onboarding"]
   }
   ```
3. Open `https://circles.gnosis.io/miniapps` → click "Circles Invitations"
4. Or use the **Advanced** button to paste the localhost URL directly

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_AUTH_API_BASE` | `https://auth.aboutcircles.com` | Auth service URL |
| `VITE_REFERRALS_API_BASE` | `https://referrals.aboutcircles.com` | Referrals backend URL |
| `VITE_RPC_URL` | `https://rpc.gnosischain.com` | Gnosis Chain RPC |
| `VITE_DISTRIBUTION_BASE_URL` | `https://app.gnosis.io` | Base URL for claim/distribution links |

For staging:

```bash
VITE_AUTH_API_BASE=https://auth.staging.aboutcircles.com \
VITE_REFERRALS_API_BASE=https://referrals.staging.aboutcircles.com \
npm run dev
```

## Build & Deploy

```bash
npm run build   # tsc + vite build → dist/
```

Deployed to GitHub Pages automatically on push to `main` via `.github/workflows/deploy.yml`.

Production URL: `https://leinss.github.io/circles-invitations-miniapp/`

## Tech Stack

- **TypeScript + Vite** — no framework, vanilla DOM
- `@aboutcircles/miniapp-sdk` — host communication (postMessage)
- `viem` — ABI encoding, key generation, public client for RPC reads

## Project Structure

```
src/
  main.ts              # Entry: SDK hooks, auth flow, tab routing
  lib/
    auth.ts            # SIWE challenge → signMessage → JWT
    api.ts             # Referrals + sessions API client
    contracts.ts       # ABIs, addresses, constants
    transactions.ts    # createInvitation / createBatch tx encoding
    rpc.ts             # viem publicClient for on-chain reads
    config.ts          # API base URLs (env var overrides)
    escape.ts          # HTML entity escaping
  views/
    referrals.ts       # Referral list + status badges
    create.ts          # Create form + preflight + results
    sessions.ts        # Session CRUD + add keys modal
  style.css            # Circles design system styles
```

## CORS Requirements

The following origins must be in `PASSKEY_ORIGIN` for both the invitations backend and auth-service:

- `https://circles.gnosis.io` (host)
- `https://leinss.github.io` (miniapp on GitHub Pages)
