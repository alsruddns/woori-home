import Link from "next/link";
import { GlobalDataBriefing } from "./global-data-briefing";
import { hreflangFor, type Locale } from "@/lib/site";
import { familySiteHref, familySitesCopy } from "@/lib/family-sites";
import { platformCopy } from "@/lib/data-platform/locales";
import { indicators } from "@/lib/data-platform/registry";
import { latestForCountry } from "@/lib/data-platform/snapshot";
import { stockCopy } from "@/lib/data-platform/stock-copy";
import { countryCopy } from "@/lib/data-platform/country-copy";
import { mockStockSnapshots } from "@/lib/data-platform/mock-stocks";
import { energyAccessCopy, energyPageCopy } from "@/lib/data-platform/energy-copy";
import { scienceCopy } from "@/lib/data-platform/science-copy";
import neoSnapshot from "@/data/nasa-neows.json";
import { goldCopy } from "@/lib/data-platform/gold-copy";

const viewLabels: Record<Locale, string> = {
  ko:"데이터 보기", en:"Explore data", ja:"データを見る", zh:"查看数据", es:"Ver datos", "pt-br":"Ver dados", de:"Daten ansehen", fr:"Voir les données", vi:"Xem dữ liệu", id:"Lihat data", th:"ดูข้อมูล", "zh-tw":"查看資料", it:"Visualizza i dati", nl:"Bekijk gegevens", hi:"डेटा देखें",
};

export function PlatformHome({ locale }: { locale: Locale }) {
  const copy = platformCopy[locale];
  const stocks = stockCopy[locale];
  const countries = countryCopy[locale];
  const familyCopy = familySitesCopy[locale];
  const population = latestForCountry("SP.POP.TOTL", "WLD");
  const gdp = latestForCountry("NY.GDP.MKTP.CD", "WLD");
  const electricityAccess = latestForCountry("EG.ELC.ACCS.ZS", "WLD");
  const populationIndicator = indicators.find((item) => item.id === "population")!;
  const gdpIndicator = indicators.find((item) => item.id === "gdp")!;
  const latestSample = Object.values(mockStockSnapshots).filter(Boolean).map((snapshot) => snapshot!.asOf).sort().at(-1);
  const cards = [
    { href: `/${locale}/world`, title: copy.categories[0], detail: copy.overviewBody },
    { href: `/${locale}/economy/gdp`, title: copy.categories[1], detail: gdpIndicator.definition?.[locale] ?? copy.overviewBody },
    { href: `/${locale}/world/population`, title: copy.categories[3], detail: populationIndicator.definition?.[locale] ?? copy.overviewBody },
    { href: `/${locale}/countries`, title: copy.categories[5], detail: countries.dataGapNote },
    { href: `/${locale}/gold`, title: goldCopy[locale].title, detail: goldCopy[locale].description },
    { href: `/${locale}/stocks`, title: copy.categories[2], detail: stocks.description, sample: true },
  ];
  const scienceDate = neoSnapshot.dates[0];
  const scienceCount = neoSnapshot.objects.filter((item) => item.closeApproachDate === scienceDate).length;
  const familyKeys = ["portal", "calculator", "tools", "moneyBook", "docs", "quiz"] as const;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WOORI.TODAY",
    url: `https://www.woori.today/${locale}`,
    inLanguage: hreflangFor(locale),
    hasPart: familyKeys.map((key) => ({ "@type": "WebSite", name: familyCopy.sites[key], url: `https://www.woori.today${familySiteHref(locale, key)}` })),
  };
  const format = (value: number, maximumFractionDigits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  const date = (value?: string) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : copy.missing;
  const extensions = [
    { href: `/${locale}/energy`, title: copy.categories[4], detail: energyPageCopy[locale].intro, value: electricityAccess ? `${format(electricityAccess.value, 1)}%` : copy.missing, meta: electricityAccess ? `${energyPageCopy[locale].dateLabel}: ${electricityAccess.year} · ${energyAccessCopy[locale].source}` : copy.notAvailable },
    { href: `/${locale}/science`, title: scienceCopy[locale].title, detail: scienceCopy[locale].description, value: format(scienceCount), meta: `${scienceCopy[locale].date}: ${date(scienceDate)} · ${scienceCopy[locale].source}` },
  ];

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <header className="platform-page-heading platform-home-heading"><span className="platform-eyebrow">{copy.dataSource} · World Bank</span><h1>{copy.overview}</h1><p>{copy.overviewBody}</p></header>
    <GlobalDataBriefing locale={locale} />
    <section className="platform-home-summary" aria-label={copy.latest}>
      <article><span>{populationIndicator.label[locale]}</span><strong>{population ? format(population.value) : copy.missing}</strong><small>{population ? `${copy.referenceYear}: ${population.year}` : copy.notAvailable}</small></article>
      <article><span>{gdpIndicator.label[locale]}</span><strong>{gdp ? new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(gdp.value) : copy.missing}</strong><small>{gdp ? `${copy.referenceYear}: ${gdp.year}` : copy.notAvailable}</small></article>
    </section>
    <section className="platform-home-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{copy.indicators}</span><h2>{copy.overview}</h2></div></div>
      <div className="platform-home-grid">{cards.map((card) => <article className="platform-home-card" key={card.href}>
        <Link href={card.href}><h3>{card.title}</h3><p>{card.detail}</p><span className="platform-home-link">{viewLabels[locale]} →</span></Link>
        {card.sample ? <div className="platform-home-sample"><strong>{stocks.statusLabel} · {date(latestSample)}</strong><span>{stocks.mockLabel}</span><p>{stocks.mockDisclosure}</p></div> : null}
      </article>)}</div>
    </section>
    <section className="platform-home-section platform-home-extensions"><div className="platform-section-heading"><div><span className="platform-eyebrow">{copy.indicators}</span><h2>{extensions.map((item) => item.title).join(" · ")}</h2></div></div>
      <div className="platform-home-grid">{extensions.map((item) => <article className="platform-home-card" key={item.href}><Link href={item.href}><h3>{item.title}</h3><p>{item.detail}</p><strong>{item.value}</strong><span className="platform-card-meta">{item.meta}</span><span className="platform-home-link">{viewLabels[locale]} →</span></Link></article>)}</div>
    </section>
    <p className="platform-home-about"><Link href={`/${locale}/about`}>{copy.categories[7]} →</Link></p>
    <p className="platform-home-source">{countries.sourceNote}</p>
  </>;
}
