"use client";

import { usePathname, useRouter } from "next/navigation";
import { getLocalePath, localeNames, locales, uiLabels, type Locale } from "@/lib/site";

export default function LanguageSelector({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  return <select className="language-select" value={locale} onChange={(event) => {
    router.push(getLocalePath(pathname ?? `/${locale}`, event.target.value as Locale));
  }} aria-label={uiLabels[locale].language}>{locales.map((item) => <option key={item} value={item}>{localeNames[item]}</option>)}</select>;
}
