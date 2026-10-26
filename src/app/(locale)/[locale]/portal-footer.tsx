import Image from "next/image";
import { localeNames, locales, messages, type Locale } from "@/lib/site";
import { familyContactCopy } from "@/lib/family-contact";
import { enabledFamilySiteKeys, familySiteHref, familySitesCopy } from "@/lib/family-sites";
import { privacyContent } from "@/lib/privacy";
import { termsContent } from "@/lib/terms";
import ContactDialog from "./contact-dialog";
import LanguageSelector from "./language-selector";

export default function PortalFooter({ locale }: { locale: Locale }) {
  const copy = messages[locale];
  const familyCopy = familySitesCopy[locale];
  return <footer className="site-footer">
    <div className="footer-main section-wrap">
      <div><a className="brand footer-brand" href={`/${locale}`} aria-label={familyContactCopy[locale].logoLabel}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="" width={419} height={99} /></a><p>{copy.footer}</p></div>
      <div className="footer-services">
        <span>{copy.featured}</span>
        {enabledFamilySiteKeys.filter((key) => key !== "portal").map((key) => <a key={key} href={familySiteHref(locale, key)}>{familyCopy.sites[key]}</a>)}
        <a href={`/${locale}/privacy`}>{privacyContent[locale]!.title}</a>
        <a href={`/${locale}/terms`}>{termsContent[locale]!.terms}</a>
        <ContactDialog locale={locale} />
      </div>
    </div>
    <div className="footer-bottom section-wrap">
      <span>© {new Date().getFullYear()} WOORI.TODAY</span>
      <LanguageSelector locale={locale} />
      <span className="footer-languages">{locales.map((item, index) => <span key={item}>{index > 0 ? " · " : ""}{localeNames[item]}</span>)}</span>
      <span className="footer-domain">www.woori.today</span>
    </div>
  </footer>;
}
