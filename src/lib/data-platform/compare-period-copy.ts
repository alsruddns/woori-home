import type { Locale } from "@/lib/site";

export const comparePeriodCopy: Record<Locale, { range: string; from: string; to: string; startValue: string; endValue: string; difference: string; percent: string; percentagePoints: string; percentagePointUnit: string }> = {
  ru:{range:"Изменение за период",from:"Начальный год",to:"Конечный год",startValue:"Начальное значение",endValue:"Конечное значение",difference:"Абсолютное изменение",percent:"Относительное изменение",percentagePoints:"Изменение",percentagePointUnit:"п. п."},
  ko:{range:"기간 변화 비교",from:"시작 연도",to:"종료 연도",startValue:"시작 값",endValue:"종료 값",difference:"변화량",percent:"변화율",percentagePoints:"변화량",percentagePointUnit:"%p"},
  en:{range:"Change over a period",from:"Start year",to:"End year",startValue:"Starting value",endValue:"Ending value",difference:"Absolute change",percent:"Relative change",percentagePoints:"Change",percentagePointUnit:"pp"},
  ja:{range:"期間の変化を比較",from:"開始年",to:"終了年",startValue:"開始値",endValue:"終了値",difference:"変化量",percent:"変化率",percentagePoints:"変化量",percentagePointUnit:"ポイント"},
  zh:{range:"期间变化比较",from:"起始年份",to:"结束年份",startValue:"起始值",endValue:"结束值",difference:"变化量",percent:"相对变化率",percentagePoints:"变化量",percentagePointUnit:"百分点"},
  es:{range:"Cambio durante un periodo",from:"Año inicial",to:"Año final",startValue:"Valor inicial",endValue:"Valor final",difference:"Cambio absoluto",percent:"Cambio relativo",percentagePoints:"Cambio",percentagePointUnit:"p.p."},
  "pt-br":{range:"Variação no período",from:"Ano inicial",to:"Ano final",startValue:"Valor inicial",endValue:"Valor final",difference:"Variação absoluta",percent:"Variação relativa",percentagePoints:"Variação",percentagePointUnit:"p.p."},
  de:{range:"Veränderung im Zeitraum",from:"Startjahr",to:"Endjahr",startValue:"Anfangswert",endValue:"Endwert",difference:"Absolute Veränderung",percent:"Relative Veränderung",percentagePoints:"Veränderung",percentagePointUnit:"Pp."},
  fr:{range:"Évolution sur une période",from:"Année de début",to:"Année de fin",startValue:"Valeur initiale",endValue:"Valeur finale",difference:"Variation absolue",percent:"Variation relative",percentagePoints:"Variation",percentagePointUnit:"p.p."},
  vi:{range:"Thay đổi trong giai đoạn",from:"Năm bắt đầu",to:"Năm kết thúc",startValue:"Giá trị đầu kỳ",endValue:"Giá trị cuối kỳ",difference:"Mức thay đổi",percent:"Tỷ lệ thay đổi",percentagePoints:"Mức thay đổi",percentagePointUnit:"điểm %"},
  id:{range:"Perubahan selama periode",from:"Tahun awal",to:"Tahun akhir",startValue:"Nilai awal",endValue:"Nilai akhir",difference:"Perubahan absolut",percent:"Perubahan relatif",percentagePoints:"Perubahan",percentagePointUnit:"poin persentase"},
  th:{range:"การเปลี่ยนแปลงในช่วงเวลา",from:"ปีเริ่มต้น",to:"ปีสิ้นสุด",startValue:"ค่าเริ่มต้น",endValue:"ค่าสุดท้าย",difference:"การเปลี่ยนแปลงแบบสัมบูรณ์",percent:"การเปลี่ยนแปลงสัมพัทธ์",percentagePoints:"การเปลี่ยนแปลง",percentagePointUnit:"จุดเปอร์เซ็นต์"},
  "zh-tw":{range:"期間變化比較",from:"起始年份",to:"結束年份",startValue:"起始值",endValue:"結束值",difference:"絕對變化量",percent:"相對變化率",percentagePoints:"變化量",percentagePointUnit:"百分點"},
  it:{range:"Variazione nel periodo",from:"Anno iniziale",to:"Anno finale",startValue:"Valore iniziale",endValue:"Valore finale",difference:"Variazione assoluta",percent:"Variazione relativa",percentagePoints:"Variazione",percentagePointUnit:"p.p."},
  nl:{range:"Verandering over een periode",from:"Beginjaar",to:"Eindjaar",startValue:"Beginwaarde",endValue:"Eindwaarde",difference:"Absolute verandering",percent:"Relatieve verandering",percentagePoints:"Verandering",percentagePointUnit:"procentpunt"},
  hi:{range:"अवधि में बदलाव",from:"प्रारंभ वर्ष",to:"अंतिम वर्ष",startValue:"प्रारंभिक मान",endValue:"अंतिम मान",difference:"निरपेक्ष बदलाव",percent:"सापेक्ष बदलाव",percentagePoints:"बदलाव",percentagePointUnit:"प्रतिशत अंक"},

  "tr": {range:"Dönem içindeki değişim",from:"Başlangıç yılı",to:"Bitiş yılı",startValue:"Başlangıç değeri",endValue:"Bitiş değeri",difference:"Mutlak değişim",percent:"Göreli değişim",percentagePoints:"Değişim",percentagePointUnit:"yüzde puan"}
,
  "pl": {range:"Zmiana w okresie",from:"Rok początkowy",to:"Rok końcowy",startValue:"Wartość początkowa",endValue:"Wartość końcowa",difference:"Zmiana bezwzględna",percent:"Zmiana względna",percentagePoints:"Zmiana",percentagePointUnit:"punkty procentowe"}
,
  "fil": {range:"Pagbabago sa panahon",from:"Taon ng simula",to:"Taon ng pagtatapos",startValue:"Halaga sa simula",endValue:"Halaga sa dulo",difference:"Ganap na pagbabago",percent:"Kaugnay na pagbabago",percentagePoints:"Pagbabago",percentagePointUnit:"puntos ng porsiyento"}
};

export const isRateIndicator = (indicatorId: string) => ["electricity-access", "population-growth", "unemployment"].includes(indicatorId);
