"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/site";
import { countryCopy } from "@/lib/data-platform/country-copy";
import { countryName } from "@/lib/data-platform/countries";

export type CountrySeries = { code: string; iso3: string; observations: { year: number; value: number; unit: string }[] };
type Props = { locale: Locale; title: string; unit: string; series: CountrySeries[] };
const colors = ["#78a9ff", "#39c9b8", "#f2ad62", "#bd91e8", "#ee7885"];

export function CountryTrendChart({ locale, title, unit, series }: Props) {
  const [period, setPeriod] = useState("10");
  const copy = countryCopy[locale];
  const visible = useMemo(() => {
    const lastYear = Math.max(0, ...series.flatMap((item) => item.observations.map((row) => row.year)));
    const startYear = period === "all" ? -Infinity : lastYear - Number(period) + 1;
    return series.map((item) => ({ ...item, observations: item.observations.filter((row) => row.year >= startYear) }));
  }, [period, series]);
  const rows = visible.flatMap((item) => item.observations);
  if (!rows.length) return <p className="platform-empty-row">{copy.noObservations}</p>;
  const years = rows.map((row) => row.year);
  const minYear = Math.min(...years); const maxYear = Math.max(...years);
  const rawMin = Math.min(...rows.map((row) => row.value)); const rawMax = Math.max(...rows.map((row) => row.value));
  const span = rawMax - rawMin || Math.max(Math.abs(rawMax) * .1, 1);
  const minValue = rawMin - span * .08; const maxValue = rawMax + span * .08;
  const x = (year: number) => 78 + (year - minYear) / Math.max(1, maxYear - minYear) * 620;
  const y = (value: number) => 18 + (maxValue - value) / (maxValue - minValue) * 212;
  const ticks = Array.from({ length: 5 }, (_, index) => maxValue - (maxValue - minValue) * index / 4);
  const yearTicks = [...new Set([minYear, Math.round((minYear + maxYear) / 2), maxYear])];
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });

  return <div className="country-chart" aria-label={title}>
    <label className="country-chart-period">{copy.period}<select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label={`${copy.period}: ${title}`}>
      <option value="10">{copy.last10}</option><option value="20">{copy.last20}</option><option value="30">{copy.last30}</option><option value="all">{copy.allYears}</option>
    </select></label>
    <div className="country-chart-plot"><svg viewBox="0 0 720 280" role="img" aria-label={`${title}; ${unit}`}>
      {ticks.map((tick, index) => <g key={index}><line className="country-chart-grid" x1="78" x2="698" y1={18 + index * 53} y2={18 + index * 53}/><text className="country-chart-axis" x="70" y={22 + index * 53} textAnchor="end">{compact.format(tick)}</text></g>)}
      {yearTicks.map((year) => <text className="country-chart-axis" key={year} x={x(year)} y="258" textAnchor="middle">{year}</text>)}
      {visible.map((item, itemIndex) => {
        const segments: typeof item.observations[] = [];
        for (const observation of item.observations) {
          const segment = segments.at(-1);
          if (!segment || observation.year - segment.at(-1)!.year > 1) segments.push([observation]);
          else segment.push(observation);
        }
        return <g key={item.code}>
          {segments.filter((segment) => segment.length > 1).map((segment, segmentIndex) => <polyline className="country-chart-line" key={segmentIndex} points={segment.map((row) => `${x(row.year)},${y(row.value)}`).join(" ")} stroke={colors[itemIndex % colors.length]}/ >)}
          {item.observations.map((row) => <circle className="country-chart-point" key={row.year} cx={x(row.year)} cy={y(row.value)} r="3.2" fill={colors[itemIndex % colors.length]} tabIndex={0} aria-label={`${countryName(item.code, locale)}, ${row.year}: ${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(row.value)} ${unit}`}><title>{`${countryName(item.code, locale)} · ${row.year}: ${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(row.value)} ${unit}`}</title></circle>)}
        </g>;
      })}
    </svg></div>
    <div className="country-chart-legend">{visible.map((item, index) => <span key={item.code}><i style={{ background: colors[index % colors.length] }}/>{countryName(item.code, locale)}</span>)}</div>
  </div>;
}
