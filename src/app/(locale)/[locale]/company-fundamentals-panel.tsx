"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/site";
import { companyFactsCopy, companyFactsUnavailableCopy } from "@/lib/data-platform/company-facts-copy";

type CompanyFactRow = {
  id: string; ticker: string; name: string; exchange: string | null; fiscalYear: number | null; fiscalPeriod: string | null;
  startDate: string | null; endDate: string; filedDate: string; form: string; revenue: string | null;
  operatingIncome: string | null; netIncome: string | null; assets: string | null; liabilities: string | null;
  operatingCashFlow: string | null; sourceUrl: string;
};

export function CompanyFundamentalsPanel({ locale }: { locale: Locale }) {
  const copy = companyFactsCopy[locale];
  const [rows, setRows] = useState<CompanyFactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/portal-api/finance/companies", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Financial facts unavailable."); return response.json(); })
      .then((payload) => setRows(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => { if (!controller.signal.aborted) { setRows([]); setUnavailable(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const amount = (value: string | null) => value === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
  const date = (value: string) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
  };

  return <section className="company-fundamentals" aria-labelledby="company-fundamentals-title">
    <header><h2 id="company-fundamentals-title">{copy.title}</h2><p>{copy.description}</p></header>
    <p className="company-fundamentals-source">{copy.source}</p>
    {loading ? <p role="status">{copy.loading}</p> : unavailable ? <p role="status">{companyFactsUnavailableCopy[locale]}</p> : rows.length === 0 ? <p role="status">{copy.empty}</p> : <div className="platform-table-scroll company-fundamentals-scroll">
      <table className="platform-table company-fundamentals-table"><thead><tr>
        <th>{copy.company}</th><th>{copy.period}</th><th>{copy.endDate}</th><th>{copy.filed}</th><th>{copy.revenue} (USD)</th><th>{copy.operatingIncome} (USD)</th><th>{copy.netIncome} (USD)</th><th>{copy.assets} (USD)</th><th>{copy.liabilities} (USD)</th><th>{copy.cashFlow} (USD)</th><th>{copy.filing}</th>
      </tr></thead><tbody>{rows.map((row) => <tr key={`${row.id}-${row.endDate}-${row.filedDate}-${row.form}`}>
        <th scope="row"><span>{row.ticker}</span><small>{row.name}</small></th>
        <td>{row.fiscalYear ?? "—"} {row.fiscalPeriod ?? row.form}<small>{row.startDate ? `${date(row.startDate)} – ${date(row.endDate)}` : copy.endDate}</small></td><td><time dateTime={row.endDate}>{date(row.endDate)}</time></td><td><time dateTime={row.filedDate}>{date(row.filedDate)}</time></td>
        <td>{amount(row.revenue)}</td><td>{amount(row.operatingIncome)}</td><td>{amount(row.netIncome)}</td><td>{amount(row.assets)}</td><td>{amount(row.liabilities)}</td><td>{amount(row.operatingCashFlow)}</td>
        <td><a href={row.sourceUrl} target="_blank" rel="noreferrer">{copy.filing}</a></td>
      </tr>)}</tbody></table>
    </div>}
  </section>;
}
