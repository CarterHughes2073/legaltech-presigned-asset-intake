import { z } from "zod";
import { infrai } from "./infrai_client.ts";

export const intakeSchema = z.object({ matterId: z.string().min(1), assetName: z.string().min(1), contentType: z.string().min(1), sizeBytes: z.number().int().positive(), deadline: z.string().date() });
export type Intake = z.infer<typeof intakeSchema>;
const BUCKET = process.env.STORAGE_BUCKET ?? "legal-matter-assets";

export function followUpDecision(deadline: string, today = new Date().toISOString().slice(0, 10)): "follow-up" | "on-track" { return deadline < today ? "follow-up" : "on-track"; }

export async function prepareMatterAsset(input: unknown) {
  const intake = intakeSchema.parse(input);
  const key = `matters/${encodeURIComponent(intake.matterId)}/${encodeURIComponent(intake.assetName)}`;
  const signed = await infrai.storage.object.presign(BUCKET, key, { op: "put", expires_seconds: 900, content_type: intake.contentType, max_bytes: intake.sizeBytes, idempotency_key: `${intake.matterId}:${intake.assetName}` });
  const status = await infrai.storage.object.head(BUCKET, key);
  const listing = await infrai.storage.object.list(BUCKET);
  return { matterId: intake.matterId, key, uploadUrl: signed.url, objectPresent: status.found, knownAssetCount: listing.items.length, followUp: followUpDecision(intake.deadline) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { matterId: process.env.MATTER_ID ?? "matter-1001", assetName: process.env.ASSET_NAME ?? "signed-engagement.pdf", contentType: "application/pdf", sizeBytes: 250000, deadline: process.env.DEADLINE ?? "2099-12-31" };
  prepareMatterAsset(input).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
