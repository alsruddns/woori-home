import Link from "next/link";
import type { Locale } from "@/lib/site";
import { financialOverviewCopy } from "@/lib/data-platform/financial-overview-copy";
import { goldCopy } from "@/lib/data-platform/gold-copy";
import { getFinancialReadOnlyPool } from "@/lib/db/financial-readonly";
import { readOpenPriceMarket } from "@/lib/data-platform/open-price-market.mjs";
import { formatMarketDate } from "@/lib/data-platform/market-date-format.mjs";
import { categoryNavigation } from "@/lib/data-platform/category-navigation";

export async function MarketSnapshot({ locale }: { locale: Locale }) {
  const copy = financialOverviewCopy[locale];
  let crypto: Awaited<ReturnType<typeof readOpenPriceMarket>> | null = null;
  let gold: Awaited<ReturnType<typeof readOpenPriceMarket>> | null = null;
  try {
    const pool = getFinancialReadOnlyPool();
    [crypto, gold] = await Promise.all([
      readOpenPriceMarket(pool, "crypto"),
      readOpenPriceMarket(pool, "gold"),
    ]);
  } catch {
    // The Portal remains usable if the read-only financial database is unavailable.
  }
  const quotes = (crypto?.data ?? []).filter((coin) => ["BTC", "ETH", "XRP"].includes(coin.symbol));
  const goldQuote = gold?.data?.[0];
  const worldLabel = categoryNavigation(locale).find((item) => item.id === "world")?.label ?? copy.title;
  const number = (value: string | null | undefined, currency = "USD") => value == null ? copy.noData
    : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: Number(value) >= 100 ? 2 : 8 }).format(Number(value));
  const date = (value: string | Date | null | undefined) => formatMarketDate(value, locale, copy.noData);
  return <section className="market-snapshot" aria-label={copy.title}>
    <div className="market-snapshot-grid">
      <article className="market-snapshot-card"><div><span className="platform-eyebrow">{copy.usdCrypto}</span><h3><Link href={`/${locale}/crypto`}>Bitcoin · Ethereum · XRP</Link></h3></div>
        {quotes.length ? <ul>{quotes.map((coin) => <li key={coin.uuid}><span><strong>{coin.name}</strong><small>{coin.symbol} · {date(coin.referenceDate)}</small></span><strong>{number(coin.price)}</strong></li>)}</ul> : <p>{copy.noData}</p>}
        <small>{crypto?.provider ?? "Alternative.me"} · {crypto?.observedAt ? date(crypto.observedAt) : copy.noData} UTC</small>
      </article>
      <article className="market-snapshot-card"><div><span className="platform-eyebrow">{goldCopy[locale].title}</span><h3><Link href={`/${locale}/gold`}>{goldCopy[locale].marketReference}</Link></h3></div>
        {goldQuote ? <ul><li><span><strong>{goldCopy[locale].title}</strong><small>{date(goldQuote.referenceDate)}</small></span><strong>{number(goldQuote.price)} / troy oz</strong></li></ul> : <p>{copy.noData}</p>}
        <small>{gold?.provider ?? "World Bank Pink Sheet"} · {goldQuote ? date(goldQuote.observedAt) : copy.noData} UTC</small>
      </article>
      <article className="market-snapshot-card market-snapshot-link"><span className="platform-eyebrow">WOORI.TODAY</span><h3><Link href={`/${locale}/world`}>{worldLabel}</Link></h3><Link className="platform-home-link" href={`/${locale}/world`}>{worldLabel} →</Link></article>
    </div>
    <p className="market-snapshot-source">{copy.updated}: <a href="https://alternative.me/crypto/api/" target="_blank" rel="noreferrer">Alternative.me</a> · <a href="https://www.worldbank.org/en/research/commodity-markets" target="_blank" rel="noreferrer">World Bank Pink Sheet</a>.</p>
  </section>;
}
