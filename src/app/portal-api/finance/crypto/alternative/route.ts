import { financialRateLimit } from '@/lib/data-platform/financial-route';
import { getFinancialReadOnlyPool } from '@/lib/db/financial-readonly';
import { readOpenPriceMarket } from '@/lib/data-platform/open-price-market.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
  const limited=financialRateLimit(request);if(limited)return limited;
  const url=new URL(request.url);const assetId=url.searchParams.get('asset');
  if(assetId&&!/^\d{1,12}$/.test(assetId))return Response.json({error:'invalid-asset'},{status:400});
  const period=url.searchParams.get('period')??'1y';const days=period==='7d'?7:period==='30d'?30:period==='3m'?90:365;
  const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
  try{const data=await readOpenPriceMarket(getFinancialReadOnlyPool(),'crypto',{assetId,days});
    return Response.json(data,{status:data.status==='success'?200:503,headers});
  }catch{return Response.json({error:'market-data-unavailable',data:[]},{status:503,headers});}
}
