import type { Locale } from "@/lib/site";

export type SecSector = "information-technology" | "semiconductors" | "financials" | "healthcare" | "consumer" | "energy" | "industrials" | "communications" | "utilities" | "real-estate";
type ExtraCopy = { sortBy: string; growth: string; sectors: Record<"semiconductors" | "communications" | "utilities" | "real-estate", string> };

export const companyFactsExtraCopy: Record<Locale, ExtraCopy> = {
  ko: { sortBy: "정렬 기준", growth: "전년 대비 매출 성장률", sectors: { semiconductors: "반도체", communications: "통신·미디어", utilities: "공익사업", "real-estate": "부동산" } },
  en: { sortBy: "Sort by", growth: "Revenue growth year over year", sectors: { semiconductors: "Semiconductors", communications: "Communications", utilities: "Utilities", "real-estate": "Real estate" } },
  ja: { sortBy: "並べ替え", growth: "売上高の前年比成長率", sectors: { semiconductors: "半導体", communications: "通信・メディア", utilities: "公益事業", "real-estate": "不動産" } },
  zh: { sortBy: "排序方式", growth: "营收同比增长率", sectors: { semiconductors: "半导体", communications: "通信与媒体", utilities: "公用事业", "real-estate": "房地产" } },
  es: { sortBy: "Ordenar por", growth: "Crecimiento interanual de ingresos", sectors: { semiconductors: "Semiconductores", communications: "Comunicaciones", utilities: "Servicios públicos", "real-estate": "Inmobiliario" } },
  "pt-br": { sortBy: "Ordenar por", growth: "Crescimento anual da receita", sectors: { semiconductors: "Semicondutores", communications: "Comunicações", utilities: "Serviços públicos", "real-estate": "Imobiliário" } },
  de: { sortBy: "Sortieren nach", growth: "Umsatzwachstum gegenüber Vorjahr", sectors: { semiconductors: "Halbleiter", communications: "Kommunikation", utilities: "Versorger", "real-estate": "Immobilien" } },
  fr: { sortBy: "Trier par", growth: "Croissance annuelle du chiffre d’affaires", sectors: { semiconductors: "Semi-conducteurs", communications: "Communications", utilities: "Services aux collectivités", "real-estate": "Immobilier" } },
  vi: { sortBy: "Sắp xếp theo", growth: "Tăng trưởng doanh thu so với cùng kỳ năm trước", sectors: { semiconductors: "Chất bán dẫn", communications: "Truyền thông", utilities: "Dịch vụ tiện ích", "real-estate": "Bất động sản" } },
  id: { sortBy: "Urutkan berdasarkan", growth: "Pertumbuhan pendapatan tahunan", sectors: { semiconductors: "Semikonduktor", communications: "Komunikasi", utilities: "Utilitas", "real-estate": "Properti" } },
  th: { sortBy: "เรียงตาม", growth: "การเติบโตของรายได้เทียบปีก่อน", sectors: { semiconductors: "เซมิคอนดักเตอร์", communications: "สื่อสาร", utilities: "สาธารณูปโภค", "real-estate": "อสังหาริมทรัพย์" } },
  "zh-tw": { sortBy: "排序方式", growth: "營收年增率", sectors: { semiconductors: "半導體", communications: "通訊與媒體", utilities: "公用事業", "real-estate": "不動產" } },
  it: { sortBy: "Ordina per", growth: "Crescita annua dei ricavi", sectors: { semiconductors: "Semiconduttori", communications: "Comunicazioni", utilities: "Servizi pubblici", "real-estate": "Immobiliare" } },
  nl: { sortBy: "Sorteren op", growth: "Omzetgroei op jaarbasis", sectors: { semiconductors: "Halfgeleiders", communications: "Communicatie", utilities: "Nutsbedrijven", "real-estate": "Vastgoed" } },
  hi: { sortBy: "इसके अनुसार क्रमबद्ध करें", growth: "वर्ष-दर-वर्ष राजस्व वृद्धि", sectors: { semiconductors: "सेमीकंडक्टर", communications: "संचार", utilities: "उपयोगिताएँ", "real-estate": "अचल संपत्ति" } },
  ru: { sortBy: "Сортировать по", growth: "Рост выручки год к году", sectors: { semiconductors: "Полупроводники", communications: "Связь и медиа", utilities: "Коммунальные услуги", "real-estate": "Недвижимость" } },
  tr: { sortBy: "Sıralama ölçütü", growth: "Yıllık gelir artışı", sectors: { semiconductors: "Yarı iletkenler", communications: "İletişim", utilities: "Kamu hizmetleri", "real-estate": "Gayrimenkul" } },
  pl: { sortBy: "Sortuj według", growth: "Roczny wzrost przychodów", sectors: { semiconductors: "Półprzewodniki", communications: "Komunikacja", utilities: "Usługi komunalne", "real-estate": "Nieruchomości" } },
  fil: { sortBy: "Pagbukud-bukurin ayon sa", growth: "Taunang paglago ng kita", sectors: { semiconductors: "Semiconductor", communications: "Komunikasyon", utilities: "Mga serbisyong pampubliko", "real-estate": "Real estate" } },
  bn: { sortBy: "যে ক্রমে সাজাবেন", growth: "বছরওয়ারি আয় বৃদ্ধি", sectors: { semiconductors: "সেমিকন্ডাক্টর", communications: "যোগাযোগ", utilities: "পরিষেবা সংস্থা", "real-estate": "রিয়েল এস্টেট" } },
  uk: { sortBy: "Сортувати за", growth: "Річне зростання доходу", sectors: { semiconductors: "Напівпровідники", communications: "Зв’язок і медіа", utilities: "Комунальні послуги", "real-estate": "Нерухомість" } },
  ms: { sortBy: "Isih mengikut", growth: "Pertumbuhan hasil tahunan", sectors: { semiconductors: "Semikonduktor", communications: "Komunikasi", utilities: "Utiliti", "real-estate": "Hartanah" } },
  sv: { sortBy: "Sortera efter", growth: "Omsättningstillväxt jämfört med föregående år", sectors: { semiconductors: "Halvledare", communications: "Kommunikation", utilities: "Samhällsservice", "real-estate": "Fastigheter" } },
  cs: { sortBy: "Seřadit podle", growth: "Meziroční růst tržeb", sectors: { semiconductors: "Polovodiče", communications: "Komunikace", utilities: "Veřejné služby", "real-estate": "Nemovitosti" } },
  ro: { sortBy: "Sortează după", growth: "Creșterea anuală a veniturilor", sectors: { semiconductors: "Semiconductori", communications: "Comunicații", utilities: "Utilități", "real-estate": "Imobiliare" } },
  el: { sortBy: "Ταξινόμηση κατά", growth: "Ετήσια αύξηση εσόδων", sectors: { semiconductors: "Ημιαγωγοί", communications: "Επικοινωνίες", utilities: "Υπηρεσίες κοινής ωφέλειας", "real-estate": "Ακίνητα" } },
};

export function companySectorLabel(locale: Locale, sector: string, base: Record<string, string>) {
  if (sector === "semiconductors" || sector === "communications" || sector === "utilities" || sector === "real-estate") return companyFactsExtraCopy[locale].sectors[sector];
  const key: Record<string, string> = { "information-technology": "Technology", financials: "Finance", healthcare: "Health", consumer: "Consumer", energy: "Energy", industrials: "Industrials" };
  return base[key[sector] ?? ""] ?? sector;
}
