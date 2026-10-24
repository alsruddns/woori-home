import type { Locale } from "@/lib/site";
import type { IndicatorDefinition } from "./model";
import { expandedUnit } from "./expanded-indicator-copy";
import { energyAccessCopy } from "./energy-copy";
import { worldEconomyUnit } from "./world-economy-copy";

type Units = Record<string, string>;
export const countryUnits: Record<Locale, Units> = {
  ru:{population:"человек",gdp:"млрд долларов США","gdp-per-capita":"долларов США на человека",fertility:"рождений на женщину","life-expectancy":"лет","population-growth":"% в год"},
  ko:{population:"명",gdp:"당해 연도 US$", "gdp-per-capita":"당해 연도 US$ / 명",fertility:"명 / 여성", "life-expectancy":"년", "population-growth":"% / 년"},
  en:{population:"people",gdp:"current US$", "gdp-per-capita":"current US$ / person",fertility:"births / woman", "life-expectancy":"years", "population-growth":"% / year"},
  ja:{population:"人",gdp:"当年USドル", "gdp-per-capita":"当年USドル / 人",fertility:"人 / 女性", "life-expectancy":"年", "population-growth":"% / 年"},
  zh:{population:"人",gdp:"当年美元", "gdp-per-capita":"当年美元 / 人",fertility:"人 / 女性", "life-expectancy":"年", "population-growth":"% / 年"},
  es:{population:"personas",gdp:"US$ corrientes", "gdp-per-capita":"US$ corrientes / persona",fertility:"nacimientos / mujer", "life-expectancy":"años", "population-growth":"% / año"},
  "pt-br":{population:"pessoas",gdp:"US$ correntes", "gdp-per-capita":"US$ correntes / pessoa",fertility:"nascimentos / mulher", "life-expectancy":"anos", "population-growth":"% / ano"},
  de:{population:"Personen",gdp:"US$ laufend", "gdp-per-capita":"US$ laufend / Person",fertility:"Geburten / Frau", "life-expectancy":"Jahre", "population-growth":"% / Jahr"},
  fr:{population:"personnes",gdp:"$ US courants", "gdp-per-capita":"$ US courants / personne",fertility:"naissances / femme", "life-expectancy":"ans", "population-growth":"% / an"},
  vi:{population:"người",gdp:"USD hiện hành", "gdp-per-capita":"USD hiện hành / người",fertility:"con / phụ nữ", "life-expectancy":"năm", "population-growth":"% / năm"},
  id:{population:"orang",gdp:"US$ berlaku", "gdp-per-capita":"US$ berlaku / orang",fertility:"kelahiran / perempuan", "life-expectancy":"tahun", "population-growth":"% / tahun"},
  th:{population:"คน",gdp:"ดอลลาร์สหรัฐปัจจุบัน", "gdp-per-capita":"ดอลลาร์สหรัฐปัจจุบัน / คน",fertility:"คน / ผู้หญิง", "life-expectancy":"ปี", "population-growth":"% / ปี"},
  "zh-tw":{population:"人",gdp:"當年美元", "gdp-per-capita":"當年美元 / 人",fertility:"人 / 女性", "life-expectancy":"年", "population-growth":"% / 年"},
  it:{population:"persone",gdp:"US$ correnti", "gdp-per-capita":"US$ correnti / persona",fertility:"nascite / donna", "life-expectancy":"anni", "population-growth":"% / anno"},
  nl:{population:"personen",gdp:"huidige US$", "gdp-per-capita":"huidige US$ / persoon",fertility:"geboorten / vrouw", "life-expectancy":"jaar", "population-growth":"% / jaar"},
  hi:{population:"लोग",gdp:"वर्तमान US$", "gdp-per-capita":"वर्तमान US$ / व्यक्ति",fertility:"जन्म / महिला", "life-expectancy":"वर्ष", "population-growth":"% / वर्ष"},

  "tr": {population:"kişi",gdp:"cari ABD doları",'gdp-per-capita':"kişi başına cari ABD doları",fertility:"kadın başına doğum",'life-expectancy':"yıl",'population-growth':"yıllık yüzde"}
,
  "pl": {population:"osoby",gdp:"bieżące USD",'gdp-per-capita':"bieżące USD na osobę",fertility:"urodzenia na kobietę",'life-expectancy':"lata",'population-growth':"% rocznie"}
,
  "fil": {population:"tao",gdp:"kasalukuyang US$",'gdp-per-capita':"kasalukuyang US$ bawat tao",fertility:"kapanganakan bawat babae",'life-expectancy':"taon",'population-growth':"% bawat taon"}
,
  "bn": {population:"জন",gdp:"বর্তমান মার্কিন ডলার",'gdp-per-capita':"জনপ্রতি বর্তমান মার্কিন ডলার",fertility:"নারীপ্রতি জন্ম",'life-expectancy':"বছর",'population-growth':"বার্ষিক %"},
  "uk": {population:"осіб",gdp:"поточні долари США",'gdp-per-capita':"поточні долари США на особу",fertility:"народжень на жінку",'life-expectancy':"років",'population-growth':"% на рік"}
,
  ms: {"population":"Orang-orang","gdp":"Australia","gdp-per-capita":"Orang saat ini senilai US$ / orang","fertility":"kelahiran / wanita","life-expectancy":"years","population-growth":"% / tahun"}
,
  sv: {"population":"människor","gdp":"nuvarande US$","gdp-per-capita":"nuvarande US $ / person","fertility":"Födelse / Kvinna","life-expectancy":"år","population-growth":"%/år"}
,
  cs: {"population":"lidé","gdp":"aktuální US $","gdp-per-capita":"aktuální US $/ person","fertility":"porod / žena","life-expectancy":"roky","population-growth":"% / rok"}
,
  ro: {"population":"oameni","gdp":"curent US$","gdp-per-capita":"curent US$ / persoană","fertility":"naşteri/femeie","life-expectancy":"ani","population-growth":"% / an"}
,
  el: {"population":"άτομα","gdp":"τρέχον US$","gdp-per-capita":"τρέχον US$ / άτομο","fertility":"γεννήσεις / γυναίκα","life-expectancy":"έτη","population-growth":"% / έτος"}
};

export function unitFor(locale: Locale, indicator: IndicatorDefinition) {
  if (indicator.id === "electricity-access") return energyAccessCopy[locale].unit;
  return countryUnits[locale][indicator.id] ?? expandedUnit(locale, indicator.id) ?? worldEconomyUnit(indicator.id, locale) ?? indicator.unit;
}
