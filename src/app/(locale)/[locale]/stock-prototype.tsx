import Link from "next/link";
import type { Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { stockMarkets } from "@/lib/data-platform/registry";
import { mockStockSnapshots } from "@/lib/data-platform/mock-stocks";

const warning: Record<Locale, string> = {
  ko: "개발용 목업 데이터 · 실제 시장 데이터가 아니며 출처·재배포 권한을 확인하지 않았습니다.", en: "DEVELOPMENT MOCK DATA · Not real market data. Source and redistribution rights have not been verified.", ja: "開発用の仮データ · 実際の市場データではなく、出典と再配布権は未確認です。", zh: "开发用模拟数据 · 并非真实市场数据，来源和再分发权尚未核实。", es: "DATOS SIMULADOS DE DESARROLLO · No son datos reales; no se han verificado la fuente ni los derechos de redistribución.", "pt-br": "DADOS DE TESTE · Não são dados reais; a fonte e os direitos de redistribuição não foram verificados.", de: "ENTWICKLUNGS-MOCKDATEN · Keine echten Marktdaten; Quelle und Weitergaberechte sind ungeprüft.", fr: "DONNÉES FICTIVES DE DÉVELOPPEMENT · Elles ne sont pas réelles et les droits de source et de redistribution ne sont pas vérifiés.", vi: "DỮ LIỆU MẪU PHÁT TRIỂN · Không phải dữ liệu thị trường thật; nguồn và quyền phân phối lại chưa được xác minh.", id: "DATA SIMULASI PENGEMBANGAN · Bukan data pasar nyata; sumber dan hak redistribusi belum diverifikasi.", th: "ข้อมูลจำลองสำหรับพัฒนา · ไม่ใช่ข้อมูลตลาดจริง และยังไม่ได้ตรวจสอบแหล่งที่มาหรือสิทธิ์เผยแพร่ซ้ำ", "zh-tw": "開發用模擬資料 · 非真實市場資料，來源與再散布權尚未確認。", it: "DATI SIMULATI DI SVILUPPO · Non sono dati reali; fonte e diritti di ridistribuzione non sono verificati.", nl: "ONTWIKKELINGSMOCKDATA · Geen echte marktgegevens; bron en herdistributierechten zijn niet gecontroleerd.", hi: "विकास हेतु नमूना डेटा · यह वास्तविक बाज़ार डेटा नहीं है; स्रोत और पुनर्वितरण अधिकार सत्यापित नहीं हैं।",
};

export function StockPrototype({ locale }: { locale: Locale }) {
  const copy = platformCopy[locale]; const snapshot = mockStockSnapshots.us;
  const total = snapshot.securities.reduce((sum, item) => sum + item.marketCap, 0);
  return <><nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{copy.categories[0]}</Link><span>/</span><span>{copy.categories[2]}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">WOORI.DATA / MARKET SNAPSHOT UI</span><h1>{copy.categories[2]}</h1><p>{copy.notAvailable}</p></header>
    <p className="platform-mock-warning" role="note">{warning[locale]}</p>
    <section className="platform-market-tabs" aria-label={copy.categories[2]}>{stockMarkets.map((market, index) => <span className={index === 0 ? "is-selected" : ""} key={market.id}>{market.name}</span>)}</section>
    <section className="platform-section-heading platform-market-meta"><div><span className="platform-eyebrow">{snapshot.market.toUpperCase()} · {snapshot.asOf}</span><h2>Market breadth prototype</h2></div><span>{snapshot.securities.length} mock securities</span></section>
    <section className="platform-treemap" aria-label="Treemap preview based on clearly labeled mock data">{snapshot.securities.map((item) => <div key={item.symbol} className={item.changePercent >= 0 ? "platform-stock-tile is-up" : "platform-stock-tile is-down"} style={{ flexBasis: `${Math.max(11, item.marketCap / total * 100)}%` }}><strong>{item.symbol}</strong><span>{item.name}</span><small>{item.changePercent > 0 ? "+" : ""}{item.changePercent}%</small></div>)}</section>
    <section className="platform-table-section"><div className="platform-section-heading"><h2>Snapshot schema preview</h2><span>Market cap weighted layout</span></div><div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>Symbol</th><th>Sector</th><th>Market cap</th><th>Change</th></tr></thead><tbody>{snapshot.securities.map((item) => <tr key={item.symbol}><th scope="row">{item.symbol} · {item.name}</th><td>{item.sector}</td><td>{new Intl.NumberFormat(locale).format(item.marketCap)} {snapshot.currency} bn</td><td>{item.changePercent}%</td></tr>)}</tbody></table></div></section>
  </>;
}
