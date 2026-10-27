import Link from "next/link";
import type { Locale } from "@/lib/site";
import { getGuide, guideUiCopy } from "@/lib/data-platform/guides";

export function RelatedGuides({ locale, slugs }: { locale: Locale; slugs: string[] }) {
  if (locale !== "ko" && locale !== "en") return null;
  const copy = guideUiCopy[locale];
  const items = slugs.map(getGuide).filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));
  if (!items.length) return null;
  return <section className="portal-related-guides" aria-labelledby="portal-related-guides-title">
    <div><span className="platform-eyebrow">WOORI.TODAY</span><h2 id="portal-related-guides-title">{copy.related}</h2></div>
    <ul>{items.map((guide) => <li key={guide.slug}><Link href={`/${locale}/guides/${guide.slug}`}><strong>{guide.title[locale]}</strong><span>{guide.summary[locale]}</span></Link></li>)}</ul>
  </section>;
}
