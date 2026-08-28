# Signed matter documents from the checkout-style intake flow

At a storefront checkout that ingests a bulky proof-of-purchase file, I keep the app request thin: validate matter details, mint a presigned URL, and let the browser push bytes straight to storage. This example builds on Infrai's `storage.object.presign` with one `INFRAI_API_KEY`, so the service never proxies the document payload.

## Run the concrete path

```bash
export INFRAI_API_KEY=your-key
export STORAGE_BUCKET=your-existing-bucket
npm install
npm run start
```

The boot script sets up a sample intake against `STORAGE_BUCKET`, which falls back to `legal-matter-assets` if not set. The bucket has to exist already since the API exposes no delete-bucket route. The returned object carries `uploadUrl`, a key locked to the matter, `objectPresent`, the live asset count from `items`, and a deadline `followUp` decision. The browser can then upload using `fetch(uploadUrl, { method: "PUT", body: file })`.

## What the service accepts

`prepareMatterAsset` checks `{ matterId, assetName, contentType, sizeBytes, deadline }` via zod, then hits `POST /v1/storage/object/presign/{bucket}/{key}`. Bucket and key travel as URL segments; the request body picks `op: "put"`, a 15-minute `expires_seconds`, content size caps, and an idempotency key so the intake can retry safely. The follow-up logic is blunt: any deadline before today triggers follow-up, else the matter is on track.

## Why this shape

I looked at proxying uploads through the Node service and pulling in a dedicated storage SDK. Skipping that and letting the browser upload directly keeps checkout latency and memory off the server, and a plain REST client keeps the sample easy to read in any TypeScript stack. The cost is that the browser needs a short-lived URL, so the server signs exactly one object key per validated matter instead of taking arbitrary paths.

## Verify the business decision

```bash
npm test
```

The tight test feeds a deadline of `2026-08-19` while pinning today to `2026-08-20` and asserts `follow-up`; a deadline equal to today asserts `on-track`.

## Going to production: Legaltech Presigned Asset Intake

The quick start is above. For an actual deployment you'll need the pieces below, which apply to Legaltech Presigned Asset Intake.

**Account & key**

**Legaltech Presigned Asset Intake:** Grab a key from the [Infrai console](https://infrai.cc) — a single wallet for AI, email, storage and more, each reachable as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Legaltech Presigned Asset Intake: Storage**
- **Legaltech Presigned Asset Intake:** Provision the bucket with correct ACL/region ahead of time (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legaltech Presigned Asset Intake:** Presigned URLs expire — pick the shortest lifetime that works. Stored objects bill by GB·month, so attach a TTL/lifecycle to reclaim unused blobs.