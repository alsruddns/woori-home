"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/site";
import { financialOverviewCopy } from "@/lib/data-platform/financial-overview-copy";
import { platformCopy } from "@/lib/data-platform/locales";
import { CompanyFinancialTreemap } from "./company-financial-treemap";

export function FinancialOverviewDashboard({ locale }: { locale: Locale }) {
  const copy = financialOverviewCopy[locale];
  const platform = platformCopy[locale];
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");
  const router = useRouter();

  return <div className="financial-dashboard">
    <header className="platform-page-heading financial-overview-heading">
      <span className="platform-eyebrow">SEC EDGAR</span>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>
    </header>

    <section className="financial-dashboard-feature" aria-label={copy.title}>
      <CompanyFinancialTreemap locale={locale} period={period} onPeriodChange={setPeriod} onSelectCompany={() => {
        router.push(`/${locale}/stocks#company-fundamentals-title`);
      }} />
    </section>

    <nav className="financial-dashboard-markets" aria-label={copy.title}>
      <Link href={`/${locale}/stocks`}>{platform.categories[2]}</Link>
      <Link href={`/${locale}/crypto`}>{platform.categories[3]}</Link>
    </nav>
  </div>;
}
