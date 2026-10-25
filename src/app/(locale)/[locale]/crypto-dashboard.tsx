"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import { cryptoCopy } from "@/lib/data-platform/crypto-copy";
import { cryptoDirectoryCopy } from "@/lib/data-platform/crypto-directory-copy";

type CryptoAsset = { symbol: string; name: string; aliases: string[] };

const cryptoAssets: CryptoAsset[] = [
  { symbol: "BTC", name: "Bitcoin", aliases: ["비트코인"] },
  { symbol: "ETH", name: "Ethereum", aliases: ["이더리움"] },
  { symbol: "XRP", name: "XRP", aliases: ["리플", "엑스알피"] },
  { symbol: "SOL", name: "Solana", aliases: ["솔라나"] },
  { symbol: "DOGE", name: "Dogecoin", aliases: ["도지코인", "도지"] },
  { symbol: "ADA", name: "Cardano", aliases: ["에이다", "카르다노"] },
  { symbol: "BNB", name: "BNB", aliases: ["바이낸스코인"] },
  { symbol: "TRX", name: "TRON", aliases: ["트론"] },
  { symbol: "USDT", name: "Tether USD", aliases: ["테더", "테더 USD"] },
  { symbol: "USDC", name: "USDC", aliases: ["USD 코인", "유에스디씨"] },
  { symbol: "DOT", name: "Polkadot", aliases: ["폴카닷"] },
  { symbol: "LTC", name: "Litecoin", aliases: ["라이트코인"] },
];

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s._-]+/g, "");
}

export function CryptoDashboard({ locale }: { locale: Locale }) {
  const copy = cryptoCopy[locale];
  const ui = cryptoDirectoryCopy[locale];
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return cryptoAssets;
    return cryptoAssets.filter((asset) => [asset.symbol, asset.name, ...asset.aliases].some((value) => normalize(value).includes(query)));
  }, [search]);

  return <>
    <nav className="platform-breadcrumb" aria-label={copy.nav}><Link href={`/${locale}`}>{copy.nav}</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading crypto-page-heading"><span className="platform-eyebrow">{copy.nav}</span><h1>{copy.title}</h1></header>

    <section className="crypto-directory" aria-labelledby="crypto-directory-title">
      <header className="crypto-directory-heading">
        <div><span className="platform-eyebrow">{ui.directoryEyebrow}</span><h2 id="crypto-directory-title">{ui.directoryTitle}</h2></div>
        <span className="crypto-directory-count">{cryptoAssets.length} · {ui.assets}</span>
      </header>
      <label className="crypto-directory-search">
        <span>{ui.search}</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={ui.searchPlaceholder} autoComplete="off" />
      </label>
      {visible.length ? <ul className="crypto-directory-list" aria-label={ui.directoryTitle}>
        {visible.map((asset) => <li key={asset.symbol}>
          <strong>{locale === "ko" && asset.aliases[0] ? asset.aliases[0] : asset.name}</strong>
          <span>{asset.name !== asset.symbol ? `${asset.name} · ` : ""}<b>{asset.symbol}</b></span>
        </li>)}
      </ul> : <p className="crypto-directory-empty" role="status">{ui.noResults}</p>}
    </section>

    <aside className="crypto-rights-status" aria-labelledby="crypto-rights-title">
      <span className="crypto-rights-indicator" aria-hidden="true" />
      <div><h2 id="crypto-rights-title">{copy.unavailableTitle}</h2><p>{copy.unavailableBody}</p>
        <p className="crypto-rights-providers">{copy.source}: <a href="https://docs.upbit.com/kr/reference" target="_blank" rel="noreferrer">Upbit</a> · <a href="https://apidocs.bithumb.com/" target="_blank" rel="noreferrer">Bithumb</a> · <a href="https://developers.binance.com/en/docs/products/spot/rest-api" target="_blank" rel="noreferrer">Binance</a> · <a href="https://www.coingecko.com/en/api_terms" target="_blank" rel="noreferrer">CoinGecko</a></p>
      </div>
    </aside>

    <section className="crypto-issue-link"><h2>{copy.issues}</h2><p>{copy.issueDescription}</p><Link href={`/${locale}/crypto/issues`}>{copy.issueTitle}</Link></section>
  </>;
}

export function CryptoDashboardLoading({ locale }: { locale: Locale }) {
  return <section className="crypto-empty-state"><h1>{cryptoCopy[locale].title}</h1><p>{cryptoCopy[locale].unavailableBody}</p></section>;
}
