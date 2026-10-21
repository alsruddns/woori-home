"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dataCategories } from "@/lib/data-platform/registry";
import { platformCopy } from "@/lib/data-platform/locales";
import { localizedNewCategories } from "@/lib/data-platform/research-copy";
import type { Locale } from "@/lib/site";
import { goldCopy } from "@/lib/data-platform/gold-copy";

export function PlatformSidebar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const copy = platformCopy[locale];
  return <aside className="platform-sidebar"><p className="platform-sidebar-label">{copy.menu}</p><nav aria-label={copy.menu}>{dataCategories.map((category, index) => {
    const href = `/${locale}${category.path}`;
    const active = pathname === href || pathname.startsWith(`${href}/`) || (category.id === "world" && pathname === `/${locale}`);
    const label = category.id === "papers" ? localizedNewCategories[locale].papers : category.id === "commodities" ? localizedNewCategories[locale].commodities : category.id === "gold" ? goldCopy[locale].title : copy.categories[index];
    return <Link key={category.id} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>{label}</Link>;
  })}</nav></aside>;
}
