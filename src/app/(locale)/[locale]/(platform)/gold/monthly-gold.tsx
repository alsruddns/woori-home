'use client';
import {useState} from 'react';
import type {Locale} from '@/lib/site';
import type {GoldCopy} from '@/lib/data-platform/gold-copy';
import type {OpenPriceMarket} from '@/lib/data-platform/open-price-market.mjs';
import {monthlyGoldCopy,goldTimeLabels} from '@/lib/data-platform/monthly-gold-copy';
import {stalePriceLabel} from '@/lib/data-platform/financial-price-status-copy';
export function MonthlyGold({locale,market,copy}:{locale:Locale;market:OpenPriceMarket;copy:GoldCopy}){
 const [count,setCount]=useState(60);const rows=market.data;const latest=rows[0];if(!latest)return null;
 const money=(s:string)=>new Intl.NumberFormat(locale,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(s));
 const month=(s:string)=>new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(s+'T00:00:00Z'));
 const series=rows.slice(0,count).reverse();const values=series.map(r=>Number(r.price));const lo=Math.min(...values),hi=Math.max(...values);const span=hi-lo||1;
 const lines:string[][]=[];series.forEach((r,i)=>{const previous=series[i-1];const date=new Date(r.referenceDate),before=previous?new Date(previous.referenceDate):null;
  const gap=before&&(date.getUTCFullYear()*12+date.getUTCMonth())-(before.getUTCFullYear()*12+before.getUTCMonth())!==1;
  if(!lines.length||gap)lines.push([]);lines.at(-1)!.push(`${20+i/Math.max(1,series.length-1)*660},${200-(Number(r.price)-lo)/span*180}`);});
 return <section className="gold-quote-panel" aria-label={monthlyGoldCopy[locale]}>
  <h2>{monthlyGoldCopy[locale]}</h2>
  <div className="gold-quote-grid"><article><h3>{month(latest.referenceDate)}</h3><strong className="gold-price">{money(latest.price)}</strong><p>USD / troy oz</p></article></div>
  <p>{copy.sourceTitle}: <a href={market.sourceUrl} target="_blank" rel="noreferrer">World Bank Pink Sheet</a> · <a href={market.licenseUrl}>CC BY 4.0</a></p>
  <p>{market.attribution}</p>
  <p>{goldTimeLabels[locale][0]}: {new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(latest.observedAt))} · UTC</p>
  <p>{goldTimeLabels[locale][1]}: {new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(latest.collectedAt))} UTC</p>
  {market.stale&&<p role="status">{stalePriceLabel[locale]}</p>}
  <label>{copy.history} <select value={count} onChange={e=>setCount(Number(e.target.value))}>{[12,60,120,1000].map(n=><option key={n} value={n}>{n===1000?`${month(rows.at(-1)!.referenceDate)} – ${month(latest.referenceDate)}`:new Intl.NumberFormat(locale,{style:'unit',unit:'year',unitDisplay:'long'}).format(n/12)}</option>)}</select></label>
  <svg viewBox="0 0 700 230" role="img" aria-label={`${monthlyGoldCopy[locale]} · USD / troy oz`} style={{width:'100%',maxHeight:300}}>{lines.map((line,i)=><polyline key={i} points={line.join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/>)}<text x="20" y="226" fontSize="11" fill="currentColor">{month(series[0].referenceDate)}</text><text x="680" y="226" textAnchor="end" fontSize="11" fill="currentColor">{month(latest.referenceDate)}</text></svg>
  <div style={{overflowX:'auto'}}><table><caption>{monthlyGoldCopy[locale]}</caption><thead><tr><th>{new Intl.DisplayNames(locale,{type:'dateTimeField'}).of('month')}</th><th>USD / troy oz</th></tr></thead><tbody>{rows.slice(0,12).map(r=><tr key={r.referenceDate}><th>{month(r.referenceDate)}</th><td>{money(r.price)}</td></tr>)}</tbody></table></div>
 </section>;
}
