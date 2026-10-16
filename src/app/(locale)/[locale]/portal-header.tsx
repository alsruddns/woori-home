import Image from "next/image";
import type { Locale } from "@/lib/site";
import { familyContactCopy } from "@/lib/family-contact";
import FamilySiteNav from "./family-site-select";
import LanguageSelector from "./language-selector";

export default function PortalHeader({ locale }: { locale: Locale }) {
  return <header className="site-header"><div className="header-inner">
    <a className="brand" href={`/${locale}`} aria-label={familyContactCopy[locale].logoLabel}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="" width={419} height={99} priority /></a>
    <FamilySiteNav locale={locale} />
    <div className="header-controls"><LanguageSelector locale={locale} /></div>
  </div></header>;
}
