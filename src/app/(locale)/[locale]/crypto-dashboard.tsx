"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import { getCryptoPageCopy } from "@/lib/data-platform/crypto-page-copy";
import { cryptoDirectoryCopy } from "@/lib/data-platform/crypto-directory-copy";

type CryptoAsset = { symbol: string; name: string; aliases: string[] };
type DailyRow = {
  assetId: string; symbol: string; name: string; venue: string; currency: string; referenceTimezone: string;
  referenceDate: string; close: string; volume: string | null; fetchedAt: string;
  previousReferenceDate: string | null; previousClose: string | null; changePercent?: string | null;
  sourceId: string; sourceName: string; sourceUrl: string; attribution: string;
};
type DailySnapshot = { market: "krw" | "usdt"; referenceTimezone: string; referenceDate: string; dataStatus: string; data: DailyRow[]; history: DailyRow[] };
type CoinrankingQuote = { uuid: string; symbol: string; name: string; aliases: string[]; price: string; change24hPercent: string | null; marketCap: string | null; volume24h: string | null; observedAt: string };
type CoinrankingPayload = { currency: "USD"; observedAt: string; data: CoinrankingQuote[]; attribution: string; sourceUrl: string };
type CoinrankingHistoryPoint = { timestamp: string; price: string };

const coinrankingLabels: Record<Locale, { current: string; change24h: string; observed: string; chart: string; loadChart: string }> = {
  ko: { current: "현재 집계가", change24h: "최근 24시간 변동률", observed: "관측 시각 (UTC)", chart: "Coinranking 가격 이력", loadChart: "가격 차트 불러오기" },
  en: { current: "Current aggregated price", change24h: "Change over 24 hours", observed: "Observed at (UTC)", chart: "Coinranking price history", loadChart: "Load price chart" },
  ja: { current: "現在の集計価格", change24h: "過去24時間の変動率", observed: "観測時刻 (UTC)", chart: "Coinranking価格履歴", loadChart: "価格チャートを読み込む" },
  zh: { current: "当前聚合价格", change24h: "过去24小时涨跌幅", observed: "观测时间 (UTC)", chart: "Coinranking 价格历史", loadChart: "加载价格图表" },
  es: { current: "Precio agregado actual", change24h: "Cambio en 24 horas", observed: "Hora de observación (UTC)", chart: "Historial de precios de Coinranking", loadChart: "Cargar gráfico" },
  "pt-br": { current: "Preço agregado atual", change24h: "Variação em 24 horas", observed: "Horário da observação (UTC)", chart: "Histórico de preços Coinranking", loadChart: "Carregar gráfico" },
  de: { current: "Aktueller aggregierter Preis", change24h: "Änderung über 24 Stunden", observed: "Beobachtet um (UTC)", chart: "Coinranking-Kursverlauf", loadChart: "Kursdiagramm laden" },
  fr: { current: "Prix agrégé actuel", change24h: "Variation sur 24 heures", observed: "Heure d’observation (UTC)", chart: "Historique des prix Coinranking", loadChart: "Charger le graphique" },
  vi: { current: "Giá tổng hợp hiện tại", change24h: "Biến động trong 24 giờ", observed: "Thời điểm ghi nhận (UTC)", chart: "Lịch sử giá Coinranking", loadChart: "Tải biểu đồ giá" },
  id: { current: "Harga agregat saat ini", change24h: "Perubahan 24 jam", observed: "Waktu pengamatan (UTC)", chart: "Riwayat harga Coinranking", loadChart: "Muat grafik harga" },
  th: { current: "ราคารวมปัจจุบัน", change24h: "การเปลี่ยนแปลงใน 24 ชั่วโมง", observed: "เวลาที่สังเกต (UTC)", chart: "ประวัติราคา Coinranking", loadChart: "โหลดกราฟราคา" },
  "zh-tw": { current: "目前彙總價格", change24h: "過去 24 小時漲跌幅", observed: "觀測時間 (UTC)", chart: "Coinranking 價格歷史", loadChart: "載入價格圖表" },
  it: { current: "Prezzo aggregato attuale", change24h: "Variazione in 24 ore", observed: "Ora di rilevazione (UTC)", chart: "Storico prezzi Coinranking", loadChart: "Carica grafico" },
  nl: { current: "Huidige geaggregeerde prijs", change24h: "Verandering in 24 uur", observed: "Waargenomen om (UTC)", chart: "Coinranking-prijsgeschiedenis", loadChart: "Prijsgrafiek laden" },
  hi: { current: "वर्तमान समेकित मूल्य", change24h: "24 घंटे का बदलाव", observed: "अवलोकन समय (UTC)", chart: "Coinranking मूल्य इतिहास", loadChart: "मूल्य चार्ट लोड करें" },
  ru: { current: "Текущая агрегированная цена", change24h: "Изменение за 24 часа", observed: "Время наблюдения (UTC)", chart: "История цен Coinranking", loadChart: "Загрузить график" },
  tr: { current: "Güncel toplu fiyat", change24h: "24 saatlik değişim", observed: "Gözlem zamanı (UTC)", chart: "Coinranking fiyat geçmişi", loadChart: "Fiyat grafiğini yükle" },
  pl: { current: "Aktualna cena zagregowana", change24h: "Zmiana w ciągu 24 godzin", observed: "Czas obserwacji (UTC)", chart: "Historia cen Coinranking", loadChart: "Wczytaj wykres" },
  fil: { current: "Kasalukuyang pinagsama-samang presyo", change24h: "Pagbabago sa loob ng 24 oras", observed: "Oras ng obserbasyon (UTC)", chart: "Kasaysayan ng presyo sa Coinranking", loadChart: "I-load ang chart" },
  bn: { current: "বর্তমান সমন্বিত মূল্য", change24h: "২৪ ঘণ্টার পরিবর্তন", observed: "পর্যবেক্ষণের সময় (UTC)", chart: "Coinranking মূল্য ইতিহাস", loadChart: "মূল্য চার্ট লোড করুন" },
  uk: { current: "Поточна агрегована ціна", change24h: "Зміна за 24 години", observed: "Час спостереження (UTC)", chart: "Історія цін Coinranking", loadChart: "Завантажити графік" },
  ms: { current: "Harga agregat semasa", change24h: "Perubahan dalam 24 jam", observed: "Masa pemerhatian (UTC)", chart: "Sejarah harga Coinranking", loadChart: "Muatkan carta harga" },
  sv: { current: "Aktuellt aggregerat pris", change24h: "Förändring under 24 timmar", observed: "Observationstid (UTC)", chart: "Coinranking-prishistorik", loadChart: "Läs in prisdiagram" },
  cs: { current: "Aktuální agregovaná cena", change24h: "Změna za 24 hodin", observed: "Čas pozorování (UTC)", chart: "Historie cen Coinranking", loadChart: "Načíst cenový graf" },
  ro: { current: "Preț agregat actual", change24h: "Modificare în 24 de ore", observed: "Ora observării (UTC)", chart: "Istoricul prețurilor Coinranking", loadChart: "Încarcă graficul" },
  el: { current: "Τρέχουσα συγκεντρωτική τιμή", change24h: "Μεταβολή 24 ωρών", observed: "Ώρα παρατήρησης (UTC)", chart: "Ιστορικό τιμών Coinranking", loadChart: "Φόρτωση γραφήματος" },
};

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
  { symbol: "LINK", name: "Chainlink", aliases: ["체인링크"] },
  { symbol: "LTC", name: "Litecoin", aliases: ["라이트코인"] },
  { symbol: "AVAX", name: "Avalanche", aliases: ["아발란체"] },
];

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s._-]+/g, "");
}

function formatClose(value: string, currency: string, locale: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (currency === "KRW") return new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(number);
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: number >= 100 ? 2 : 6 }).format(number)} ${currency}`;
}

function formatVolume(value: string | null, locale: string) {
  const number = value === null ? NaN : Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(number) : "—";
}

function changeState(value: string | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "is-unknown";
  return Number(value) > 0 ? "is-positive" : Number(value) < 0 ? "is-negative" : "is-neutral";
}

function formatChange(value: string | null | undefined, locale: string) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Math.abs(number));
  return `${number > 0 ? "+" : number < 0 ? "−" : ""}${formatted}%`;
}

function DailyCloseChart({ rows, title }: { rows: DailyRow[]; title: string }) {
  if (rows.length < 2) return null;
  const ordered = [...rows].sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));
  const values = ordered.map((row) => Number(row.close)).filter(Number.isFinite);
  if (values.length < 2) return null;
  const low = Math.min(...values); const high = Math.max(...values); const range = high - low || 1;
  const points = ordered.map((row, index) => `${(index / (ordered.length - 1)) * 100},${92 - ((Number(row.close) - low) / range) * 80}`).join(" ");
  return <svg className="crypto-daily-chart" viewBox="0 0 100 100" role="img" aria-label={title} preserveAspectRatio="none">
    <line x1="0" y1="92" x2="100" y2="92" />
    <polyline points={points} />
  </svg>;
}

export function CryptoDashboard({ locale }: { locale: Locale }) {
  const copy = getCryptoPageCopy(locale);
  const ui = cryptoDirectoryCopy[locale];
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState<"krw" | "usdt">("krw");
  const [snapshot, setSnapshot] = useState<DailySnapshot | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [loadedMarket, setLoadedMarket] = useState<"krw" | "usdt" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/portal-api/finance/crypto/daily?market=${market}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("daily-snapshot-unavailable");
        return response.json() as Promise<DailySnapshot>;
      })
      .then((data) => { if (!controller.signal.aborted) { setSnapshot(data); setLoadedMarket(market); } })
      .catch(() => { if (!controller.signal.aborted) setLoadedMarket(market); });
    return () => controller.abort();
  }, [market]);

  const query = normalize(search.trim());
  const visibleAssets = useMemo(() => cryptoAssets.filter((asset) => !query || [asset.symbol, asset.name, ...asset.aliases].some((value) => normalize(value).includes(query))), [query]);
  const allowedIds = useMemo(() => new Set(visibleAssets.map((asset) => asset.symbol)), [visibleAssets]);
  const activeSnapshot = snapshot?.market === market ? snapshot : null;
  const priceRows = (activeSnapshot?.data ?? []).filter((row) => allowedIds.has(row.symbol));
  const referenceRows = priceRows.length ? priceRows : visibleAssets.map((asset) => ({ symbol: asset.symbol, name: asset.name, aliases: asset.aliases }));
  const selected = priceRows.find((row) => row.assetId === selectedAssetId) ?? priceRows[0];
  const selectedHistory = selected ? (activeSnapshot?.history ?? []).filter((row) => row.assetId === selected.assetId) : [];
  const pending = loadedMarket !== market;

  return <>
    <nav className="platform-breadcrumb" aria-label={ui.directoryTitle}><Link href={`/${locale}`}>{copy.nav}</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading crypto-page-heading"><span className="platform-eyebrow">{copy.nav}</span><h1>{copy.title}</h1><p>{copy.description}</p></header>

    <CoinrankingMarket locale={locale} copy={copy} searchLabel={ui.search} searchPlaceholder={ui.searchPlaceholder} />

    <section className="crypto-daily-dashboard" aria-labelledby="crypto-daily-heading" aria-busy={pending}>
      <header className="crypto-daily-heading">
        <div><span className="platform-eyebrow">{copy.market}</span><h2 id="crypto-daily-heading">{copy.price}</h2></div>
        <div className="crypto-daily-controls">
          <label><span>{copy.market}</span><select value={market} onChange={(event) => setMarket(event.target.value as "krw" | "usdt")}>
            <option value="krw">KRW</option><option value="usdt">USDT</option>
          </select></label>
          <label className="crypto-directory-search"><span>{ui.search}</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={ui.searchPlaceholder} autoComplete="off" />
          </label>
        </div>
      </header>

      {activeSnapshot?.data.length ? <div className="crypto-daily-asof"><span>{copy.date}</span><strong>{activeSnapshot.referenceDate}</strong>
        <span>{activeSnapshot.referenceTimezone}</span>
      </div> : null}

      {priceRows.length ? <>
        <div className="crypto-daily-heatmap" aria-label={copy.change}>
          {priceRows.map((row) => {
            const asset = cryptoAssets.find((item) => item.symbol === row.symbol);
            const coinName = locale === "ko" && asset?.aliases[0] ? asset.aliases[0] : row.name;
            return <button key={row.assetId} type="button" className={`crypto-daily-tile ${changeState(row.changePercent)}${selected?.assetId === row.assetId ? " is-selected" : ""}`} onClick={() => setSelectedAssetId(row.assetId)} aria-pressed={selected?.assetId === row.assetId}>
              <span>{coinName} <b>{row.symbol}</b></span>
              <strong>{formatClose(row.close, row.currency, locale)}</strong>
              <small>{formatChange(row.changePercent, locale)}</small>
            </button>;
          })}
        </div>
        <ul className="crypto-daily-legend" aria-label={copy.change}>
          <li className="is-positive">＋ {copy.up}</li><li className="is-negative">− {copy.down}</li><li className="is-neutral">{copy.flat}</li><li className="is-unknown">{copy.sourcePending}</li>
        </ul>
        {selected && <div className="crypto-daily-detail">
          {selectedHistory.length > 1 && <div className="crypto-daily-chart-panel">
            <h3>{selected.name} · {copy.price}</h3>
            <DailyCloseChart rows={selectedHistory} title={`${selected.symbol} ${copy.price}`} />
            <small>{selectedHistory[0].referenceDate} – {selectedHistory.at(-1)?.referenceDate}</small>
          </div>}
          <dl className="crypto-daily-metrics">
            <div><dt>{copy.price}</dt><dd>{formatClose(selected.close, selected.currency, locale)}</dd></div>
            <div><dt>{copy.change}</dt><dd className={changeState(selected.changePercent)}>{formatChange(selected.changePercent, locale)}</dd></div>
            <div><dt>{copy.volume}</dt><dd>{formatVolume(selected.volume, locale)} {selected.symbol}</dd></div>
            <div><dt>{copy.source}</dt><dd><a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceName}</a></dd></div>
            <div className="crypto-daily-attribution"><dt>{copy.source}</dt><dd>{selected.attribution}</dd></div>
          </dl>
        </div>}
        <div className="crypto-daily-table platform-table-scroll">
          <table className="platform-table"><thead><tr><th>{ui.directoryTitle}</th><th>{copy.price}</th><th>{copy.change}</th><th>{copy.volume}</th><th>{copy.source}</th></tr></thead>
            <tbody>{priceRows.map((row) => <tr key={row.assetId}>
              <th scope="row">{row.symbol}</th><td>{formatClose(row.close, row.currency, locale)}</td>
              <td className={changeState(row.changePercent)}>{formatChange(row.changePercent, locale)}</td>
              <td>{formatVolume(row.volume, locale)} {row.symbol}</td><td><a href={row.sourceUrl} target="_blank" rel="noreferrer">{row.sourceName}</a></td>
            </tr>)}</tbody>
          </table>
        </div>
      </> : <>
        <ul className="crypto-directory-list" aria-label={ui.directoryTitle}>
          {referenceRows.map((asset) => <li key={asset.symbol}>
            <strong>{locale === "ko" && "aliases" in asset && asset.aliases[0] ? asset.aliases[0] : asset.name}</strong>
            <span>{asset.name !== asset.symbol ? `${asset.name} · ` : ""}<b>{asset.symbol}</b></span>
          </li>)}
        </ul>
        {!visibleAssets.length && <p className="crypto-directory-empty" role="status">{ui.noResults}</p>}
        {!pending && visibleAssets.length > 0 && <aside className="crypto-rights-status" aria-labelledby="crypto-rights-title">
          <span className="crypto-rights-indicator" aria-hidden="true" />
          <div><h3 id="crypto-rights-title">{copy.unavailableTitle}</h3><p>{copy.unavailableBody}</p>
            <p className="crypto-rights-providers">{copy.source}: <a href="https://docs.upbit.com/kr/reference" target="_blank" rel="noreferrer">Upbit</a> · <a href="https://apidocs.bithumb.com/" target="_blank" rel="noreferrer">Bithumb</a> · <a href="https://developers.binance.com/en/docs/products/spot/rest-api" target="_blank" rel="noreferrer">Binance</a> · <a href="https://www.coingecko.com/en/api_terms" target="_blank" rel="noreferrer">CoinGecko</a></p>
          </div>
        </aside>}
      </>}
    </section>

    <section className="crypto-issue-link"><h2>{copy.issues}</h2><p>{copy.issueDescription}</p><Link href={`/${locale}/crypto/issues`}>{copy.issueTitle}</Link></section>
  </>;
}

function CoinrankingMarket({ locale, copy, searchLabel, searchPlaceholder }: { locale: Locale; copy: ReturnType<typeof getCryptoPageCopy>; searchLabel: string; searchPlaceholder: string }) {
  const labels = coinrankingLabels[locale];
  const [payload, setPayload] = useState<CoinrankingPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedUuid, setSelectedUuid] = useState("");
  const [period, setPeriod] = useState("7d");
  const [history, setHistory] = useState<CoinrankingHistoryPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/portal-api/finance/crypto/coinranking", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as CoinrankingPayload : null)
      .then((result) => { if (!controller.signal.aborted && result?.data?.length) { setPayload(result); setSelectedUuid(result.data[0].uuid); } })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const normalizedQuery = normalize(query.trim());
  const visible = (payload?.data ?? []).filter((coin) => !normalizedQuery || [coin.symbol, coin.name, ...coin.aliases].some((value) => normalize(value).includes(normalizedQuery)));
  const selected = visible.find((coin) => coin.uuid === selectedUuid) ?? visible[0];

  async function loadChart() {
    if (!selected) return;
    setLoadingChart(true);
    try {
      const response = await fetch(`/portal-api/finance/crypto/coinranking/${encodeURIComponent(selected.uuid)}/history?period=${period}`, { cache: "no-store" });
      const result = response.ok ? await response.json() as { data?: CoinrankingHistoryPoint[] } : null;
      setHistory(result?.data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingChart(false);
    }
  }

  if (!payload?.data?.length) return null;
  return <section className="crypto-daily-dashboard coinranking-market" aria-labelledby="coinranking-market-heading">
    <header className="crypto-daily-heading">
      <div><span className="platform-eyebrow">{copy.market} · USD</span><h2 id="coinranking-market-heading">{labels.current}</h2></div>
      <label className="crypto-directory-search"><span>{searchLabel}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} autoComplete="off" /></label>
    </header>
    <p className="crypto-daily-asof"><span>{labels.observed}</span><strong>{payload.observedAt}</strong><span>·</span><a href={payload.sourceUrl} target="_blank" rel="noreferrer">{payload.attribution}</a></p>
    <div className="crypto-daily-heatmap" aria-label={labels.change24h}>
      {visible.map((coin) => <button key={coin.uuid} type="button" className={`crypto-daily-tile ${changeState(coin.change24hPercent)}${selected?.uuid === coin.uuid ? " is-selected" : ""}`} onClick={() => { setSelectedUuid(coin.uuid); setHistory([]); }} aria-pressed={selected?.uuid === coin.uuid}>
        <span>{locale === "ko" && coin.aliases.at(-1) ? coin.aliases.at(-1) : coin.name} <b>{coin.symbol}</b></span>
        <strong>{formatClose(coin.price, "USD", locale)}</strong>
        <small>{labels.change24h}: {formatChange(coin.change24hPercent, locale)}</small>
      </button>)}
    </div>
    {selected && <div className="crypto-daily-detail">
      <dl className="crypto-daily-metrics">
        <div><dt>{labels.current}</dt><dd>{formatClose(selected.price, "USD", locale)}</dd></div>
        <div><dt>{labels.change24h}</dt><dd className={changeState(selected.change24hPercent)}>{formatChange(selected.change24hPercent, locale)}</dd></div>
        {selected.marketCap && <div><dt>{copy.marketCap}</dt><dd>{formatClose(selected.marketCap, "USD", locale)}</dd></div>}
        {selected.volume24h && <div><dt>{copy.volume} (24h)</dt><dd>{formatClose(selected.volume24h, "USD", locale)}</dd></div>}
      </dl>
      <div className="crypto-daily-controls">
        <label><span>{labels.chart}</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7d">7d</option><option value="30d">30d</option><option value="3m">90d</option><option value="1y">1y</option></select></label>
        <button type="button" onClick={loadChart} disabled={loadingChart}>{loadingChart ? copy.sourcePending : labels.loadChart}</button>
      </div>
      {history.length > 1 && <div className="crypto-daily-chart-panel"><h3>{selected.name} · {labels.chart}</h3><CoinrankingPriceChart points={history} title={`${selected.symbol} ${labels.chart}`} /></div>}
      <p className="crypto-daily-attribution">{labels.observed}: {selected.observedAt} UTC · <a href={payload.sourceUrl} target="_blank" rel="noreferrer">{payload.attribution}</a></p>
    </div>}
  </section>;
}

function CoinrankingPriceChart({ points, title }: { points: CoinrankingHistoryPoint[]; title: string }) {
  const values = points.map(({ price }) => Number(price)).filter(Number.isFinite);
  if (values.length < 2) return null;
  const low = Math.min(...values); const high = Math.max(...values); const range = high - low || 1;
  const coordinates = points.map((point, index) => `${(index / (points.length - 1)) * 100},${92 - ((Number(point.price) - low) / range) * 80}`).join(" ");
  return <svg className="crypto-daily-chart" viewBox="0 0 100 100" role="img" aria-label={title} preserveAspectRatio="none"><line x1="0" y1="92" x2="100" y2="92" /><polyline points={coordinates} /></svg>;
}

export function CryptoDashboardLoading({ locale }: { locale: Locale }) {
  const copy = getCryptoPageCopy(locale);
  return <section className="crypto-empty-state"><h1>{copy.title}</h1><p>{copy.unavailableBody}</p></section>;
}
