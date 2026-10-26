import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {readFile} from 'node:fs/promises';
import {parsePinkSheet,normalizeAlternative,OPEN_PRICE_SOURCES,openSourceRights} from '../src/lib/data-platform/open-price-sources.mjs';
import {evaluatePriceOperation} from '../src/lib/data-platform/financial-price-policy.mjs';

function workbook({unit='($/troy oz)',duplicate=false}={}){
 const strings=['Gold',unit,'Updated on October 02, 2026',...Array.from({length:12},(_,i)=>`2025M${String(i+1).padStart(2,'0')}`)];
 const rows=[`<row><c r="B1" t="s"><v>0</v></c></row>`,`<row><c r="B2" t="s"><v>1</v></c></row>`,...strings.slice(3).map((s,i)=>`<row><c r="A${i+3}" t="s"><v>${i+3}</v></c><c r="B${i+3}"><v>2000.01000000001</v></c></row>`)];if(duplicate)rows.push(rows[2]);
 return zipSync({'xl/workbook.xml':strToU8('<workbook><sheets><sheet name="Monthly Prices" r:id="rId1"/></sheets></workbook>'),
 'xl/_rels/workbook.xml.rels':strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet2.xml"/></Relationships>'),
 'xl/sharedStrings.xml':strToU8('<sst>'+strings.map(s=>`<si><t>${s}</t></si>`).join('')+'</sst>'),
 'xl/worksheets/sheet2.xml':strToU8('<worksheet><sheetData>'+rows.join('')+'</sheetData></worksheet>')});
}
test('Pink Sheet locates the named worksheet, preserves month boundaries and explicitly normalizes USD cents',()=>{
 const r=parsePinkSheet(workbook(),{now:new Date('2026-10-27T00:00:00Z')});assert.equal(r.prices.length,12);
 assert.equal(r.prices[0].referenceDate,'2025-01-31');assert.equal(r.prices[0].price,'2000.01');assert.equal(r.publishedAt,'2026-10-02T00:00:00.000Z');assert.equal(r.checksum.length,64);
 assert.throws(()=>parsePinkSheet(workbook({unit:'KRW/g'})),/unit/);assert.throws(()=>parsePinkSheet(workbook({duplicate:true})),/Duplicate/);
 assert.throws(()=>parsePinkSheet(workbook(),{now:new Date('2025-05-01')}),/publication/);
});
function crypto(){return {metadata:{error:null},data:[['1','BTC','bitcoin'],['1027','ETH','ethereum']].map(([id,symbol,website_slug])=>({id,symbol,website_slug,name:website_slug,rank:1,last_updated:1793050738,quotes:{USD:{price:123.45,volume_24h:12,market_cap:300,percentage_change_24h:-1}}}))};}
test('Alternative adapter checks IDs, USD metrics, freshness, positive prices and missing leading assets',()=>{
 const now=new Date('2026-10-26T22:00:00Z');assert.equal(normalizeAlternative(crypto(),{now})[0].price,'123.45');
 let p=crypto();p.data[0].symbol='BAD';assert.throws(()=>normalizeAlternative(p,{now}),/identity/);
 p=crypto();p.data[0].quotes.USD.price=-1;assert.throws(()=>normalizeAlternative(p,{now}),/positive/);
 p=crypto();p.data.pop();assert.throws(()=>normalizeAlternative(p,{now}),/missing/);
 assert.throws(()=>normalizeAlternative(crypto(),{now:new Date('2026-10-29')}),/stale/);
});
test('reviewed open sources carry dated evidence without changing Coinranking or GoldAPI permissions',()=>{
 for(const source of Object.values(OPEN_PRICE_SOURCES)){const s={license_status:'verified',collection_enabled:true,reviewed_at:'2026-10-26T21:00:00Z',review_due_at:'2027-04-26',terms_version:source.terms,attribution:source.attribution,source_url:source.url,financial_rights:openSourceRights(source)};
 assert.equal(evaluatePriceOperation(s,'visualize',new Date('2026-10-27')).allowed,true);s.financial_rights.publicDisplay='pending';assert.equal(evaluatePriceOperation(s,'visualize',new Date('2026-10-27')).allowed,false);}
});
test('open price production import keeps backup, role, replay and protected data checks',async()=>{
 const script=await readFile(new URL('../scripts/data/open-prices-production.mjs',import.meta.url),'utf8');
 for(const check of ['validateFinancialProductionContext','requireBackup:true','woori_portal_import','woori_portal_migration','protectedBefore','idempotentReplay'])assert.ok(script.includes(check));
 const workflow=await readFile(new URL('../.github/workflows/publish.yml',import.meta.url),'utf8');assert.ok(workflow.includes('"$IMPORT_OPEN_PRICES" = "true" ] && database_write_requested=true'));
 assert.ok(workflow.includes('stage="Persist reviewed monthly Gold and crypto observations"'));
 assert.ok(workflow.includes('Select one operation per protected run'));
});
