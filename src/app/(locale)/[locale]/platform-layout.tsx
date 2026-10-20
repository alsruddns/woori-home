import type { ReactNode } from "react";
import Link from "next/link";
import { familySiteHref, familySitesCopy } from "@/lib/family-sites";
import { platformCopy } from "@/lib/data-platform/locales";
import type { Locale } from "@/lib/site";
import { PlatformControls } from "./platform-controls";
import { PlatformSidebar } from "./platform-sidebar";
import { privacyContent } from "@/lib/privacy";
import { termsContent } from "@/lib/terms";
import ContactDialog from "./contact-dialog";

export function PlatformLayout({ locale, children }: { locale: Locale; children: ReactNode }) {
  const copy = platformCopy[locale];
  const family = familySitesCopy[locale];
  const siteKeys = ["portal", "calculator", "tools", "moneyBook", "docs", "quiz"] as const;
  return <div className="platform-shell">
    <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem('woori-platform-theme')==='light'?'light':'dark'}catch(e){}` }} />
    <header className="platform-header">
      <Link className="platform-brand" href={`/${locale}`}><span className="platform-brand-mark">W</span><span>woori.today</span></Link>
      <nav className="platform-family-nav" aria-label={copy.siteLabel}>{siteKeys.map((key) => <a key={key} href={familySiteHref(locale, key)} aria-current={key === "portal" ? "page" : undefined}>{family.sites[key]}</a>)}</nav>
      <PlatformControls locale={locale} />
    </header>
    <div className="platform-frame">
      <PlatformSidebar locale={locale} />
      <main className="platform-main">{children}<footer className="platform-footer"><nav aria-label={copy.siteLabel}><Link href={`/${locale}/about`}>{copy.categories[7]}</Link><Link href={`/${locale}/privacy`}>{privacyContent[locale]!.title}</Link><Link href={`/${locale}/terms`}>{termsContent[locale]!.terms}</Link><ContactDialog locale={locale} /></nav></footer></main>
    </div>
  </div>;
}
