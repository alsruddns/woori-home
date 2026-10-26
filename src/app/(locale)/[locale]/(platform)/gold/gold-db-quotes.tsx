"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/site";
import type { GoldCopy, GoldPageSection } from "@/lib/data-platform/gold-copy";
import { validateGoldSnapshot, type GoldQuote } from "@/lib/data-platform/gold-market";
import type { GoldMarketRow } from "@/lib/data-platform/gold-db-market.mjs";
import { GoldQuotePanel } from "./gold-quote-panel";

export function GoldDbQuotes({ locale, section, copy, fallback }: { locale: Locale; section: GoldPageSection; copy: GoldCopy; fallback: ReactNode }) {
  const [quotes, setQuotes] = useState<GoldQuote[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/portal-api/finance/gold", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { status?: string; data?: GoldMarketRow[] };
        if (payload.status !== "success" || !Array.isArray(payload.data)) return;
        const normalized: GoldQuote[] = payload.data.map((row) => ({
          providerId: `${row.providerId}:${row.sourceAssetId}`, providerName: row.providerName,
          priceKind: "market-reference", currency: row.currency, unit: "gram", price: Number(row.pricePerGram),
          licenseReference: row.licenseReference, rightsVerified: true, observedAt: row.referenceDate,
          observedTime: row.observedAt, stale: row.stale, previousTradingDate: null, fetchedAt: row.collectedAt,
          sourceUrl: row.sourceUrl, conditions: `${row.attribution} · ${row.venue} · USD / troy oz · ${copy.marketReference}`,
        }));
        if (validateGoldSnapshot({ schemaVersion: 1, status: "success", reason: "", quotes: normalized })) setQuotes(normalized);
      }).catch(() => { /* Preserve the localized unavailable state on abort/network/DB failure. */ });
    return () => controller.abort();
  }, [copy.marketReference]);
  return quotes.length ? <GoldQuotePanel locale={locale} section={section} quotes={quotes} copy={copy} /> : fallback;
}
