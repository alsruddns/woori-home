import type { Locale } from "./site";

export const notFoundMessages: Record<Locale, { title: string; description: string; home: string }> = {
  ko: { title: "페이지를 찾을 수 없습니다", description: "요청하신 주소가 없거나 이동되었습니다.", home: "홈으로 돌아가기" },
  en: { title: "Page not found", description: "This address may be unavailable or may have changed.", home: "Return to home" },
  ja: { title: "ページが見つかりません", description: "お探しのページは存在しないか、移動した可能性があります。", home: "ホームに戻る" },
  zh: { title: "找不到页面", description: "此页面可能不存在或已更改地址。", home: "返回首页" },
  es: { title: "No se encuentra la página", description: "La dirección no existe o la página se ha trasladado.", home: "Volver al inicio" },
  "pt-br": { title: "Página não encontrada", description: "Este endereço não existe ou a página mudou de lugar.", home: "Voltar ao início" },
  de: { title: "Seite nicht gefunden", description: "Diese Adresse ist nicht verfügbar oder die Seite wurde verschoben.", home: "Zur Startseite" },
  fr: { title: "Page introuvable", description: "Cette adresse est indisponible ou la page a été déplacée.", home: "Retour à l’accueil" },
  vi: { title: "Không tìm thấy trang", description: "Địa chỉ này không tồn tại hoặc trang đã được chuyển đi.", home: "Về trang chủ" },
  id: { title: "Halaman tidak ditemukan", description: "Alamat ini tidak tersedia atau halamannya telah dipindahkan.", home: "Kembali ke beranda" },
  th: { title: "ไม่พบหน้านี้", description: "ไม่มีที่อยู่นี้หรือหน้านี้ถูกย้ายแล้ว", home: "กลับไปหน้าแรก" },
  "zh-tw": { title: "找不到頁面", description: "此網址不存在，或頁面已移至其他位置。", home: "返回首頁" },
  it: { title: "Pagina non trovata", description: "Questo indirizzo non è disponibile oppure la pagina è stata spostata.", home: "Torna alla home" },
  nl: { title: "Pagina niet gevonden", description: "Dit adres is niet beschikbaar of de pagina is verplaatst.", home: "Terug naar home" },
  hi: { title: "पृष्ठ नहीं मिला", description: "यह पता उपलब्ध नहीं है या पृष्ठ को स्थानांतरित कर दिया गया है।", home: "होम पर लौटें" },
  ru: { title: "Страница не найдена", description: "Эта страница недоступна или была перемещена.", home: "На главную" },

  "tr": {title:"Sayfa bulunamadı",description:"Aradığınız sayfa mevcut değil veya taşınmış olabilir.",home:"Ana sayfaya dön"}
,
  "pl": {title:"Nie znaleziono strony",description:"Ten adres jest niedostępny lub strona została przeniesiona.",home:"Wróć na stronę główną"}
,
  "fil": {title:"Hindi makita ang pahina",description:"Maaaring hindi available ang address na ito o nailipat ang pahina.",home:"Bumalik sa home"}
,
  "bn": {title:"পাতা পাওয়া যায়নি",description:"ঠিকানাটি অনুপলভ্য বা পাতাটি সরানো হয়ে থাকতে পারে।",home:"হোমে ফিরুন"},
  uk: {"title":"Сторінку не знайдено","description":"Не вдалося знайти сторінку, яку ви шукаєте.","home":"На головну"}
,
  ms: {"title":"Halaman tidak ditemukan","description":"Alamat ini mungkin tidak tersedia atau mungkin telah berubah.","home":"Kembali ke rumah"}
,
  sv: {"title":"Sidan hittades inte","description":"Denna adress kan vara otillgänglig eller kan ha ändrats.","home":"Återvänd hem"}
};
