import type { Locale } from "@/lib/site";

type CompanyFactsStatusCopy = { factsLoaded: string; netIncomeGrowth: string };

export const companyFactsStatusCopy: Record<Locale, CompanyFactsStatusCopy> = {
  ko: { factsLoaded: "재무 관측값 적재", netIncomeGrowth: "전년 대비 순이익 성장률" },
  en: { factsLoaded: "Financial facts loaded", netIncomeGrowth: "Net income growth year over year" },
  ja: { factsLoaded: "財務データ取得", netIncomeGrowth: "純利益の前年比成長率" },
  zh: { factsLoaded: "财务数据载入时间", netIncomeGrowth: "净利润同比增长率" },
  es: { factsLoaded: "Datos financieros cargados", netIncomeGrowth: "Crecimiento interanual del beneficio neto" },
  "pt-br": { factsLoaded: "Dados financeiros carregados", netIncomeGrowth: "Crescimento anual do lucro líquido" },
  de: { factsLoaded: "Finanzdaten geladen", netIncomeGrowth: "Jahreswachstum des Nettogewinns" },
  fr: { factsLoaded: "Données financières chargées", netIncomeGrowth: "Croissance annuelle du résultat net" },
  vi: { factsLoaded: "Thời điểm tải dữ liệu tài chính", netIncomeGrowth: "Tăng trưởng lợi nhuận ròng so với cùng kỳ năm trước" },
  id: { factsLoaded: "Data keuangan dimuat", netIncomeGrowth: "Pertumbuhan laba bersih tahunan" },
  th: { factsLoaded: "เวลาที่โหลดข้อมูลการเงิน", netIncomeGrowth: "การเติบโตของกำไรสุทธิเมื่อเทียบกับปีก่อน" },
  "zh-tw": { factsLoaded: "財務資料載入時間", netIncomeGrowth: "淨利年增率" },
  it: { factsLoaded: "Dati finanziari caricati", netIncomeGrowth: "Crescita annua dell’utile netto" },
  nl: { factsLoaded: "Financiële gegevens geladen", netIncomeGrowth: "Jaarlijkse groei van de nettowinst" },
  hi: { factsLoaded: "वित्तीय डेटा लोड होने का समय", netIncomeGrowth: "शुद्ध आय में साल-दर-साल वृद्धि" },
  ru: { factsLoaded: "Время загрузки финансовых данных", netIncomeGrowth: "Рост чистой прибыли год к году" },
  tr: { factsLoaded: "Finansal verilerin yüklenme zamanı", netIncomeGrowth: "Yıllık net gelir artışı" },
  pl: { factsLoaded: "Czas wczytania danych finansowych", netIncomeGrowth: "Roczny wzrost zysku netto" },
  fil: { factsLoaded: "Oras ng pag-load ng datos pampinansyal", netIncomeGrowth: "Taunang paglago ng netong kita" },
  bn: { factsLoaded: "আর্থিক তথ্য লোডের সময়", netIncomeGrowth: "বছরওয়ারি নিট আয়ের বৃদ্ধি" },
  uk: { factsLoaded: "Час завантаження фінансових даних", netIncomeGrowth: "Зростання чистого прибутку за рік" },
  ms: { factsLoaded: "Masa data kewangan dimuatkan", netIncomeGrowth: "Pertumbuhan pendapatan bersih tahunan" },
  sv: { factsLoaded: "Tid då finansdata hämtades", netIncomeGrowth: "Årlig tillväxt av nettoresultatet" },
  cs: { factsLoaded: "Čas načtení finančních údajů", netIncomeGrowth: "Meziroční růst čistého zisku" },
  ro: { factsLoaded: "Ora încărcării datelor financiare", netIncomeGrowth: "Creșterea anuală a profitului net" },
  el: { factsLoaded: "Ώρα φόρτωσης οικονομικών στοιχείων", netIncomeGrowth: "Ετήσια αύξηση καθαρών κερδών" },
};
