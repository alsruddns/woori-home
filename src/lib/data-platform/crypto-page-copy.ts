import type { Locale } from "@/lib/site";
import { cryptoCopy } from "./crypto-copy";

const dailyMarketDescription: Record<Locale, string> = {
  ko: "거래소에서 확정된 일봉을 사용합니다. KRW는 한국시간(KST), USDT는 UTC 기준입니다.",
  en: "Uses finalized exchange daily candles: KST for KRW markets and UTC for USDT markets.",
  ja: "取引所で確定した日足を使用します。KRW市場は韓国標準時（KST）、USDT市場はUTC基準です。",
  zh: "使用交易所已完成的日线数据：KRW 市场按韩国标准时间（KST），USDT 市场按 UTC。",
  es: "Usa velas diarias cerradas del mercado: KST para KRW y UTC para USDT.",
  "pt-br": "Usa candles diários fechados da corretora: KST para mercados KRW e UTC para USDT.",
  de: "Verwendet abgeschlossene Tageskerzen der Börse: KST für KRW- und UTC für USDT-Märkte.",
  fr: "Utilise les chandelles journalières clôturées de la plateforme : KST pour KRW et UTC pour USDT.",
  vi: "Dùng nến ngày đã chốt của sàn: KST cho thị trường KRW và UTC cho thị trường USDT.",
  id: "Menggunakan candle harian bursa yang sudah ditutup: KST untuk pasar KRW dan UTC untuk USDT.",
  th: "ใช้แท่งราคารายวันที่ปิดแล้วของตลาด โดยใช้ KST สำหรับตลาด KRW และ UTC สำหรับตลาด USDT",
  "zh-tw": "使用交易所已完成的日線資料：KRW 市場採韓國標準時間（KST），USDT 市場採 UTC。",
  it: "Usa le candele giornaliere chiuse dell'exchange: KST per i mercati KRW e UTC per quelli USDT.",
  nl: "Gebruikt afgesloten dagkaarsen van de beurs: KST voor KRW-markten en UTC voor USDT-markten.",
  hi: "एक्सचेंज की पूरी हुई दैनिक कैंडल का उपयोग करता है: KRW बाज़ारों के लिए KST और USDT बाज़ारों के लिए UTC।",
  ru: "Используются завершённые дневные свечи биржи: KST для рынков KRW и UTC для рынков USDT.",
  tr: "Borsanın tamamlanmış günlük mumlarını kullanır: KRW piyasaları için KST, USDT piyasaları için UTC.",
  pl: "Używa zamkniętych świec dziennych giełdy: KST dla rynków KRW i UTC dla rynków USDT.",
  fil: "Gumagamit ng kumpletong daily candle ng exchange: KST para sa KRW at UTC para sa USDT.",
  bn: "এক্সচেঞ্জের সম্পূর্ণ দৈনিক ক্যান্ডেল ব্যবহার করা হয়: KRW বাজারে KST এবং USDT বাজারে UTC।",
  uk: "Використовуються завершені денні свічки біржі: KST для ринків KRW і UTC для ринків USDT.",
  ms: "Menggunakan candle harian bursa yang telah ditutup: KST untuk pasaran KRW dan UTC untuk USDT.",
  sv: "Använder börsens avslutade dagsstaplar: KST för KRW-marknader och UTC för USDT-marknader.",
  cs: "Používají se uzavřené denní svíčky burzy: KST pro trhy KRW a UTC pro trhy USDT.",
  ro: "Folosește lumânările zilnice închise ale bursei: KST pentru piețele KRW și UTC pentru cele USDT.",
  el: "Χρησιμοποιούνται ολοκληρωμένα ημερήσια κεριά του ανταλλακτηρίου: KST για αγορές KRW και UTC για αγορές USDT.",
};

export function getCryptoPageCopy(locale: Locale) {
  const copy = cryptoCopy[locale];
  const localized = { ...copy, description: dailyMarketDescription[locale] };
  if (locale === "cs") return { ...localized, nav: "Kryptoměny", title: "Denní trh s kryptoměnami" };
  return localized;
}
