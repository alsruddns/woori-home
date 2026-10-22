import type { Locale } from "@/lib/site";
import { dataCategories } from "./registry";
import { platformCopy } from "./locales";
import { goldCopy } from "./gold-copy";
import { cryptoCopy } from "./crypto-copy";
import { localizedNewCategories } from "./research-copy";

export const categoryNavigationOrder = ["stocks", "crypto", "gold", "commodities", "economy", "science", "world", "population", "countries", "energy", "papers"] as const;

const localizedLabels: Record<Locale, { insights: string; worldStats: string }> = {
  ko: { insights: "데이터·인사이트", worldStats: "세계 경제·통계" }, en: { insights: "Data & insights", worldStats: "World economy & statistics" }, ja: { insights: "データ・インサイト", worldStats: "世界経済・統計" }, zh: { insights: "数据与洞察", worldStats: "世界经济与统计" },
  es: { insights: "Datos e información", worldStats: "Economía y estadísticas mundiales" }, "pt-br": { insights: "Dados e análises", worldStats: "Economia e estatísticas mundiais" }, de: { insights: "Daten & Einblicke", worldStats: "Weltwirtschaft & Statistiken" }, fr: { insights: "Données et analyses", worldStats: "Économie et statistiques mondiales" },
  vi: { insights: "Dữ liệu & phân tích", worldStats: "Kinh tế và thống kê thế giới" }, id: { insights: "Data & wawasan", worldStats: "Ekonomi dan statistik dunia" }, th: { insights: "ข้อมูลและข้อมูลเชิงลึก", worldStats: "เศรษฐกิจและสถิติโลก" }, "zh-tw": { insights: "資料與洞察", worldStats: "世界經濟與統計" },
  it: { insights: "Dati e approfondimenti", worldStats: "Economia e statistiche mondiali" }, nl: { insights: "Data & inzichten", worldStats: "Wereldeconomie & statistieken" }, hi: { insights: "डेटा और जानकारी", worldStats: "विश्व अर्थव्यवस्था और आँकड़े" }, ru: { insights:"Данные и аналитика",worldStats:"Мировая экономика и статистика" },
};

export function categoryNavigation(locale: Locale) {
  return categoryNavigationOrder.flatMap((id) => {
    const category = dataCategories.find((item) => item.id === id);
    if (!category) return [];
    const index = dataCategories.indexOf(category);
    const label = id === "world" ? localizedLabels[locale].insights
      : id === "economy" ? localizedLabels[locale].worldStats
      : id === "papers" ? localizedNewCategories[locale].papers
      : id === "commodities" ? localizedNewCategories[locale].commodities
      : id === "gold" ? goldCopy[locale].title
      : id === "crypto" ? cryptoCopy[locale].nav
      : platformCopy[locale].categories[index > 2 ? index - 1 : index];
    return [{ id, path: category.path, label }];
  });
}
