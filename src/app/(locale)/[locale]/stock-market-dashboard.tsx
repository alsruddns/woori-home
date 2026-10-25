import Link from "next/link";
import type { Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { stockCopy } from "@/lib/data-platform/stock-copy";
import { stockUnavailableCopy } from "@/lib/data-platform/stock-unavailable-copy";
import { stockIssueCopy } from "@/lib/data-platform/market-issue-copy";
import { financialOverviewCopy } from "@/lib/data-platform/financial-overview-copy";
import { CompanyFundamentalsPanel } from "./company-fundamentals-panel";

export function StockMarketDashboard({ locale }: { locale: Locale }) {
  const platform = platformCopy[locale];
  const copy = stockCopy[locale];

  return <>
    <nav className="platform-breadcrumb" aria-label={copy.title}><Link href={`/${locale}`}>{platform.categories[0]}</Link><span>/</span><span>{platform.categories[2]}</span></nav>
    <header className="platform-page-heading stock-page-heading"><span className="platform-eyebrow">{platform.categories[2]}</span><h1>{platform.categories[2]}</h1><p>{financialOverviewCopy[locale].description}</p></header>

    <CompanyFundamentalsPanel locale={locale} />

    <section className="stock-price-availability" role="status" aria-labelledby="stock-price-availability-title">
      <div><span className="stock-price-availability-indicator" aria-hidden="true" /><h2 id="stock-price-availability-title">{copy.noSnapshotTitle}</h2></div>
      <p>{stockUnavailableCopy[locale]}</p>
      <p>{copy.sourceDisclosure}</p>
      <Link href={`/${locale}/stocks/issues`}>{stockIssueCopy[locale].title}</Link>
    </section>
  </>;
}

export function StockMarketLoading({ locale }: { locale: Locale }) {
  const copy = stockCopy[locale];
  return <section className="stock-loading"><h1>{copy.title}</h1><p>{stockUnavailableCopy[locale]}</p></section>;
}
