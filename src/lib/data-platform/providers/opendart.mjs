export const OPENDART_SOURCE_ID = "opendart-company-financials";
export const OPENDART_API_BASE = "https://opendart.fss.or.kr/api";

export function createOpenDartProvider({ apiKey = process.env.OPENDART_API_KEY ?? process.env.DART_API_KEY, fetchImpl = fetch } = {}) {
  return {
    id: OPENDART_SOURCE_ID,
    enabled: Boolean(apiKey),
    status: apiKey ? "configured-awaiting-rights-review" : "api-key-missing",
    async fetchFinancialStatements({ corpCode, businessYear, reportCode = "11011" }) {
      if (!apiKey) throw Object.assign(new Error("Set OPENDART_API_KEY to enable OpenDART requests."), { code: "opendart-api-key-missing" });
      if (!/^\d{8}$/.test(corpCode) || !/^\d{4}$/.test(String(businessYear)) || !["11011", "11012", "11013", "11014"].includes(reportCode)) throw new Error("Invalid OpenDART company or reporting-period parameters.");
      const url = new URL(`${OPENDART_API_BASE}/fnlttSinglAcntAll.json`);
      url.searchParams.set("crtfc_key", apiKey);
      url.searchParams.set("corp_code", corpCode);
      url.searchParams.set("bsns_year", String(businessYear));
      url.searchParams.set("reprt_code", reportCode);
      url.searchParams.set("fs_div", "CFS");
      const response = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Object.assign(new Error(`OpenDART API responded with ${response.status}.`), { code: `opendart-http-${response.status}` });
      const payload = await response.json();
      if (!payload || !["000", "013"].includes(payload.status)) throw Object.assign(new Error("OpenDART API returned an error status."), { code: `opendart-status-${payload?.status ?? "unknown"}` });
      return payload.list ?? [];
    },
  };
}
