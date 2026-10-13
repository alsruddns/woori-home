"use client";

import type { Locale } from "@/lib/site";
import { familyContactCopy } from "@/lib/family-contact";

export default function FamilySiteSelect({ locale }: { locale: Locale }) {
  const copy = familyContactCopy[locale];
  return <label className="family-site-control"><span className="visually-hidden">{copy.familySite}</span><select className="family-site-select" aria-label={copy.familySite} value="portal" onChange={(event) => {
    const paths = { portal: `/${locale}`, money: `/${locale}/money`, calculators: `/${locale}/calculators`, tools: `/${locale}/tools` };
    window.location.assign(paths[event.target.value as keyof typeof paths]);
  }}><option value="portal">{copy.portal}</option><option value="money">{copy.moneyBook}</option><option value="calculators">{copy.calculator}</option><option value="tools">{copy.tools}</option></select></label>;
}
