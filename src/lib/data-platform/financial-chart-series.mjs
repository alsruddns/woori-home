/** Presentation-only coordinates. Real timestamp spacing and gaps are retained; prices are never interpolated. */
export function dailyPriceChartSegments(points) {
  const valid = points.map((point) => ({ time: Date.parse(point.timestamp), price: Number(point.price) }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.price) && point.price > 0)
    .sort((a,b) => a.time-b.time);
  if (!valid.length) return [];
  const start=valid[0].time, end=valid.at(-1).time;
  const low=Math.min(...valid.map(point=>point.price)), high=Math.max(...valid.map(point=>point.price));
  const segments=[];
  valid.forEach((point,index)=>{
    if (!index || point.time-valid[index-1].time > 36*60*60*1000) segments.push([]);
    const x=start===end?50:(point.time-start)/(end-start)*100;
    const y=high===low?50:90-(point.price-low)/(high-low)*80;
    segments.at(-1).push(`${x},${y}`);
  });
  return segments;
}
