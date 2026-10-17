"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/site";
import { familySiteHref, familySiteKeys, familySitesCopy, moneyBookFallbackCopy } from "@/lib/family-sites";

export default function FamilySiteNav({ locale }: { locale: Locale }) {
  const copy = familySitesCopy[locale];
  const pathname = usePathname() ?? `/${locale}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const active = familySiteKeys.find((key) => {
    const href = familySiteHref(locale, key);
    return key === "portal" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }) ?? "portal";

  return <>
    <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="family-site-nav" aria-label={copy.menu} onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
    <nav className={`family-site-nav${menuOpen ? " is-open" : ""}`} id="family-site-nav" aria-label={copy.label}>
      {familySiteKeys.map((key) => {
        const fallback = key === "moneyBook" ? moneyBookFallbackCopy[locale] : undefined;
        return <a key={key} href={familySiteHref(locale, key)} title={fallback} aria-label={fallback ? `${copy.sites[key]}. ${fallback}` : undefined} aria-current={active === key ? "page" : undefined} onClick={() => setMenuOpen(false)}>{copy.sites[key]}{fallback ? <span className="nav-fallback-note"> ↗</span> : null}</a>;
      })}
    </nav>
  </>;
}
