"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/site";
import { financialUiCopy } from "@/lib/data-platform/financial-ui-copy";

type PricePoint = { referenceDate: string; close: string; currency: string };

export function FinancialPriceChart({ assetId, locale, currency, title }: { assetId: string; locale: Locale; currency: string; title: string }) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loadedId, setLoadedId] = useState("");
  const ready = loadedId === assetId;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/portal-api/finance/assets/${encodeURIComponent(assetId)}/history?limit=90`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("History unavailable");
        return response.json() as Promise<{ data: Array<{ referenceDate: string; close: string }> }>;
      })
      .then((result) => { setHistory(result.data.map((row) => ({ ...row, currency }))); setLoadedId(assetId); })
      .catch(() => { if (!controller.signal.aborted) { setHistory([]); setLoadedId(assetId); } });
    return () => controller.abort();
  }, [assetId, currency]);

  const points = useMemo(() => {
    const rows = [...history].reverse().map((row) => ({ ...row, value: Number(row.close) })).filter((row) => Number.isFinite(row.value));
    if (rows.length < 2) return null;
    const values = rows.map((row) => row.value);
    const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || Math.max(Math.abs(max), 1) * 0.01;
    const coordinates = rows.map((row, index) => `${(index / (rows.length - 1)) * 500},${110 - ((row.value - min) / spread) * 100}`);
    const first = rows[0]; const last = rows.at(-1)!;
    return { polyline: coordinates.join(" "), first, last, min, max };
  }, [history]);

  if (!ready || !points) return null;
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const formatPrice = (value: number) => currency === "USDT"
    ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(value)} USDT`
    : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 8 }).format(value);
  const accessibleLabel = `${title}. ${formatDate(points.first.referenceDate)}: ${formatPrice(points.first.value)}. ${formatDate(points.last.referenceDate)}: ${formatPrice(points.last.value)}.`;
  return <figure className="financial-price-chart">
    <figcaption><strong>{title}</strong><span>{formatDate(points.first.referenceDate)} – {formatDate(points.last.referenceDate)}</span></figcaption>
    <svg viewBox="0 0 500 120" role="img" aria-label={accessibleLabel} preserveAspectRatio="none"><polyline points={points.polyline} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>
    <div><span>{formatPrice(points.min)}</span><span>{formatPrice(points.max)}</span></div>
    <p className="sr-only">{financialUiCopy[locale].price}: {formatPrice(points.first.value)} ({formatDate(points.first.referenceDate)}) — {formatPrice(points.last.value)} ({formatDate(points.last.referenceDate)}).</p>
  </figure>;
}
