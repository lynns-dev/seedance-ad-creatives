# Seedance Ad Creatives

Generates ad creative videos via the [Seedance](https://api.seedance2.ai) API.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and set:
   - `SEEDANCE_API_KEY` — your Seedance API key. **Do not commit this.**
   - `SEEDANCE_API_BASE` — defaults to `https://api.seedance2.ai`.
   - `NEXT_PUBLIC_SITE_URL` — public URL of this deployment, used to build the
     `callback_url` sent to Seedance so task completion/failure webhooks reach
     `/api/seedance/webhook`.
3. `npm run dev`

## How it works

- `lib/seedance.js` — thin client for `POST /v1/videos/generations` and
  `GET /v1/tasks/:id`.
- `pages/api/seedance/generate.js` — accepts a prompt (and optional
  generation settings) from the UI and creates a Seedance task.
- `pages/api/seedance/status/[id].js` — proxies task status polling.
- `pages/api/seedance/webhook.js` — receives Seedance's completion/failure
  callback and stores the result in `lib/taskStore.js` (in-memory — swap for
  a real datastore before relying on this in production/serverless).
- `pages/index.jsx` — minimal form to submit a prompt and generate an ad
  creative video.

## Notes

- The in-memory task store in `lib/taskStore.js` does not persist across
  serverless function instances. For production use, back it with a real
  datastore (KV, Postgres, etc.) keyed by `taskId`.
- Rotate any API key that has been shared outside of environment variables
  or a secrets manager.
