"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/site";
import { familySiteKeys, familySitesCopy } from "@/lib/family-sites";

const routes = { portal: "", calculator: "calculators", tools: "tools", moneyBook: "money", docs: "docs", quiz: "quiz" } as const;

export default function FamilySiteNav({ locale }: { locale: Locale }) {
  const copy = familySitesCopy[locale];
  const pathname = usePathname() ?? `/${locale}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const active = familySiteKeys.find((key) => {
    const segment = routes[key];
    return segment ? pathname === `/${locale}/${segment}` || pathname.startsWith(`/${locale}/${segment}/`) : pathname === `/${locale}`;
  }) ?? "portal";

  return <>
    <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="family-site-nav" aria-label={copy.menu} onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
    <nav className={`family-site-nav${menuOpen ? " is-open" : ""}`} id="family-site-nav" aria-label={copy.label}>
      {familySiteKeys.map((key) => <a key={key} href={`/${locale}${routes[key] ? `/${routes[key]}` : ""}`} aria-current={active === key ? "page" : undefined} onClick={() => setMenuOpen(false)}>{copy.sites[key]}</a>)}
    </nav>
  </>;
}
