import type { IndicatorDefinition } from "./model";
import { expandedIndicator } from "./expanded-indicator-copy";
import { energyAccessCopy } from "./energy-copy";

export const dataCategories = [
  { id: "world", label: "World overview", path: "/world" },
  { id: "economy", label: "Economy & finance", path: "/economy" },
  { id: "stocks", label: "Stock markets", path: "/stocks" },
  { id: "population", label: "Population", path: "/population" },
  { id: "energy", label: "Energy", path: "/energy" },
  { id: "countries", label: "Country comparison", path: "/countries" },
  { id: "science", label: "Science & space", path: "/science" },
  { id: "about", label: "About this service", path: "/about" },
] as const;

export const indicators: IndicatorDefinition[] = [
  {
    id: "population", category: "world", code: "SP.POP.TOTL", unit: "people",
    label: { en: "Population", ko: "인구", ja: "人口", zh: "人口", es: "Población", "pt-br": "População", de: "Bevölkerung", fr: "Population", vi: "Dân số", id: "Populasi", th: "ประชากร", "zh-tw": "人口", it: "Popolazione", nl: "Bevolking", hi: "जनसंख्या" },
    definition: { en: "The total population counts all residents regardless of legal status or citizenship, except refugees not permanently settled in the country of asylum.", ko: "총인구는 법적 지위나 시민권과 관계없이 거주자를 집계하며, 망명국에 영구 정착하지 않은 난민은 제외합니다." },
    interpretation: { en: "Population estimates may combine censuses, civil registration, and demographic models. The latest year can differ by country, so comparisons should use the reference year shown for each observation.", ko: "인구 추정치는 인구조사, 주민등록, 인구 모형을 함께 사용할 수 있습니다. 국가별 최신 기준연도가 다를 수 있으므로 관측값마다 표시된 연도를 함께 비교하세요." },
  },
  {
    id: "gdp", category: "economy", code: "NY.GDP.MKTP.CD", unit: "current US dollars",
    label: { en: "GDP", ko: "국내총생산", ja: "国内総生産", zh: "国内生产总值", es: "PIB", "pt-br": "PIB", de: "BIP", fr: "PIB", vi: "GDP", id: "PDB", th: "GDP", "zh-tw": "國內生產毛額", it: "PIL", nl: "bbp", hi: "सकल घरेलू उत्पाद" },
    definition: { en: "Gross domestic product is the market value of final goods and services produced within an economy. This series is reported in current US dollars.", ko: "국내총생산은 한 경제 안에서 생산된 최종 재화와 서비스의 시장 가치입니다. 이 지표는 해당 연도의 미국 달러로 표시됩니다." },
    interpretation: { en: "Current-dollar GDP reflects both output and price changes, and exchange-rate movements affect cross-country comparisons. It is not adjusted for inflation.", ko: "명목 달러 GDP에는 생산량과 가격 변화가 모두 반영되며 환율도 국가 간 비교에 영향을 줍니다. 물가 상승률을 조정한 값은 아닙니다." },
  },
  {
    id: "gdp-per-capita", category: "economy", code: "NY.GDP.PCAP.CD", unit: "current US dollars per person",
    label: { en: "GDP per capita", ko: "1인당 GDP", ja: "一人当たりGDP", zh: "人均GDP", es: "PIB per cápita", "pt-br": "PIB per capita", de: "BIP pro Kopf", fr: "PIB par habitant", vi: "GDP bình quân đầu người", id: "PDB per kapita", th: "GDP ต่อหัว", "zh-tw": "人均GDP", it: "PIL pro capite", nl: "bbp per hoofd", hi: "प्रति व्यक्ति जीडीपी" },
    definition: { en: "GDP per capita is gross domestic product divided by the population, in current US dollars per person.", ko: "1인당 GDP는 국내총생산을 인구로 나눈 값이며, 해당 연도의 미국 달러 기준입니다." },
    interpretation: { en: "This average does not describe how income is distributed among people. Current-dollar values also vary with prices and exchange rates.", ko: "평균값이므로 사람들 사이의 소득 분포를 보여주지는 않습니다. 명목 달러 값은 물가와 환율에도 따라 달라집니다." },
  },
  {
    id: "fertility", category: "population", code: "SP.DYN.TFRT.IN", unit: "births per woman",
    label: { en: "Fertility rate", ko: "합계출산율", ja: "合計特殊出生率", zh: "总和生育率", es: "Tasa de fecundidad", "pt-br": "Taxa de fecundidade", de: "Fruchtbarkeitsrate", fr: "Indice de fécondité", vi: "Tỷ suất sinh", id: "Angka fertilitas", th: "อัตราเจริญพันธุ์", "zh-tw": "總生育率", it: "Tasso di fecondità", nl: "Vruchtbaarheidscijfer", hi: "कुल प्रजनन दर" },
    definition: { en: "The total fertility rate is the number of children that would be born to a woman if she lived through her reproductive years and experienced age-specific fertility rates of a given year.", ko: "합계출산율은 한 여성이 가임 기간 동안 특정 연도의 연령별 출산율을 경험한다고 가정할 때 낳을 것으로 예상되는 자녀 수입니다." },
    interpretation: { en: "This is a period measure, not a prediction of the completed family size of a particular generation. Definitions and estimates can be revised.", ko: "특정 세대가 실제로 낳을 자녀 수를 예측하는 값이 아니라 해당 연도의 출산율을 요약한 지표입니다. 추정치는 수정될 수 있습니다." },
  },
  {
    id: "life-expectancy", category: "population", code: "SP.DYN.LE00.IN", unit: "years",
    label: { en: "Life expectancy at birth", ko: "출생 시 기대수명", ja: "出生時平均余命", zh: "出生时预期寿命", es: "Esperanza de vida al nacer", "pt-br": "Expectativa de vida ao nascer", de: "Lebenserwartung bei Geburt", fr: "Espérance de vie à la naissance", vi: "Tuổi thọ khi sinh", id: "Harapan hidup saat lahir", th: "อายุขัยเมื่อแรกเกิด", "zh-tw": "出生時預期壽命", it: "Aspettativa di vita alla nascita", nl: "Levensverwachting bij geboorte", hi: "जन्म के समय जीवन प्रत्याशा" },
    definition: { en: "Life expectancy at birth is the number of years a newborn would live if patterns of mortality at the time of birth remained the same throughout life.", ko: "출생 시 기대수명은 출생 당시의 사망률 패턴이 평생 유지된다고 가정할 때 신생아가 살 것으로 예상되는 연수입니다." },
    interpretation: { en: "It summarizes mortality conditions for a period and is not a forecast for an individual. Statistical methods and source coverage can vary.", ko: "특정 기간의 사망 여건을 요약하며 개인의 수명을 예측하지 않습니다. 통계 방법과 자료 범위가 다를 수 있습니다." },
  },
  {
    id: "population-growth", category: "population", code: "SP.POP.GROW", unit: "percent per year",
    label: { en: "Population growth", ko: "인구 증가율", ja: "人口増加率", zh: "人口增长率", es: "Crecimiento de la población", "pt-br": "Crescimento populacional", de: "Bevölkerungswachstum", fr: "Croissance démographique", vi: "Tăng trưởng dân số", id: "Pertumbuhan penduduk", th: "การเติบโตของประชากร", "zh-tw": "人口成長率", it: "Crescita della popolazione", nl: "Bevolkingsgroei", hi: "जनसंख्या वृद्धि" },
    definition: { en: "Annual population growth is the exponential rate of growth of the midyear population from year t−1 to t, expressed as a percentage.", ko: "연간 인구 증가율은 전년 중간 인구에서 해당 연도 중간 인구로의 지수 성장률을 백분율로 나타낸 값입니다." },
    interpretation: { en: "The rate reflects births, deaths, and migration together. It is a percentage change, not the number of additional people.", ko: "출생·사망·이동이 함께 반영됩니다. 사람 수의 증감이 아니라 백분율 변화입니다." },
  },
  expandedIndicator("unemployment", "SL.UEM.TOTL.ZS", "economy"),
  {
    id: "electricity-access", category: "energy", code: "EG.ELC.ACCS.ZS", unit: "percent of population",
    label: Object.fromEntries(Object.entries(energyAccessCopy).map(([locale, copy]) => [locale, copy.label])),
    definition: Object.fromEntries(Object.entries(energyAccessCopy).map(([locale, copy]) => [locale, copy.definition])),
    interpretation: Object.fromEntries(Object.entries(energyAccessCopy).map(([locale, copy]) => [locale, copy.interpretation])),
  },
];

export const stockMarkets = [
  { id: "us", region: "us", exchange: "nyse-nasdaq", benchmark: null, currency: "USD", snapshotFrequency: "daily-close" },
  { id: "kospi", region: "korea", exchange: "krx", benchmark: "KOSPI", currency: "KRW", snapshotFrequency: "daily-close" },
  { id: "kosdaq", region: "korea", exchange: "krx", benchmark: "KOSDAQ", currency: "KRW", snapshotFrequency: "daily-close" },
  { id: "japan", region: "japan", exchange: "jpx", benchmark: null, currency: "JPY", snapshotFrequency: "daily-close" },
  { id: "europe", region: "europe", exchange: "multiple", benchmark: null, currency: "EUR", snapshotFrequency: "daily-close" },
] as const;

export type StockMarketId = (typeof stockMarkets)[number]["id"];
export type StockSnapshot = { market: StockMarketId; asOf: string; licensedSource: string; currency: string; securities: { symbol: string; name: string; sector: string; marketCap: number; changePercent: number }[] };
