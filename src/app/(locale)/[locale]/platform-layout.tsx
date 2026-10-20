import type { ReactNode } from "react";
import Link from "next/link";
import { familySiteHref, familySitesCopy } from "@/lib/family-sites";
import { dataCategories } from "@/lib/data-platform/registry";
import { platformCopy } from "@/lib/data-platform/locales";
import type { Locale } from "@/lib/site";
import { PlatformControls } from "./platform-controls";

export function PlatformLayout({ locale, children }: { locale: Locale; children: ReactNode }) {
  const copy = platformCopy[locale];
  const family = familySitesCopy[locale];
  const siteKeys = ["portal", "calculator", "tools", "moneyBook", "docs", "quiz"] as const;
  const paths = ["/world", "/economy", "/stocks", "/population", "/energy", "/countries", "/science", "/about"] as const;
  return <div className="platform-shell">
    <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem('woori-platform-theme')==='light'?'light':'dark'}catch(e){}` }} />
    <header className="platform-header">
      <Link className="platform-brand" href={`/${locale}`}><span className="platform-brand-mark">W</span><span>woori.today</span></Link>
      <nav className="platform-family-nav" aria-label={copy.siteLabel}>{siteKeys.map((key) => <a key={key} href={familySiteHref(locale, key)} aria-current={key === "portal" ? "page" : undefined}>{family.sites[key]}</a>)}</nav>
      <PlatformControls locale={locale} />
    </header>
    <div className="platform-frame">
      <aside className="platform-sidebar"><p className="platform-sidebar-label">{copy.menu}</p><nav aria-label={copy.menu}>{dataCategories.map((category, index) => <Link key={category.id} href={`/${locale}${paths[index]}`}>{copy.categories[index]}</Link>)}</nav></aside>
      <main className="platform-main">{children}<footer className="platform-footer"><span>{copy.sourceNote}</span><a href="https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api">{copy.dataSource}: World Bank</a></footer></main>
    </div>
  </div>;
}
