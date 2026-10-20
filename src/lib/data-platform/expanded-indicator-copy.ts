import type { Locale } from "@/lib/site";

const localeOrder: Locale[] = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"];
const localizedLabels: Record<string, string[]> = {
  unemployment: ["실업률", "Unemployment", "失業率", "失业率", "Desempleo", "Desemprego", "Arbeitslosigkeit", "Chômage", "Thất nghiệp", "Pengangguran", "การว่างงาน", "失業率", "Disoccupazione", "Werkloosheid", "बेरोज़गारी"],
};

const descriptions: Record<string, { unit: string; definition: string; interpretation: string; koDefinition: string; koInterpretation: string }> = {
  unemployment: {
    unit: "percent of labor force",
    definition: "The share of the labor force without work but available for and seeking employment, using the ILO modeled estimate series.",
    interpretation: "This is a modeled estimate and may differ from national survey figures. It does not include everyone outside the labor force.",
    koDefinition: "일할 수 있고 일자리를 찾고 있지만 일하지 않는 노동력의 비율입니다. 국제노동기구(ILO) 모형 추정치 계열을 사용합니다.",
    koInterpretation: "모형 추정치이므로 각국의 조사 결과와 다를 수 있으며, 노동시장 밖에 있는 모든 사람을 포함하지 않습니다.",
  },
};

const units: Record<Locale, string> = {
  ko: "노동력 대비 %", en: "% of labor force", ja: "労働力人口に占める割合（%）", zh: "占劳动力人口的百分比",
  es: "% de la fuerza laboral", "pt-br": "% da força de trabalho", de: "% der Erwerbsbevölkerung", fr: "% de la population active",
  vi: "% lực lượng lao động", id: "% dari angkatan kerja", th: "% ของกำลังแรงงาน", "zh-tw": "占勞動力人口百分比",
  it: "% della forza lavoro", nl: "% van de beroepsbevolking", hi: "श्रमबल का %",
};

export function expandedIndicator(id: string, code: string, category: "economy") {
  const label = localizedLabels[id];
  const item = descriptions[id];
  if (!label || !item) throw new Error(`Missing localized indicator copy: ${id}`);
  return {
    id, category, code, unit: item.unit,
    label: Object.fromEntries(localeOrder.map((locale, index) => [locale, label[index]])),
    definition: { en: item.definition, ko: item.koDefinition },
    interpretation: { en: item.interpretation, ko: item.koInterpretation },
  };
}

export function expandedUnit(locale: Locale, id: string) {
  if (id === "unemployment") return units[locale];
  return undefined;
}
