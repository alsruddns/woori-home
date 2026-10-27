import { financialRateLimit } from '@/lib/data-platform/financial-route';
import { getFinancialReadOnlyPool } from '@/lib/db/financial-readonly';
import { readOpenPriceMarket } from '@/lib/data-platform/open-price-market.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
  const limited=financialRateLimit(request);if(limited)return limited;
  const url=new URL(request.url);const assetId=url.searchParams.get('asset');const date=url.searchParams.get('date');
  if(assetId&&!/^\d{1,12}$/.test(assetId))return Response.json({error:'invalid-asset'},{status:400});
  if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(`${date}T00:00:00.000Z`))||new Date(`${date}T00:00:00.000Z`).toISOString().slice(0,10)!==date||date>new Date().toISOString().slice(0,10)))return Response.json({error:'invalid-date'},{status:400});
  const period=url.searchParams.get('period')??'1y';const days:Record<string,number>={'1d':1,'5d':5,'1m':30,'3m':90,'6m':180,'1y':365,'3y':1095,'5y':1825,'10y':3650,'all':3650};
  if(!(period in days))return Response.json({error:'invalid-period'},{status:400});
  const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
  try{const data=await readOpenPriceMarket(getFinancialReadOnlyPool(),'crypto',{assetId,date,days:days[period]});
    return Response.json(data,{status:data.status==='provider-rights-pending'?503:data.status==='invalid-date'?400:200,headers});
  }catch{return Response.json({error:'market-data-unavailable',data:[]},{status:503,headers});}
}
