import type { Locale } from "@/lib/site";

export const datePickerCopy: Record<Locale, { previousMonth: string; nextMonth: string; close: string; calendar: string; today: string }> = {
  ko: { previousMonth: "이전 달", nextMonth: "다음 달", close: "달력 닫기", calendar: "달력 열기", today: "오늘" },
  en: { previousMonth: "Previous month", nextMonth: "Next month", close: "Close calendar", calendar: "Open calendar", today: "Today" },
  ja: { previousMonth: "前の月", nextMonth: "次の月", close: "カレンダーを閉じる", calendar: "カレンダーを開く", today: "今日" },
  zh: { previousMonth: "上个月", nextMonth: "下个月", close: "关闭日历", calendar: "打开日历", today: "今天" },
  es: { previousMonth: "Mes anterior", nextMonth: "Mes siguiente", close: "Cerrar calendario", calendar: "Abrir calendario", today: "Hoy" },
  "pt-br": { previousMonth: "Mês anterior", nextMonth: "Próximo mês", close: "Fechar calendário", calendar: "Abrir calendário", today: "Hoje" },
  de: { previousMonth: "Vorheriger Monat", nextMonth: "Nächster Monat", close: "Kalender schließen", calendar: "Kalender öffnen", today: "Heute" },
  fr: { previousMonth: "Mois précédent", nextMonth: "Mois suivant", close: "Fermer le calendrier", calendar: "Ouvrir le calendrier", today: "Aujourd’hui" },
  vi: { previousMonth: "Tháng trước", nextMonth: "Tháng sau", close: "Đóng lịch", calendar: "Mở lịch", today: "Hôm nay" },
  id: { previousMonth: "Bulan sebelumnya", nextMonth: "Bulan berikutnya", close: "Tutup kalender", calendar: "Buka kalender", today: "Hari ini" },
  th: { previousMonth: "เดือนก่อน", nextMonth: "เดือนถัดไป", close: "ปิดปฏิทิน", calendar: "เปิดปฏิทิน", today: "วันนี้" },
  "zh-tw": { previousMonth: "上個月", nextMonth: "下個月", close: "關閉日曆", calendar: "開啟日曆", today: "今天" },
  it: { previousMonth: "Mese precedente", nextMonth: "Mese successivo", close: "Chiudi calendario", calendar: "Apri calendario", today: "Oggi" },
  nl: { previousMonth: "Vorige maand", nextMonth: "Volgende maand", close: "Kalender sluiten", calendar: "Kalender openen", today: "Vandaag" },
  hi: { previousMonth: "पिछला महीना", nextMonth: "अगला महीना", close: "कैलेंडर बंद करें", calendar: "कैलेंडर खोलें", today: "आज" },
  ru: { previousMonth: "Предыдущий месяц", nextMonth: "Следующий месяц", close: "Закрыть календарь", calendar: "Открыть календарь", today: "Сегодня" },

  "tr": {previousMonth:"Önceki ay",nextMonth:"Sonraki ay",close:"Kapat",calendar:"Takvim",today: "Bugün"}
,
  "pl": {previousMonth:"Poprzedni miesiąc",nextMonth:"Następny miesiąc",close:"Zamknij",calendar:"Kalendarz",today: "Dzisiaj"}
,
  "fil": {previousMonth:"Nakaraang buwan",nextMonth:"Susunod na buwan",close:"Isara",calendar:"Kalendaryo",today: "Ngayon"}
,
  "bn": {previousMonth:"আগের মাস",nextMonth:"পরের মাস",close:"বন্ধ করুন",calendar:"ক্যালেন্ডার",today: "আজ"}
};
