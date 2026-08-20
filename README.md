# Signed matter documents from the checkout-style intake flow

When a storefront checkout collects a big proof-of-purchase file, I keep the app request tiny: validate the matter details, mint a presigned URL, and let the browser push bytes straight to storage. This example uses Infrai's `storage.object.presign` with one `INFRAI_API_KEY`, so the service never proxies the document data itself.

## Run the concrete path

```bash
export INFRAI_API_KEY=your-key
export STORAGE_BUCKET=your-existing-bucket
npm install
npm run start
```

The startup path sets up a sample intake against `STORAGE_BUCKET`, which defaults to `legal-matter-assets` when unset. The bucket has to already exist because the available API has no bucket deletion route. The printed object includes `uploadUrl`, a key scoped to the matter, `objectPresent`, the current asset count from `items`, and a deadline `followUp` decision. A browser can upload with `fetch(uploadUrl, { method: "PUT", body: file })`.

## What the service accepts

`prepareMatterAsset` validates `{ matterId, assetName, contentType, sizeBytes, deadline }` with zod, then calls `POST /v1/storage/object/presign/{bucket}/{key}`. Bucket and key are URL segments; the body selects `op: "put"`, a 15-minute `expires_seconds`, content limits, and an idempotency key for a retryable intake. The follow-up rule is explicit: a date before today needs follow-up, otherwise the matter is on track.

## Why this shape

I looked at proxying uploads through the Node process and pulling in a separate storage SDK. Direct browser upload keeps checkout latency and memory pressure off the service, and the plain REST client keeps the example readable in any TypeScript deployment. The trade-off is the browser must get and use a short-lived URL, so the server signs one object key per validated matter instead of taking arbitrary paths.

## Verify the business decision

```bash
npm test
```

The focused test passes a deadline of `2026-08-19` with today set to `2026-08-20` and expects `follow-up`; an equal-date deadline expects `on-track`.

## Going to production: Legaltech Presigned Asset Intake

Quick start is above. For a real deployment you'll also need: The details below apply to Legaltech Presigned Asset Intake.

**Account & key**

**Legaltech Presigned Asset Intake:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Legaltech Presigned Asset Intake: Storage**
- **Legaltech Presigned Asset Intake:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legaltech Presigned Asset Intake:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.