# Seedance Ad Creatives

Scans top-performing video ads in your category, writes a diverse set of ad
scripts against your product's reference image, and generates video
creatives from them via the [Seedance](https://api.seedance2.ai) API.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and set:
   - `SEEDANCE_API_KEY` — your Seedance API key. **Do not commit this.**
   - `SEEDANCE_API_BASE` — defaults to `https://api.seedance2.ai`.
   - `NEXT_PUBLIC_SITE_URL` — public URL of this deployment. Used both to
     build the Seedance `callback_url` (so completion/failure webhooks reach
     `/api/seedance/webhook`) and to build the public URL for uploaded
     reference images, since Seedance needs a URL it can fetch — running
     locally without a tunnel (e.g. ngrok), Seedance won't be able to reach
     an uploaded image.
   - `ANTHROPIC_API_KEY` — used to generate diverse ad scripts from scanned
     ad copy + your product description.
   - `META_AD_LIBRARY_TOKEN` — a Meta Graph API access token with access to
     the [Ad Library API](https://www.facebook.com/ads/library/api) `ads_archive`
     endpoint, used to scan currently-running video ads. If unset, script
     generation still works but falls back to general ad conventions instead
     of scanned examples.
3. `npm run dev`

## How it works

1. **Upload a reference image** (`pages/api/upload.js`) — saved to
   `public/uploads` and returned as a public URL for Seedance's
   `image_urls` input.
2. **Scan top ads** (`lib/metaAdLibrary.js`) — searches Meta's public Ad
   Library for currently-running video ads matching your search terms
   (brand/category/competitor), ranked by days running as a proxy for
   performance (the Ad Library API doesn't expose impressions/spend for most
   commercial ads — advertisers keep winning ads live longer and kill losers
   fast, so longevity is the best available public signal).
3. **Generate diverse scripts** (`lib/scriptGenerator.js`) — calls Claude
   with a fixed list of ad archetypes (UGC testimonial, problem-solution,
   unboxing/demo, POV, founder story, comparison, humor/skit, social proof
   montage, tutorial, ASMR close-up) and assigns one per script, so the
   output is guaranteed to span genuinely different ad types rather than
   variations on one idea. Each script includes a `videoPrompt` written for
   direct use with an image/text-to-video model.
4. **Generate video** (`lib/seedance.js`, `pages/api/seedance/generate.js`)
   — sends each script's `videoPrompt` + the uploaded reference image to
   Seedance as an `image-to-video` task, and polls/receives a webhook for
   the result.

Orchestration entrypoint: `pages/api/scripts/generate.js` ties steps 2+3
together; `pages/index.jsx` is the UI for the whole flow.

## Notes

- The in-memory task store in `lib/taskStore.js` does not persist across
  serverless function instances. For production use, back it with a real
  datastore (KV, Postgres, etc.) keyed by `taskId`.
- Uploaded images are stored on local disk (`public/uploads`), which does
  not persist on ephemeral/serverless hosts (e.g. Vercel). For production,
  swap `pages/api/upload.js` for real object storage (Vercel Blob, S3, etc.)
  and return that URL instead.
- Rotate any API key that has been shared outside of environment variables
  or a secrets manager.
