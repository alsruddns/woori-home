"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/site";
import { enabledFamilySiteKeys, familySiteHref, familySitesCopy } from "@/lib/family-sites";

export default function FamilySiteNav({ locale }: { locale: Locale }) {
  const copy = familySitesCopy[locale];
  const pathname = usePathname() ?? `/${locale}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const active = enabledFamilySiteKeys.find((key) => {
    const href = familySiteHref(locale, key);
    return key === "portal" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }) ?? "portal";

  return <>
    <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="family-site-nav" aria-label={copy.menu} onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
    <nav className={`family-site-nav${menuOpen ? " is-open" : ""}`} id="family-site-nav" aria-label={copy.label}>
      {enabledFamilySiteKeys.map((key) => {
        return <a key={key} href={familySiteHref(locale, key)} aria-current={active === key ? "page" : undefined} onClick={() => setMenuOpen(false)}>{copy.sites[key]}</a>;
      })}
    </nav>
  </>;
}
