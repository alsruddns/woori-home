import type { Locale } from "@/lib/site";

type IndustryCopy = { industry: string; allIndustries: string; zoomIndustry: string; backToIndustries: string; emptyIndustry: string };

export const companyFinancialIndustryCopy: Record<Locale, IndustryCopy> = {
  ko: { industry: "산업", allIndustries: "전체 산업", zoomIndustry: "산업 확대", backToIndustries: "전체 산업으로 돌아가기", emptyIndustry: "현재 조건에 표시할 기업이 없습니다." },
  en: { industry: "Industry", allIndustries: "All industries", zoomIndustry: "Zoom into industry", backToIndustries: "Back to all industries", emptyIndustry: "No companies in this industry match the current filters." },
  ja: { industry: "業種", allIndustries: "すべての業種", zoomIndustry: "業種を拡大", backToIndustries: "すべての業種に戻る", emptyIndustry: "現在の条件に一致する企業はありません。" },
  zh: { industry: "行业", allIndustries: "所有行业", zoomIndustry: "放大行业", backToIndustries: "返回所有行业", emptyIndustry: "当前筛选条件下，此行业没有可显示的公司。" },
  es: { industry: "Industria", allIndustries: "Todas las industrias", zoomIndustry: "Ampliar industria", backToIndustries: "Volver a todas las industrias", emptyIndustry: "Ninguna empresa de esta industria coincide con los filtros actuales." },
  "pt-br": { industry: "Setor", allIndustries: "Todos os setores", zoomIndustry: "Ampliar setor", backToIndustries: "Voltar a todos os setores", emptyIndustry: "Nenhuma empresa deste setor corresponde aos filtros atuais." },
  de: { industry: "Branche", allIndustries: "Alle Branchen", zoomIndustry: "Branche vergrößern", backToIndustries: "Zu allen Branchen zurück", emptyIndustry: "Keine Unternehmen dieser Branche entsprechen den aktuellen Filtern." },
  fr: { industry: "Secteur", allIndustries: "Tous les secteurs", zoomIndustry: "Agrandir le secteur", backToIndustries: "Retour à tous les secteurs", emptyIndustry: "Aucune entreprise de ce secteur ne correspond aux filtres actuels." },
  vi: { industry: "Ngành", allIndustries: "Tất cả ngành", zoomIndustry: "Phóng to ngành", backToIndustries: "Quay lại tất cả ngành", emptyIndustry: "Không có công ty nào trong ngành này phù hợp với bộ lọc hiện tại." },
  id: { industry: "Industri", allIndustries: "Semua industri", zoomIndustry: "Perbesar industri", backToIndustries: "Kembali ke semua industri", emptyIndustry: "Tidak ada perusahaan di industri ini yang cocok dengan filter saat ini." },
  th: { industry: "อุตสาหกรรม", allIndustries: "ทุกอุตสาหกรรม", zoomIndustry: "ขยายอุตสาหกรรม", backToIndustries: "กลับไปยังทุกอุตสาหกรรม", emptyIndustry: "ไม่มีบริษัทในอุตสาหกรรมนี้ที่ตรงกับตัวกรองปัจจุบัน" },
  "zh-tw": { industry: "產業", allIndustries: "所有產業", zoomIndustry: "放大產業", backToIndustries: "返回所有產業", emptyIndustry: "目前篩選條件下，此產業沒有可顯示的公司。" },
  it: { industry: "Settore", allIndustries: "Tutti i settori", zoomIndustry: "Ingrandisci settore", backToIndustries: "Torna a tutti i settori", emptyIndustry: "Nessuna azienda di questo settore corrisponde ai filtri attuali." },
  nl: { industry: "Sector", allIndustries: "Alle sectoren", zoomIndustry: "Zoom in op sector", backToIndustries: "Terug naar alle sectoren", emptyIndustry: "Geen bedrijven in deze sector voldoen aan de huidige filters." },
  hi: { industry: "उद्योग", allIndustries: "सभी उद्योग", zoomIndustry: "उद्योग बड़ा करें", backToIndustries: "सभी उद्योगों पर लौटें", emptyIndustry: "इस उद्योग में कोई कंपनी मौजूदा फ़िल्टर से मेल नहीं खाती।" },
  ru: { industry: "Отрасль", allIndustries: "Все отрасли", zoomIndustry: "Увеличить отрасль", backToIndustries: "Вернуться ко всем отраслям", emptyIndustry: "В этой отрасли нет компаний, соответствующих текущим фильтрам." },
  tr: { industry: "Sektör", allIndustries: "Tüm sektörler", zoomIndustry: "Sektörü yakınlaştır", backToIndustries: "Tüm sektörlere dön", emptyIndustry: "Bu sektörde mevcut filtrelerle eşleşen şirket yok." },
  pl: { industry: "Branża", allIndustries: "Wszystkie branże", zoomIndustry: "Powiększ branżę", backToIndustries: "Wróć do wszystkich branż", emptyIndustry: "Żadna firma z tej branży nie spełnia obecnych filtrów." },
  fil: { industry: "Industriya", allIndustries: "Lahat ng industriya", zoomIndustry: "Palakihin ang industriya", backToIndustries: "Bumalik sa lahat ng industriya", emptyIndustry: "Walang kumpanyang tumutugma sa kasalukuyang mga filter sa industriyang ito." },
  bn: { industry: "শিল্প", allIndustries: "সব শিল্প", zoomIndustry: "শিল্প বড় করুন", backToIndustries: "সব শিল্পে ফিরে যান", emptyIndustry: "বর্তমান ফিল্টারের সঙ্গে মেলে এমন কোনো কোম্পানি এই শিল্পে নেই।" },
  uk: { industry: "Галузь", allIndustries: "Усі галузі", zoomIndustry: "Збільшити галузь", backToIndustries: "Повернутися до всіх галузей", emptyIndustry: "У цій галузі немає компаній, що відповідають поточним фільтрам." },
  ms: { industry: "Industri", allIndustries: "Semua industri", zoomIndustry: "Besarkan industri", backToIndustries: "Kembali ke semua industri", emptyIndustry: "Tiada syarikat dalam industri ini sepadan dengan penapis semasa." },
  sv: { industry: "Bransch", allIndustries: "Alla branscher", zoomIndustry: "Förstora branschen", backToIndustries: "Tillbaka till alla branscher", emptyIndustry: "Inga företag i branschen matchar de aktuella filtren." },
  cs: { industry: "Odvětví", allIndustries: "Všechna odvětví", zoomIndustry: "Zvětšit odvětví", backToIndustries: "Zpět na všechna odvětví", emptyIndustry: "Žádná společnost v tomto odvětví neodpovídá aktuálním filtrům." },
  ro: { industry: "Industrie", allIndustries: "Toate industriile", zoomIndustry: "Mărește industria", backToIndustries: "Înapoi la toate industriile", emptyIndustry: "Nicio companie din această industrie nu corespunde filtrelor actuale." },
  el: { industry: "Κλάδος", allIndustries: "Όλοι οι κλάδοι", zoomIndustry: "Μεγέθυνση κλάδου", backToIndustries: "Επιστροφή σε όλους τους κλάδους", emptyIndustry: "Καμία εταιρεία αυτού του κλάδου δεν ταιριάζει με τα τρέχοντα φίλτρα." },
};
