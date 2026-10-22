import type { Locale } from "@/lib/site";

export const stockIssueCopy: Record<Locale, { title: string; description: string; empty: string; published: string; source: string }> = {
  ru: {title:"События фондового рынка",description:"Проверенные публикации по рынку акций с датой и ссылкой на источник.",empty:"Проверенных публикаций за этот период нет.",published:"Опубликовано",source:"Источник"},
  ko:{title:"주식시장 주요 이슈",description:"거래소·규제기관·기업의 공식 발표와 사용 권한이 확인된 자료를 날짜별로 모아 제공할 예정입니다.",empty:"이 날짜에 확인되어 등록된 주식시장 이슈가 없습니다.",published:"발표일",source:"출처"},
  en:{title:"Stock market issues",description:"Dated updates from exchanges, regulators, and companies will appear after source permissions are verified.",empty:"No verified stock market issues are available for this date.",published:"Published",source:"Source"},
  ja:{title:"株式市場の主な発表",description:"取引所・規制当局・企業の公式発表は、利用条件の確認後に日付別で掲載します。",empty:"この日に確認された株式市場の情報はありません。",published:"発表日",source:"出典"},
  zh:{title:"股票市场重要动态",description:"确认来源使用条件后，将按日期提供交易所、监管机构和企业的官方信息。",empty:"该日期没有已核实的股票市场动态。",published:"发布日期",source:"来源"},
  es:{title:"Novedades de los mercados bursátiles",description:"Publicaremos por fecha comunicados oficiales de bolsas, reguladores y empresas cuando se verifiquen sus condiciones de uso.",empty:"No hay novedades bursátiles verificadas para esta fecha.",published:"Publicado",source:"Fuente"},
  "pt-br":{title:"Atualizações do mercado de ações",description:"Comunicados oficiais de bolsas, reguladores e empresas serão organizados por data após a verificação das condições de uso.",empty:"Não há atualizações verificadas do mercado de ações nesta data.",published:"Publicado",source:"Fonte"},
  de:{title:"Meldungen zu den Aktienmärkten",description:"Offizielle Mitteilungen von Börsen, Aufsichtsbehörden und Unternehmen werden nach Prüfung der Nutzungsbedingungen datiert bereitgestellt.",empty:"Für dieses Datum liegen keine geprüften Börsenmeldungen vor.",published:"Veröffentlicht",source:"Quelle"},
  fr:{title:"Actualités des marchés boursiers",description:"Les communiqués officiels des bourses, autorités et entreprises seront classés par date après vérification des conditions d’utilisation.",empty:"Aucune actualité boursière vérifiée pour cette date.",published:"Publié",source:"Source"},
  vi:{title:"Thông tin đáng chú ý về thị trường chứng khoán",description:"Thông báo chính thức từ sở giao dịch, cơ quan quản lý và doanh nghiệp sẽ được sắp xếp theo ngày sau khi xác minh điều kiện sử dụng.",empty:"Không có thông tin thị trường chứng khoán đã xác minh cho ngày này.",published:"Ngày công bố",source:"Nguồn"},
  id:{title:"Kabar penting pasar saham",description:"Pengumuman resmi bursa, regulator, dan perusahaan akan disajikan berdasarkan tanggal setelah ketentuan penggunaannya diverifikasi.",empty:"Tidak ada kabar pasar saham terverifikasi untuk tanggal ini.",published:"Diterbitkan",source:"Sumber"},
  th:{title:"ประเด็นสำคัญของตลาดหุ้น",description:"ประกาศทางการจากตลาดหลักทรัพย์ หน่วยงานกำกับดูแล และบริษัทจะจัดตามวันที่หลังตรวจสอบเงื่อนไขการใช้งานแล้ว",empty:"ไม่มีประเด็นตลาดหุ้นที่ตรวจสอบแล้วสำหรับวันนี้",published:"เผยแพร่",source:"แหล่งที่มา"},
  "zh-tw":{title:"股票市場重要動態",description:"確認來源使用條件後，將依日期提供交易所、監管機關與企業的官方資訊。",empty:"該日期沒有已核實的股票市場動態。",published:"發布日期",source:"來源"},
  it:{title:"Notizie importanti sui mercati azionari",description:"Le comunicazioni ufficiali di borse, autorità e aziende saranno organizzate per data dopo averne verificato le condizioni d’uso.",empty:"Nessuna notizia verificata sui mercati azionari per questa data.",published:"Pubblicato",source:"Fonte"},
  nl:{title:"Belangrijke berichten over aandelenmarkten",description:"Officiële mededelingen van beurzen, toezichthouders en bedrijven worden na controle van de gebruiksvoorwaarden per datum aangeboden.",empty:"Voor deze datum zijn geen gecontroleerde beursberichten beschikbaar.",published:"Gepubliceerd",source:"Bron"},
  hi:{title:"शेयर बाज़ार की प्रमुख घोषणाएँ",description:"उपयोग की शर्तें सत्यापित होने के बाद एक्सचेंज, नियामकों और कंपनियों की आधिकारिक घोषणाएँ तारीख के अनुसार दी जाएँगी।",empty:"इस तारीख के लिए कोई सत्यापित शेयर बाज़ार सूचना उपलब्ध नहीं है।",published:"प्रकाशित",source:"स्रोत"},

  "tr": {title:"Borsa haberleri",description:"Borsalar, düzenleyiciler ve şirketlerden tarihli duyurular, kullanım izinleri doğrulandıktan sonra yayımlanır.",empty:"Bu tarih için doğrulanmış borsa haberi yok.",published:"Yayınlandı",source:"Kaynak"}
,
  "pl": {title:"Wiadomości z rynku akcji",description:"Datowane komunikaty giełd, regulatorów i firm będą publikowane po sprawdzeniu praw do źródeł.",empty:"Brak zweryfikowanych wiadomości giełdowych z tego dnia.",published:"Opublikowano",source:"Źródło"}
,
  "fil": {title:"Mga balita sa stock market",description:"Ilalathala ayon sa petsa ang mga pahayag mula sa palitan, regulator at kumpanya kapag napatunayan ang pahintulot sa pinagmulan.",empty:"Walang beripikadong balita sa stock market para sa petsang ito.",published:"Nai-publish",source:"Pinagmulan"}
,
  "bn": {title:"শেয়ারবাজারের খবর",description:"উৎস ব্যবহারের অনুমতি যাচাই হলে এক্সচেঞ্জ, নিয়ন্ত্রক ও কোম্পানির তারিখভিত্তিক ঘোষণা দেখানো হবে।",empty:"এই তারিখে যাচাইকৃত শেয়ারবাজারের খবর নেই।",published:"প্রকাশিত",source:"উৎস"}
};
