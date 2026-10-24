import type { Locale } from "@/lib/site";

type CompanyFactsStatusCopy = { factsLoaded: string; netIncomeGrowth: string; lastSecSuccess: string };

export const companyFactsStatusCopy: Record<Locale, CompanyFactsStatusCopy> = {
  ko: { factsLoaded: "재무 관측값 적재", netIncomeGrowth: "전년 대비 순이익 성장률", lastSecSuccess: "최근 SEC 수집 성공" },
  en: { factsLoaded: "Financial facts loaded", netIncomeGrowth: "Net income growth year over year", lastSecSuccess: "Last successful SEC collection" },
  ja: { factsLoaded: "財務データ取得", netIncomeGrowth: "純利益の前年比成長率", lastSecSuccess: "SECデータの最終成功取得" },
  zh: { factsLoaded: "财务数据载入时间", netIncomeGrowth: "净利润同比增长率", lastSecSuccess: "SEC 最近一次成功采集" },
  es: { factsLoaded: "Datos financieros cargados", netIncomeGrowth: "Crecimiento interanual del beneficio neto", lastSecSuccess: "Última recopilación de SEC correcta" },
  "pt-br": { factsLoaded: "Dados financeiros carregados", netIncomeGrowth: "Crescimento anual do lucro líquido", lastSecSuccess: "Última coleta bem-sucedida da SEC" },
  de: { factsLoaded: "Finanzdaten geladen", netIncomeGrowth: "Jahreswachstum des Nettogewinns", lastSecSuccess: "Letzte erfolgreiche SEC-Erfassung" },
  fr: { factsLoaded: "Données financières chargées", netIncomeGrowth: "Croissance annuelle du résultat net", lastSecSuccess: "Dernière collecte SEC réussie" },
  vi: { factsLoaded: "Thời điểm tải dữ liệu tài chính", netIncomeGrowth: "Tăng trưởng lợi nhuận ròng so với cùng kỳ năm trước", lastSecSuccess: "Lần thu thập SEC thành công gần nhất" },
  id: { factsLoaded: "Data keuangan dimuat", netIncomeGrowth: "Pertumbuhan laba bersih tahunan", lastSecSuccess: "Pengumpulan SEC terakhir yang berhasil" },
  th: { factsLoaded: "เวลาที่โหลดข้อมูลการเงิน", netIncomeGrowth: "การเติบโตของกำไรสุทธิเมื่อเทียบกับปีก่อน", lastSecSuccess: "เวลาที่เก็บข้อมูล SEC สำเร็จล่าสุด" },
  "zh-tw": { factsLoaded: "財務資料載入時間", netIncomeGrowth: "淨利年增率", lastSecSuccess: "SEC 最近一次成功擷取" },
  it: { factsLoaded: "Dati finanziari caricati", netIncomeGrowth: "Crescita annua dell’utile netto", lastSecSuccess: "Ultima raccolta SEC riuscita" },
  nl: { factsLoaded: "Financiële gegevens geladen", netIncomeGrowth: "Jaarlijkse groei van de nettowinst", lastSecSuccess: "Laatste geslaagde SEC-verzameling" },
  hi: { factsLoaded: "वित्तीय डेटा लोड होने का समय", netIncomeGrowth: "शुद्ध आय में साल-दर-साल वृद्धि", lastSecSuccess: "SEC डेटा का पिछला सफल संग्रह" },
  ru: { factsLoaded: "Время загрузки финансовых данных", netIncomeGrowth: "Рост чистой прибыли год к году", lastSecSuccess: "Последний успешный сбор SEC" },
  tr: { factsLoaded: "Finansal verilerin yüklenme zamanı", netIncomeGrowth: "Yıllık net gelir artışı", lastSecSuccess: "Son başarılı SEC veri toplama" },
  pl: { factsLoaded: "Czas wczytania danych finansowych", netIncomeGrowth: "Roczny wzrost zysku netto", lastSecSuccess: "Ostatnie udane pobranie danych SEC" },
  fil: { factsLoaded: "Oras ng pag-load ng datos pampinansyal", netIncomeGrowth: "Taunang paglago ng netong kita", lastSecSuccess: "Huling matagumpay na pagkuha ng SEC" },
  bn: { factsLoaded: "আর্থিক তথ্য লোডের সময়", netIncomeGrowth: "বছরওয়ারি নিট আয়ের বৃদ্ধি", lastSecSuccess: "SEC তথ্যের সর্বশেষ সফল সংগ্রহ" },
  uk: { factsLoaded: "Час завантаження фінансових даних", netIncomeGrowth: "Зростання чистого прибутку за рік", lastSecSuccess: "Останній успішний збір даних SEC" },
  ms: { factsLoaded: "Masa data kewangan dimuatkan", netIncomeGrowth: "Pertumbuhan pendapatan bersih tahunan", lastSecSuccess: "Pengumpulan SEC terakhir yang berjaya" },
  sv: { factsLoaded: "Tid då finansdata hämtades", netIncomeGrowth: "Årlig tillväxt av nettoresultatet", lastSecSuccess: "Senaste lyckade SEC-insamling" },
  cs: { factsLoaded: "Čas načtení finančních údajů", netIncomeGrowth: "Meziroční růst čistého zisku", lastSecSuccess: "Poslední úspěšné načtení SEC" },
  ro: { factsLoaded: "Ora încărcării datelor financiare", netIncomeGrowth: "Creșterea anuală a profitului net", lastSecSuccess: "Ultima colectare SEC reușită" },
  el: { factsLoaded: "Ώρα φόρτωσης οικονομικών στοιχείων", netIncomeGrowth: "Ετήσια αύξηση καθαρών κερδών", lastSecSuccess: "Τελευταία επιτυχής συλλογή SEC" },
};
