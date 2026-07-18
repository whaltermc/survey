# Habits survey — MongoDB + Vercel

Firebase has been fully removed. Data now goes through three small
Vercel serverless functions under `/api`, backed by MongoDB Atlas.

## What changed

| Before (Firebase)              | Now                                            |
|---------------------------------|-------------------------------------------------|
| Firestore `addDoc`               | `POST /api/submit-response`                     |
| Firestore `getDocs` + `orderBy`  | `GET /api/responses` (requires admin session)   |
| Firebase Auth email/password     | `POST /api/login` — checks `ADMIN_PASSWORD`, sets a signed cookie |
| `signOut`                        | `POST /api/logout` — clears the cookie          |
| `onAuthStateChanged`             | `GET /api/responses` returns 401 if not signed in |

`script.js` no longer imports anything from `gstatic.com` — it just calls
`fetch()` against these routes.

## One-time setup

1. **MongoDB Atlas** (free tier is fine): create a cluster at
   [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas), add a
   database user, and under Network Access allow `0.0.0.0/0` so Vercel can
   reach it. Copy the connection string from Connect → Drivers.

2. **Environment variables** — copy `.env.example` to `.env` for local dev,
   and add the same three under Vercel → Project → Settings → Environment
   Variables:
   - `MONGODB_URI` — your Atlas connection string
   - `MONGODB_DB` — optional, defaults to `habits_survey`
   - `ADMIN_PASSWORD` — the password for `admin.html`
   - `SESSION_SECRET` — any long random string, e.g. `openssl rand -hex 32`

3. **Deploy**: `vercel` (or connect the repo in the Vercel dashboard). Vercel
   auto-detects the `/api/*.js` files as serverless functions — no extra
   config needed. Run `npm install` first if testing locally with
   `vercel dev`.

## Heads up on the current pages

- **`index.html`** (the 16-question survey) previously didn't save
  anywhere — it wasn't wired to Firebase or anything else, it just stepped
  through questions client-side. It's now wired to `POST /api/submit-response`
  on the final step, saving whatever fields the form has.
- **`admin.html`** has been rebuilt around the current 16-question survey.
  It now shows 3 headline stats (total responses, % currently with a vice,
  % who considered trying), a bar chart card per multiple-choice/checkbox
  question, min/avg/max cards for the two age questions, and a chronological
  list for each open-ended question. The question list lives in `QUESTIONS`
  near the top of the analytics section in `script.js` — add, remove, or
  relabel entries there if the survey questions change again.
