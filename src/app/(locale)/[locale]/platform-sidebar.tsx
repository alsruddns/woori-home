"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dataCategories } from "@/lib/data-platform/registry";
import { platformCopy } from "@/lib/data-platform/locales";
import type { Locale } from "@/lib/site";

const paths = ["/world", "/economy", "/stocks", "/population", "/energy", "/countries", "/science", "/about"] as const;

export function PlatformSidebar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const copy = platformCopy[locale];
  return <aside className="platform-sidebar"><p className="platform-sidebar-label">{copy.menu}</p><nav aria-label={copy.menu}>{dataCategories.map((category, index) => {
    const href = `/${locale}${paths[index]}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={category.id} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>{copy.categories[index]}</Link>;
  })}</nav></aside>;
}
