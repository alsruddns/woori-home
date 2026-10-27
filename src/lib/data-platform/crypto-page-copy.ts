import type { Locale } from "@/lib/site";
import { cryptoCopy } from "./crypto-copy";

const dailyMarketDescription: Record<Locale, string> = {
  ko: "Alternative.me의 USD 집계 시세를 UTC 날짜별로 관측해 저장합니다. 확정 거래소 종가나 장중 시세가 아니며, 변동률은 공급처의 최근 24시간 지표입니다.",
  en: "Stores daily UTC observations of Alternative.me's aggregated USD prices. These are not finalized exchange closes or intraday prices; the change is the provider's rolling 24-hour metric.",
  ja: "Alternative.meのUSD集計価格をUTC日付ごとに観測・保存します。取引所の確定終値や日中価格ではなく、変動率は提供元の直近24時間指標です。",
  zh: "按 UTC 日期记录 Alternative.me 的 USD 综合价格观测值。这不是交易所已确认的收盘价或日内价格；涨跌幅为提供方滚动 24 小时指标。",
  es: "Guarda observaciones diarias UTC de precios agregados en USD de Alternative.me. No son cierres confirmados de una bolsa ni precios intradía; la variación es el indicador móvil de 24 horas del proveedor.",
  "pt-br": "Armazena observações diárias em UTC dos preços agregados em USD da Alternative.me. Não são fechamentos confirmados de uma corretora nem preços intradiários; a variação é a métrica móvel de 24 horas do provedor.",
  de: "Speichert tägliche UTC-Beobachtungen der aggregierten USD-Preise von Alternative.me. Dies sind keine bestätigten Börsenschlusskurse oder Intraday-Preise; die Veränderung ist der rollierende 24-Stunden-Wert des Anbieters.",
  fr: "Enregistre les observations quotidiennes UTC des prix agrégés en USD d’Alternative.me. Il ne s’agit ni de clôtures confirmées d’une plateforme ni de cours intrajournaliers ; la variation est l’indicateur glissant sur 24 heures du fournisseur.",
  vi: "Lưu quan sát hằng ngày theo UTC về giá tổng hợp bằng USD của Alternative.me. Đây không phải giá đóng cửa đã xác nhận của sàn hay giá trong ngày; mức thay đổi là chỉ số 24 giờ cuốn chiếu của nhà cung cấp.",
  id: "Menyimpan observasi harian UTC atas harga agregat USD Alternative.me. Ini bukan harga penutupan bursa yang telah dikonfirmasi atau harga intrahari; perubahan adalah metrik 24 jam bergulir dari penyedia.",
  th: "บันทึกการสังเกตราคารวม USD จาก Alternative.me รายวันตาม UTC ข้อมูลนี้ไม่ใช่ราคาปิดที่ยืนยันแล้วของตลาดหรือราคาระหว่างวัน และการเปลี่ยนแปลงเป็นตัวชี้วัด 24 ชั่วโมงต่อเนื่องของผู้ให้บริการ",
  "zh-tw": "依 UTC 日期記錄 Alternative.me 的 USD 綜合價格觀測值。這不是交易所確認收盤價或日內價格；漲跌幅為供應商的滾動 24 小時指標。",
  it: "Registra osservazioni giornaliere UTC dei prezzi aggregati in USD di Alternative.me. Non sono chiusure confermate di un exchange né prezzi infragiornalieri; la variazione è l’indicatore mobile a 24 ore del fornitore.",
  nl: "Slaat dagelijkse UTC-waarnemingen op van de geaggregeerde USD-prijzen van Alternative.me. Dit zijn geen bevestigde beursdagkoersen of intradayprijzen; de verandering is de voortschrijdende 24-uursmaatstaf van de aanbieder.",
  hi: "Alternative.me के USD समेकित मूल्यों के UTC-दैनिक अवलोकन संग्रहीत किए जाते हैं। ये एक्सचेंज के पुष्टि किए गए समापन मूल्य या दिन के भीतर के मूल्य नहीं हैं; परिवर्तन प्रदाता का रोलिंग 24 घंटे का माप है।",
  ru: "Сохраняются ежедневные наблюдения по UTC агрегированных цен Alternative.me в USD. Это не подтверждённые биржевые цены закрытия и не внутридневные цены; изменение — скользящий показатель поставщика за 24 часа.",
  tr: "Alternative.me'nin USD cinsinden toplu fiyatlarının günlük UTC gözlemleri saklanır. Bunlar borsanın kesinleşmiş kapanış veya gün içi fiyatları değildir; değişim, sağlayıcının kayan 24 saatlik ölçümüdür.",
  pl: "Zapisywane są dzienne obserwacje UTC zagregowanych cen USD Alternative.me. Nie są to potwierdzone ceny zamknięcia giełdy ani ceny śróddzienne; zmiana to kroczący wskaźnik dostawcy za 24 godziny.",
  fil: "Iniimbak ang pang-araw-araw na UTC na obserbasyon ng pinagsama-samang USD price ng Alternative.me. Hindi ito kumpirmadong exchange close o intraday na presyo; ang pagbabago ay rolling na 24-oras na sukatan ng provider.",
  bn: "Alternative.me-এর সমন্বিত USD মূল্যের UTC-ভিত্তিক দৈনিক পর্যবেক্ষণ সংরক্ষণ করা হয়। এগুলো এক্সচেঞ্জের নিশ্চিত সমাপনী বা দিনের ভেতরের দাম নয়; পরিবর্তনটি সরবরাহকারীর চলমান ২৪ ঘণ্টার পরিমাপ।",
  uk: "Зберігаються щоденні спостереження за UTC агрегованих цін Alternative.me у USD. Це не підтверджені біржові ціни закриття й не внутрішньоденні ціни; зміна є ковзним 24-годинним показником постачальника.",
  ms: "Pemerhatian harian UTC bagi harga agregat USD Alternative.me disimpan. Ini bukan harga penutupan bursa yang disahkan atau harga intrahari; perubahan ialah ukuran 24 jam bergerak daripada penyedia.",
  sv: "Dagliga UTC-observationer av Alternative.me:s aggregerade USD-priser lagras. De är inte bekräftade börskurser vid stängning eller intradagspriser; förändringen är leverantörens rullande 24-timmarsmått.",
  cs: "Ukládají se denní pozorování UTC agregovaných cen Alternative.me v USD. Nejde o potvrzené burzovní zavírací ceny ani vnitrodenní ceny; změna je klouzavý 24hodinový ukazatel poskytovatele.",
  ro: "Sunt stocate observații zilnice UTC ale prețurilor agregate în USD de la Alternative.me. Nu sunt prețuri de închidere confirmate ale unei burse sau prețuri intrazilnice; modificarea este indicatorul mobil pe 24 de ore al furnizorului.",
  el: "Αποθηκεύονται ημερήσιες παρατηρήσεις UTC των συγκεντρωτικών τιμών USD του Alternative.me. Δεν είναι επιβεβαιωμένες τιμές κλεισίματος ανταλλακτηρίου ούτε ενδοημερήσιες τιμές· η μεταβολή είναι ο κυλιόμενος δείκτης 24 ωρών του παρόχου.",
};

export function getCryptoPageCopy(locale: Locale) {
  const copy = cryptoCopy[locale];
  const localized = { ...copy, description: dailyMarketDescription[locale] };
  if (locale === "cs") return { ...localized, nav: "Kryptoměny", title: "Denní trh s kryptoměnami" };
  return localized;
}
