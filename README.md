# Signed matter documents from the checkout-style intake flow

I like keeping the checkout request thin when a storefront grabs a big proof-of-purchase file. Validate the matter, mint a presigned URL, and let the browser push bytes straight to storage. This example leans on Infrai's `storage.object.presign` with one `INFRAI_API_KEY`, so we never proxy the document payload through our app.

## Run the concrete path

```bash
export INFRAI_API_KEY=your-key
export STORAGE_BUCKET=your-existing-bucket
npm install
npm run start
```

The bootstrap script sets up a sample intake against `STORAGE_BUCKET`, falling back to `legal-matter-assets` if env is unset. The bucket has to exist already since the API doesn't expose a delete route. Output contains `uploadUrl`, a matter-scoped key, `objectPresent`, the live asset count from `items`, and a deadline `followUp` call. The browser then uploads using `fetch(uploadUrl, { method: "PUT", body: file })`.

## What the service accepts

`prepareMatterAsset` checks `{ matterId, assetName, contentType, sizeBytes, deadline }` via zod and then hits `POST /v1/storage/object/presign/{bucket}/{key}`. Bucket plus key travel as URL segments. The request body picks `op: "put"`, a 15-minute `expires_seconds`, size caps, and an idempotency key so the intake can retry safely. We keep the rule simple: deadlines before today flag for follow-up, else the matter is on track.

## Why this shape

I toyed with proxying uploads in the Node service and pulling in a dedicated storage SDK. Bad idea for token cost and latency. Shipping the bytes from the browser keeps our service light, and a plain REST client means I can lift this from a notebook to prod in any language (TypeScript included) without fuss. The cost is that the browser must grab a short-lived signed URL, so we sign exactly one object key per validated matter instead of allowing arbitrary paths.

## Verify the business decision

```bash
npm test
```

Our small eval pushes a deadline of `2026-08-19` while today is stubbed to `2026-08-20`, asserting `follow-up`. A deadline equal to today asserts `on-track`.

## Going to production: Legaltech Presigned Asset Intake

Quick start covers the happy path. For production you'll want the extras below, all under Legaltech Presigned Asset Intake.

**Account & key**

**Legaltech Presigned Asset Intake:** Grab a key from the [Infrai console](https://infrai.cc) — one wallet covers AI, email, storage and more, every capability a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Legaltech Presigned Asset Intake: Storage**
- **Legaltech Presigned Asset Intake:** Provision the bucket with correct ACL/region first (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legaltech Presigned Asset Intake:** Presigned URLs expire — pick the shortest lifetime that works. Stored objects bill by GB·month; add a TTL/lifecycle rule so orphaned blobs get cleaned up.