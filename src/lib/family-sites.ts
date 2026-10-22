import type { Locale } from "./site";

export const familySiteKeys = ["portal", "calculator", "tools", "moneyBook", "docs", "quiz"] as const;
export type FamilySiteKey = (typeof familySiteKeys)[number];

const familySiteSegments: Record<FamilySiteKey, string> = {
  portal: "", calculator: "calculators", tools: "tools", moneyBook: "money", docs: "docs", quiz: "quiz",
};

const moneyBookLocales = ["ko", "en", "ja", "zh"] as const;

export function familySiteHref(locale: Locale, key: FamilySiteKey) {
  if (key === "moneyBook") {
    const targetLocale = locale === "zh-tw" ? "zh" : moneyBookLocales.some((item) => item === locale) ? locale : "en";
    return `/${targetLocale}/money`;
  }
  return `/${locale}${familySiteSegments[key] ? `/${familySiteSegments[key]}` : ""}`;
}

export const moneyBookFallbackCopy: Partial<Record<Locale, string>> = {
  ru: "Страница MoneyBook откроется на английском.",
  es: "La página de MoneyBook se abrirá en inglés.",
  "pt-br": "A página do MoneyBook será aberta em inglês.",
  de: "MoneyBook wird auf Englisch geöffnet.",
  fr: "La page MoneyBook s’ouvrira en anglais.",
  vi: "MoneyBook sẽ mở bằng tiếng Anh.",
  id: "MoneyBook akan dibuka dalam bahasa Inggris.",
  th: "MoneyBook จะเปิดเป็นภาษาอังกฤษ",
  "zh-tw": "即將開啟簡體中文版本的 MoneyBook。",
  it: "MoneyBook si aprirà in inglese.",
  nl: "MoneyBook wordt in het Engels geopend.",
  hi: "MoneyBook अंग्रेज़ी में खुलेगा।",

  "tr": "MoneyBook sayfası İngilizce açılacaktır."
};

export const familySitesCopy: Record<Locale, {
  label: string;
  sites: Record<FamilySiteKey, string>;
  docsTitle: string;
  docsDescription: string;
  docsCta: string;
  quizTitle: string;
  quizDescription: string;
  quizCta: string;
  menu: string;
}> = {
  ko: { label: "패밀리 사이트", sites: { portal: "포탈", calculator: "계산기", tools: "온라인 도구", moneyBook: "무료 공유 가계부", docs: "문서·양식", quiz: "퀴즈·테스트" }, docsTitle: "문서·양식", docsDescription: "필요한 문서와 양식을 찾아 간편하게 이용하세요.", docsCta: "문서·양식 보기", quizTitle: "퀴즈·테스트", quizDescription: "다양한 퀴즈와 테스트를 가볍게 즐겨보세요.", quizCta: "퀴즈·테스트 하기", menu: "메뉴" },
  en: { label: "Family sites", sites: { portal: "Portal", calculator: "Calculators", tools: "Online Tools", moneyBook: "Free Shared Money Book", docs: "Documents", quiz: "Quiz & Tests" }, docsTitle: "Documents", docsDescription: "Find useful documents and templates for everyday needs.", docsCta: "Browse documents", quizTitle: "Quiz & Tests", quizDescription: "Take a break with a variety of fun quizzes and tests.", quizCta: "Explore quizzes", menu: "Menu" },
  ja: { label: "ファミリーサイト", sites: { portal: "ポータル", calculator: "計算機", tools: "オンラインツール", moneyBook: "無料の共有家計簿", docs: "文書・テンプレート", quiz: "クイズ・テスト" }, docsTitle: "文書・テンプレート", docsDescription: "日々の暮らしに役立つ文書やテンプレートを見つけましょう。", docsCta: "文書を見る", quizTitle: "クイズ・テスト", quizDescription: "さまざまなクイズやテストを気軽に楽しめます。", quizCta: "クイズを楽しむ", menu: "メニュー" },
  zh: { label: "系列服务", sites: { portal: "门户", calculator: "计算器", tools: "在线工具", moneyBook: "免费共享记账本", docs: "文档与模板", quiz: "测验与测试" }, docsTitle: "文档与模板", docsDescription: "查找日常所需的实用文档和模板。", docsCta: "浏览文档", quizTitle: "测验与测试", quizDescription: "轻松体验各种有趣的测验与测试。", quizCta: "开始测验", menu: "菜单" },
  es: { label: "Sitios de la familia", sites: { portal: "Portal", calculator: "Calculadoras", tools: "Herramientas online", moneyBook: "Libro de finanzas compartido gratis", docs: "Documentos y plantillas", quiz: "Cuestionarios y tests" }, docsTitle: "Documentos y plantillas", docsDescription: "Encuentra documentos y plantillas útiles para cada día.", docsCta: "Ver documentos", quizTitle: "Cuestionarios y tests", quizDescription: "Disfruta de una variedad de cuestionarios y tests.", quizCta: "Descubrir cuestionarios", menu: "Menú" },
  "pt-br": { label: "Sites da família", sites: { portal: "Portal", calculator: "Calculadoras", tools: "Ferramentas online", moneyBook: "Livro de finanças compartilhado grátis", docs: "Documentos e modelos", quiz: "Quizzes e testes" }, docsTitle: "Documentos e modelos", docsDescription: "Encontre documentos e modelos úteis para o dia a dia.", docsCta: "Ver documentos", quizTitle: "Quizzes e testes", quizDescription: "Divirta-se com vários quizzes e testes.", quizCta: "Explorar quizzes", menu: "Menu" },
  de: { label: "Familienseiten", sites: { portal: "Portal", calculator: "Rechner", tools: "Online-Tools", moneyBook: "Kostenloses gemeinsames Haushaltsbuch", docs: "Dokumente und Vorlagen", quiz: "Quiz und Tests" }, docsTitle: "Dokumente und Vorlagen", docsDescription: "Finde praktische Dokumente und Vorlagen für den Alltag.", docsCta: "Dokumente ansehen", quizTitle: "Quiz und Tests", quizDescription: "Entdecke unterhaltsame Quiz und Tests für zwischendurch.", quizCta: "Quiz entdecken", menu: "Menü" },
  fr: { label: "Sites de la famille", sites: { portal: "Portail", calculator: "Calculatrices", tools: "Outils en ligne", moneyBook: "Carnet de comptes partagé gratuit", docs: "Documents et modèles", quiz: "Quiz et tests" }, docsTitle: "Documents et modèles", docsDescription: "Trouvez des documents et modèles pratiques pour le quotidien.", docsCta: "Voir les documents", quizTitle: "Quiz et tests", quizDescription: "Amusez-vous avec une sélection de quiz et de tests.", quizCta: "Découvrir les quiz", menu: "Menu" },
  vi: { label: "Dịch vụ liên kết", sites: { portal: "Cổng thông tin", calculator: "Máy tính", tools: "Công cụ trực tuyến", moneyBook: "Sổ thu chi dùng chung miễn phí", docs: "Tài liệu và biểu mẫu", quiz: "Câu đố và trắc nghiệm" }, docsTitle: "Tài liệu và biểu mẫu", docsDescription: "Tìm tài liệu và biểu mẫu hữu ích cho nhu cầu hằng ngày.", docsCta: "Xem tài liệu", quizTitle: "Câu đố và trắc nghiệm", quizDescription: "Thư giãn với nhiều câu đố và bài trắc nghiệm thú vị.", quizCta: "Khám phá câu đố", menu: "Menu" },
  id: { label: "Situs keluarga", sites: { portal: "Portal", calculator: "Kalkulator", tools: "Alat online", moneyBook: "Buku keuangan bersama gratis", docs: "Dokumen dan templat", quiz: "Kuis dan tes" }, docsTitle: "Dokumen dan templat", docsDescription: "Temukan dokumen dan templat praktis untuk kebutuhan sehari-hari.", docsCta: "Lihat dokumen", quizTitle: "Kuis dan tes", quizDescription: "Nikmati beragam kuis dan tes yang seru.", quizCta: "Jelajahi kuis", menu: "Menu" },
  th: { label: "เว็บไซต์ในเครือ", sites: { portal: "พอร์ทัล", calculator: "เครื่องคิดเลข", tools: "เครื่องมือออนไลน์", moneyBook: "สมุดบัญชีใช้ร่วมกันฟรี", docs: "เอกสารและแบบฟอร์ม", quiz: "แบบทดสอบและควิซ" }, docsTitle: "เอกสารและแบบฟอร์ม", docsDescription: "ค้นหาเอกสารและแบบฟอร์มที่มีประโยชน์สำหรับทุกวัน", docsCta: "ดูเอกสาร", quizTitle: "แบบทดสอบและควิซ", quizDescription: "สนุกกับควิซและแบบทดสอบหลากหลายรูปแบบ", quizCta: "เลือกทำควิซ", menu: "เมนู" },
  "zh-tw": { label: "系列服務", sites: { portal: "入口網站", calculator: "計算機", tools: "線上工具", moneyBook: "免費共享記帳本", docs: "文件與範本", quiz: "測驗與小測驗" }, docsTitle: "文件與範本", docsDescription: "尋找日常生活實用的文件與範本。", docsCta: "瀏覽文件", quizTitle: "測驗與小測驗", quizDescription: "輕鬆體驗各式有趣的測驗與小測驗。", quizCta: "探索測驗", menu: "選單" },
  it: { label: "Siti della famiglia", sites: { portal: "Portale", calculator: "Calcolatrici", tools: "Strumenti online", moneyBook: "Registro spese condiviso gratuito", docs: "Documenti e modelli", quiz: "Quiz e test" }, docsTitle: "Documenti e modelli", docsDescription: "Trova documenti e modelli pratici per la vita di tutti i giorni.", docsCta: "Sfoglia i documenti", quizTitle: "Quiz e test", quizDescription: "Divertiti con tanti quiz e test diversi.", quizCta: "Scopri i quiz", menu: "Menu" },
  nl: { label: "Familiewebsites", sites: { portal: "Portaal", calculator: "Rekenmachines", tools: "Online hulpmiddelen", moneyBook: "Gratis gedeeld huishoudboekje", docs: "Documenten en sjablonen", quiz: "Quizzen en tests" }, docsTitle: "Documenten en sjablonen", docsDescription: "Vind handige documenten en sjablonen voor elke dag.", docsCta: "Documenten bekijken", quizTitle: "Quizzen en tests", quizDescription: "Ontdek allerlei leuke quizzen en tests.", quizCta: "Quizzen ontdekken", menu: "Menu" },
  hi: { label: "परिवार की साइटें", sites: { portal: "पोर्टल", calculator: "कैलकुलेटर", tools: "ऑनलाइन टूल", moneyBook: "मुफ़्त साझा खर्च खाता", docs: "दस्तावेज़ और टेम्पलेट", quiz: "क्विज़ और टेस्ट" }, docsTitle: "दस्तावेज़ और टेम्पलेट", docsDescription: "रोज़मर्रा के काम के दस्तावेज़ और टेम्पलेट पाएँ।", docsCta: "दस्तावेज़ देखें", quizTitle: "क्विज़ और टेस्ट", quizDescription: "कई रोचक क्विज़ और टेस्ट के साथ कुछ नया आज़माएँ।", quizCta: "क्विज़ देखें", menu: "मेन्यू" },
  ru: { label:"Сервисы WOORI.TODAY",sites:{portal:"Портал",calculator:"Калькуляторы",tools:"Инструменты",moneyBook:"Общий семейный бюджет",docs:"Документы и шаблоны",quiz:"Викторины и тесты"},docsTitle:"Документы и шаблоны",docsDescription:"Практичные документы и шаблоны для повседневных задач.",docsCta:"Открыть документы",quizTitle:"Викторины и тесты",quizDescription:"Попробуйте разные интересные викторины и тесты.",quizCta:"К викторинам",menu:"Меню" },

  "tr": {label:"Aile hizmetleri",sites:{portal:"Portal",calculator:"Hesap makineleri",tools:"Çevrimiçi araçlar",moneyBook:"MoneyBook",docs:"Belgeler",quiz:"Quiz"},docsTitle:"Belge şablonları",docsDescription:"Tutanak, teklif ve haftalık planlar için kullanıma hazır şablonlar.",docsCta:"Belgeleri aç",quizTitle:"Bilgi yarışmaları",quizDescription:"Genel kültür, matematik, coğrafya ve teknoloji konularında kısa quizler.",quizCta:"Quizleri aç",menu:"Hizmet menüsü"}
};
