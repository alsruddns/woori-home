import type { Locale } from "@/lib/site";

export const datePickerCopy: Record<Locale, { previousMonth: string; nextMonth: string; close: string; calendar: string }> = {
  ko: { previousMonth: "이전 달", nextMonth: "다음 달", close: "달력 닫기", calendar: "달력 열기" },
  en: { previousMonth: "Previous month", nextMonth: "Next month", close: "Close calendar", calendar: "Open calendar" },
  ja: { previousMonth: "前の月", nextMonth: "次の月", close: "カレンダーを閉じる", calendar: "カレンダーを開く" },
  zh: { previousMonth: "上个月", nextMonth: "下个月", close: "关闭日历", calendar: "打开日历" },
  es: { previousMonth: "Mes anterior", nextMonth: "Mes siguiente", close: "Cerrar calendario", calendar: "Abrir calendario" },
  "pt-br": { previousMonth: "Mês anterior", nextMonth: "Próximo mês", close: "Fechar calendário", calendar: "Abrir calendário" },
  de: { previousMonth: "Vorheriger Monat", nextMonth: "Nächster Monat", close: "Kalender schließen", calendar: "Kalender öffnen" },
  fr: { previousMonth: "Mois précédent", nextMonth: "Mois suivant", close: "Fermer le calendrier", calendar: "Ouvrir le calendrier" },
  vi: { previousMonth: "Tháng trước", nextMonth: "Tháng sau", close: "Đóng lịch", calendar: "Mở lịch" },
  id: { previousMonth: "Bulan sebelumnya", nextMonth: "Bulan berikutnya", close: "Tutup kalender", calendar: "Buka kalender" },
  th: { previousMonth: "เดือนก่อน", nextMonth: "เดือนถัดไป", close: "ปิดปฏิทิน", calendar: "เปิดปฏิทิน" },
  "zh-tw": { previousMonth: "上個月", nextMonth: "下個月", close: "關閉日曆", calendar: "開啟日曆" },
  it: { previousMonth: "Mese precedente", nextMonth: "Mese successivo", close: "Chiudi calendario", calendar: "Apri calendario" },
  nl: { previousMonth: "Vorige maand", nextMonth: "Volgende maand", close: "Kalender sluiten", calendar: "Kalender openen" },
  hi: { previousMonth: "पिछला महीना", nextMonth: "अगला महीना", close: "कैलेंडर बंद करें", calendar: "कैलेंडर खोलें" },
};
