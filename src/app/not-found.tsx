"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { isLocale, type Locale } from "@/lib/site";
import { notFoundMessages } from "@/lib/not-found";

export default function NotFound() {
  const segments = (usePathname() ?? "").split("/").filter(Boolean);
  const route = segments[0];
  const locale: Locale = route && isLocale(route) ? route : "ko";
  const copy = notFoundMessages[locale];
  return <main className="not-found-page">
    <a className="brand" href={`/${locale}`}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="WOORI.TODAY" width={419} height={99} priority /></a>
    <span className="not-found-code">404</span>
    <h1>{copy.title}</h1>
    <p>{copy.description}</p>
    <a className="button button-primary" href={`/${locale}`}>{copy.home}<span aria-hidden="true">→</span></a>
  </main>;
}
