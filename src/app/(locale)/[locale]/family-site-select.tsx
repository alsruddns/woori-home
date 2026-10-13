"use client";

import type { Locale } from "@/lib/site";
import { familySitesCopy } from "@/lib/family-sites";

export default function FamilySiteSelect({ locale }: { locale: Locale }) {
  const copy = familySitesCopy[locale];
  const paths = { portal: "/" + locale, calculators: "/" + locale + "/calculators", tools: "/" + locale + "/tools", money: "/" + locale + "/money" };
  return <label className="family-site-control"><span className="family-site-label">{copy.label}</span><span className="visually-hidden" id="family-site-new-tab">{copy.newTab}</span><select className="family-site-select" aria-label={copy.label} aria-describedby="family-site-new-tab" value="portal" onChange={(event) => {
    const target = paths[event.target.value as keyof typeof paths];
    window.open(target, "_blank", "noopener,noreferrer");
  }}><option value="portal">{copy.portal}</option><option value="calculators">{copy.calculator}</option><option value="tools">{copy.tools}</option><option value="money">{copy.moneyBook}</option></select></label>;
}
