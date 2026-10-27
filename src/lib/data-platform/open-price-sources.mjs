import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';
import { priceDecimal } from './financial-price-policy.mjs';

export const OPEN_PRICE_SOURCES = Object.freeze({
  gold: { id: 'worldbank-pink-gold', dataset: 'worldbank-pink-gold-monthly', name: 'World Bank Pink Sheet',
    url: 'https://www.worldbank.org/en/research/commodity-markets', terms: 'https://data.worldbank.org/summary-terms-of-use',
    license: 'CC BY 4.0', attribution: 'World Bank: Commodity Price Data (Pink Sheet): Gold. CC BY 4.0. Monthly series extracted by woori.today.' },
  crypto: { id: 'alternative-aggregate', dataset: 'alternative-usd-observations', name: 'Alternative.me',
    url: 'https://alternative.me/crypto/api/', terms: 'https://alternative.me/crypto/api/#terms-of-use',
    license: 'Alternative.me Crypto API Terms of Use (II)', attribution: 'Data from Alternative.me. USD aggregate price observed by woori.today.' },
});

export function openSourceRights(source) {
  const permissions = ['apiAccess','commercialUse','publicDisplay','dbStorage','longTermRetention','userApi',
    'csvRedistribution','derivedVisualization','dailySnapshot','adSupportedDisplay','competitorPermission'];
  return { ...Object.fromEntries(permissions.map(k=>[k,'confirmed'])), evidence: Object.fromEntries(permissions.map(k=>[k,{
    url:source.terms,reviewedAt:'2026-10-26T21:00:00Z',scope: source.id === OPEN_PRICE_SOURCES.gold.id
      ? 'Pink Sheet gold monthly nominal USD series; CC BY 4.0 summary terms linked from publisher page; no additional restriction in workbook metadata. Preserve attribution, license and extraction notice.'
      : 'Crypto API Terms of Use (II) explicitly permit API data in any way including commercial projects; limited daily USD aggregate observations, attribution retained. Not an exchange closing price.'
  }])) };
}

export async function boundedDownload(url, maxBytes, fetchImpl=fetch) {
  const r=await fetchImpl(url,{signal:AbortSignal.timeout(30000),redirect:'error',cache:'no-store'});
  if(!r.ok) throw new Error(`Open price source HTTP ${r.status}`);
  if(Number(r.headers.get('content-length'))>maxBytes) throw new Error('Source file too large');
  const reader=r.body.getReader();const chunks=[];let size=0;
  try { for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw new Error('Source file too large');chunks.push(Buffer.from(value));} }
  finally {await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks);
}

const list = v => v == null ? [] : Array.isArray(v) ? v : [v];
const text = v => typeof v === 'object' ? String(v?.['#text']??'') : String(v??'');
export function parsePinkSheet(bytes,{now=new Date()}={}) {
  if(bytes.length>4_000_000)throw new Error('Pink Sheet exceeds archive bound');
  let expanded=0;
  const files=unzipSync(bytes,{filter:f=>{expanded+=f.originalSize;if(expanded>30_000_000)throw new Error('Workbook expansion exceeds bound');return /^(xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/sheet\d+\.xml))$/.test(f.name);}});
  const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,processEntities:false});
  const xml=name=>{if(!files[name])throw new Error('Workbook member missing');return parser.parse(Buffer.from(files[name]).toString('utf8'));};
  const strings=list(xml('xl/sharedStrings.xml').sst.si).map(si=>si.t!==undefined?text(si.t):list(si.r).map(r=>text(r.t)).join(''));
  const sheets=list(xml('xl/workbook.xml').workbook.sheets.sheet);
  const sheet=sheets.find(s=>s['@_name']==='Monthly Prices');
  if(!sheet)throw new Error('Monthly Prices sheet missing');
  const rel=list(xml('xl/_rels/workbook.xml.rels').Relationships.Relationship).find(r=>r['@_Id']===sheet['@_r:id']);
  if(!/^worksheets\/sheet\d+\.xml$/.test(rel?.['@_Target']))throw new Error('Invalid worksheet relationship');
  const rows=list(xml('xl/'+rel['@_Target']).worksheet.sheetData.row).map(r=>list(r.c).map(c=>({col:c['@_r'].replace(/\d+$/,''),value:c['@_t']==='s'?strings[Number(c.v)]:text(c.v)})));
  const header=rows.find(r=>r.some(c=>c.value==='Gold'));const col=header?.find(c=>c.value==='Gold')?.col;
  if(!col||!rows.some(r=>r.some(c=>c.col===col&&c.value==='($/troy oz)')))throw new Error('Gold header or troy ounce unit missing');
  const updated=strings.find(s=>/^Updated on /i.test(s));const publishedAt=new Date(updated?.replace(/^Updated on /i,'')+' 00:00:00 UTC');
  if(!Number.isFinite(publishedAt.getTime())||publishedAt>now)throw new Error('Invalid workbook publication date');
  const prices=[];const seen=new Set();
  for(const row of rows){const period=row.find(c=>c.col==='A')?.value;const match=period?.match(/^(\d{4})M(0[1-9]|1[0-2])$/);if(!match)continue;
    const month=`${match[1]}-${match[2]}`;if(month>=now.toISOString().slice(0,7))throw new Error('Unfinished or future monthly observation');
    const raw=row.find(c=>c.col===col)?.value;if(!raw||raw==='...'||raw==='..')continue;
    // Excel uses binary floating point; publish explicit USD cents rather than its serialization noise.
    const number=Number(raw);if(!Number.isFinite(number)||number<=0||number>1e9)throw new Error('Invalid monthly gold price');
    const price=priceDecimal(number.toFixed(2),{positive:true});if(seen.has(month))throw new Error('Duplicate monthly observation');seen.add(month);
    prices.push({referenceDate:new Date(Date.UTC(Number(match[1]),Number(match[2]),0)).toISOString().slice(0,10),price,observedAt:publishedAt.toISOString()});
  }
  if(prices.length<12)throw new Error('Insufficient monthly gold observations');
  return {prices:prices.sort((a,b)=>a.referenceDate.localeCompare(b.referenceDate)),publishedAt:publishedAt.toISOString(),checksum:createHash('sha256').update(bytes).digest('hex')};
}

export async function fetchPinkSheet({fetchImpl=fetch,now=new Date()}={}) {
  const html=(await boundedDownload(OPEN_PRICE_SOURCES.gold.url,2_000_000,fetchImpl)).toString('utf8');
  const url=html.match(/https:\/\/thedocs\.worldbank\.org\/[^"<>\s]+\/CMO-Historical-Data-Monthly\.xlsx/)?.[0];
  if(!url)throw new Error('Official monthly workbook link missing');
  return {...parsePinkSheet(await boundedDownload(url,4_000_000,fetchImpl),{now}),url};
}

export function normalizeAlternative(payload,{now=new Date()}={}) {
  // The public endpoint can return its full listings with limit=0. Bound the
  // response for memory safety, while allowing the provider's catalogue to grow
  // well beyond the old 20-symbol display sample.
  if(payload?.metadata?.error||!Array.isArray(payload?.data)||!payload.data.length||payload.data.length>5000)throw new Error('Invalid Alternative.me payload');
  if(Number.isInteger(payload?.metadata?.num_cryptocurrencies)&&payload.metadata.num_cryptocurrencies<payload.data.length)throw new Error('Alternative.me listing count mismatch');
  const ids=new Set();const data=[];
  let staleCount=0;
  for(const coin of payload.data){const q=coin.quotes?.USD;const id=String(coin.id);const observedAt=new Date(coin.last_updated*1000);
    if(!/^\d+$/.test(id)||ids.has(id)||!Number.isFinite(observedAt.getTime())||observedAt>new Date(now.getTime()+60000))throw new Error('Duplicate, future or invalid asset observation');
    if(now-observedAt>86400000){staleCount++;ids.add(id);continue;}
    if(!/^[A-Z0-9]{1,16}$/.test(coin.symbol)||!coin.name||!Number.isInteger(coin.rank)||coin.rank<1)throw new Error('Invalid crypto identity');
    if((id==='1'&&(coin.symbol!=='BTC'||coin.website_slug!=='bitcoin'))||(id==='1027'&&(coin.symbol!=='ETH'||coin.website_slug!=='ethereum')))throw new Error('Known asset identity mismatch');
    const price=priceDecimal(q?.price,{positive:true});const change=q?.percentage_change_24h??q?.percent_change_24h;
    const optional=v=>v==null?null:priceDecimal(v,{precision:38});
    const volume=optional(q.volume_24h),marketCap=optional(q.market_cap);if(Number(volume)<0||Number(marketCap)<0)throw new Error('Negative crypto market metric');
    data.push({id,symbol:coin.symbol,name:coin.name,rank:coin.rank,price,volume,marketCap,change:change==null?null:priceDecimal(change,{precision:20}),observedAt:observedAt.toISOString()});ids.add(id);
  }
  if(!data.some(c=>c.id==='1')||!data.some(c=>c.id==='1027'))throw new Error('BTC or ETH missing');
  Object.defineProperty(data, 'staleCount', { value: staleCount, enumerable: false });
  return data;
}

export async function fetchAlternative(options={}) {
  const url='https://api.alternative.me/v2/ticker/?limit=0&structure=array';
  const bytes=await boundedDownload(url,4_000_000,options.fetchImpl??fetch);
  const payload=JSON.parse(bytes.toString('utf8'));
  const data=normalizeAlternative(payload,options);
  return {data,sourceCount:payload.data.length,excludedStaleCount:data.staleCount??0,url,checksum:createHash('sha256').update(bytes).digest('hex')};
}
