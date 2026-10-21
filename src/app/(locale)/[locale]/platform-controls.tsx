"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { localeConfig, type Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { familySiteHref, familySitesCopy } from "@/lib/family-sites";

function getTheme() { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
function subscribeTheme(callback: () => void) {
  document.addEventListener("woori-theme-change", callback);
  return () => document.removeEventListener("woori-theme-change", callback);
}

export function PlatformControls({ locale }: { locale: Locale }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "dark");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const copy = platformCopy[locale];
  const family = familySitesCopy[locale];
  const pathname = usePathname();
  const familyKeys = ["portal", "calculator", "tools", "moneyBook", "docs", "quiz"] as const;
  const categoryPaths = ["/world", "/economy", "/stocks", "/population", "/energy", "/countries", "/science"] as const;

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem("woori-platform-theme", next);
    } catch {
      // The selected theme still applies for this page if storage is unavailable.
    }
    document.dispatchEvent(new Event("woori-theme-change"));
  }

  return <div className="platform-controls">
    <label className="platform-locale-label"><span className="platform-sr-only">{localeConfig.find((item) => item.route === locale)?.nativeName}</span>
      <select aria-label={localeConfig.find((item) => item.route === locale)?.nativeName} value={locale} onChange={(event) => {
        const current = window.location.pathname.split("/").slice(2).join("/");
        router.push(`/${event.target.value}${current ? `/${current}` : ""}`);
      }}>
        {localeConfig.map((item) => <option key={item.route} value={item.route}>{item.nativeName}</option>)}
      </select>
    </label>
    <button className="platform-theme-toggle" onClick={toggleTheme} type="button" aria-label={theme === "dark" ? copy.themeLight : copy.themeDark}>{theme === "dark" ? copy.themeLight : copy.themeDark}</button>
    <button className="platform-mobile-toggle" type="button" aria-expanded={open} aria-controls="platform-mobile-menu" onClick={() => setOpen(!open)}>{copy.menu}</button>
    {open ? <nav id="platform-mobile-menu" className="platform-mobile-menu" aria-label={copy.menu}>
      <strong>{copy.siteLabel}</strong>
      {familyKeys.map((key) => <a key={key} href={familySiteHref(locale, key)} aria-current={key === "portal" && pathname === `/${locale}` ? "page" : undefined} onClick={() => setOpen(false)}>{family.sites[key]}</a>)}
      <strong>{copy.menu}</strong>
      {categoryPaths.map((path, index) => { const href = `/${locale}${path}`; const active = pathname === href || pathname.startsWith(`${href}/`) || (index === 0 && pathname === `/${locale}`); return <a key={path} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} onClick={() => setOpen(false)}>{copy.categories[index]}</a>; })}
    </nav> : null}
  </div>;
}
