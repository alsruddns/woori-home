"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { categoryNavigation } from "@/lib/data-platform/category-navigation";
import { isSidebarCategoryActive } from "@/lib/data-platform/sidebar-active";
import { platformCopy } from "@/lib/data-platform/locales";
import type { Locale } from "@/lib/site";

export function PlatformSidebar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const categories = categoryNavigation(locale);
  const menuLabel = platformCopy[locale].menu;
  return <aside className="platform-sidebar"><p className="platform-sidebar-label">{menuLabel}</p><nav aria-label={menuLabel}>{categories.map((category) => {
    const href = `/${locale}${category.path}`;
    const active = isSidebarCategoryActive(pathname, locale, category);
    return <Link key={category.id} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>{category.label}</Link>;
  })}</nav></aside>;
}
