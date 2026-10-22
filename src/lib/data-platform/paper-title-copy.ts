import type { Locale } from "@/lib/site";

export const paperTitleCopy: Record<Locale, { originalTitle: string; translationDraft: string; translationPending: string }> = {
  ru:{originalTitle:"Оригинальное название",translationDraft:"Черновой перевод названия",translationPending:"Перевод ожидает проверки · оригинал"},
  ko:{originalTitle:"원문 제목",translationDraft:"번역 초안",translationPending:"번역 대기 중 · 원문 제목"}, en:{originalTitle:"Original title",translationDraft:"Title translation draft",translationPending:"Translation pending · source title"}, ja:{originalTitle:"原題",translationDraft:"翻訳案",translationPending:"翻訳待ち · 原題を表示"}, zh:{originalTitle:"原文标题",translationDraft:"标题译稿",translationPending:"等待翻译 · 显示原文标题"}, es:{originalTitle:"Título original",translationDraft:"Borrador de traducción",translationPending:"Traducción pendiente · título original"}, "pt-br":{originalTitle:"Título original",translationDraft:"Rascunho da tradução",translationPending:"Tradução pendente · título original"}, de:{originalTitle:"Originaltitel",translationDraft:"Übersetzungsentwurf",translationPending:"Übersetzung ausstehend · Originaltitel"}, fr:{originalTitle:"Titre original",translationDraft:"Ébauche de traduction",translationPending:"Traduction en attente · titre original"}, vi:{originalTitle:"Tiêu đề gốc",translationDraft:"Bản dịch nháp",translationPending:"Đang chờ dịch · tiêu đề gốc"}, id:{originalTitle:"Judul asli",translationDraft:"Draf terjemahan",translationPending:"Menunggu terjemahan · judul asli"}, th:{originalTitle:"ชื่อเรื่องต้นฉบับ",translationDraft:"ร่างคำแปล",translationPending:"รอการแปล · แสดงชื่อเรื่องต้นฉบับ"}, "zh-tw":{originalTitle:"原文標題",translationDraft:"標題譯稿",translationPending:"等待翻譯 · 顯示原文標題"}, it:{originalTitle:"Titolo originale",translationDraft:"Bozza di traduzione",translationPending:"Traduzione in attesa · titolo originale"}, nl:{originalTitle:"Oorspronkelijke titel",translationDraft:"Vertaalconcept",translationPending:"Vertaling in afwachting · oorspronkelijke titel"}, hi:{originalTitle:"मूल शीर्षक",translationDraft:"शीर्षक अनुवाद का मसौदा",translationPending:"अनुवाद लंबित · मूल शीर्षक"},

  "tr": {originalTitle:"Özgün başlık",translationDraft:"Başlık çeviri taslağı",translationPending:"Çeviri beklemede · özgün başlık"}
,
  "pl": {originalTitle:"Tytuł oryginalny",translationDraft:"Projekt tłumaczenia tytułu",translationPending:"Tłumaczenie oczekuje · tytuł oryginalny"}
,
  "fil": {originalTitle:"Orihinal na pamagat",translationDraft:"Draft ng salin ng pamagat",translationPending:"Nakabinbin ang salin · orihinal na pamagat"}
,
  "bn": {originalTitle:"মূল শিরোনাম",translationDraft:"শিরোনামের অনুবাদের খসড়া",translationPending:"অনুবাদ অপেক্ষমাণ · মূল শিরোনাম"},
  "uk": {originalTitle:"Оригінальна назва",translationDraft:"Чернетка перекладу назви",translationPending:"Переклад очікується · оригінальна назва"}
};
