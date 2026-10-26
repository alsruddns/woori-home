import { FINANCIAL_RIGHTS } from "../../src/lib/data-platform/financial-rights.mjs";
import { GOLD_SOURCE_ID } from "../../src/lib/data-platform/gold-price-pipeline.mjs";

/** Synthetic permission evidence, used only in the dedicated test database. */
export function approvedGoldTestSource() {
  const required=["apiAccess","commercialUse","dbStorage","longTermRetention","dailySnapshot","publicDisplay","userApi","adSupportedDisplay","derivedVisualization"];
  return { id:GOLD_SOURCE_ID,name:"Test Gold source",license_status:"verified",terms_version:"test-v1",
    reviewed_at:"2026-10-26T00:00:00Z",review_due_at:"2099-01-01T00:00:00Z",collection_enabled:true,
    attribution:"Synthetic fixture only",source_url:"https://example.invalid/gold",financial_rights:{
      ...Object.fromEntries(FINANCIAL_RIGHTS.map(right=>[right,"pending"])),
      ...Object.fromEntries(required.map(right=>[right,"confirmed"])),
      evidence:Object.fromEntries(required.map(right=>[right,{url:"https://example.invalid/test-license",reviewedAt:"2026-10-26T00:00:00Z",scope:"Synthetic test fixture only; no real provider rights asserted."}])),
    }};
}
