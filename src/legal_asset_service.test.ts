import { strict as assert } from "node:assert";
import { followUpDecision } from "./legal_asset_service.ts";

assert.equal(followUpDecision("2026-08-19", "2026-08-20"), "follow-up");
assert.equal(followUpDecision("2026-08-20", "2026-08-20"), "on-track");
console.log("deadline decision test passed");
