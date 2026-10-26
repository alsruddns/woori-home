import pg from 'pg';
import {parseProductionApprovalArgs} from '../db/production-operation.mjs';
import {validateFinancialProductionContext,safeDatabaseErrorCode} from '../db/financial-production-safety.mjs';
import {fetchPinkSheet,fetchAlternative,OPEN_PRICE_SOURCES} from '../../src/lib/data-platform/open-price-sources.mjs';
import {registerOpenPriceCatalog,persistOpenPrices} from '../../src/lib/data-platform/open-price-persistence.mjs';
let pool,catalog;
try{
 const options=parseProductionApprovalArgs(process.argv.slice(2),{requireBackup:true});
 validateFinancialProductionContext({requireBackup:options.apply,backupReference:options.backupReference});
 pool=new pg.Pool({connectionString:process.env.DB_IMPORT_URL,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=30000 -c timezone=UTC'});
 const client=await pool.connect();
 try {
  const {rows:[role]}=await client.query(`select current_user as name,(select rolsuper from pg_roles where rolname=current_user) as superuser,
    has_table_privilege(current_user,'financial_daily_prices','DELETE') as can_delete,has_schema_privilege(current_user,'public','CREATE') as can_create`);
  if(role.name!=='woori_portal_import'||role.superuser||role.can_delete||role.can_create)throw new Error('Restricted import role required');
  const protectedSql=`select (select count(*)::int from indicator_observations) as world_bank,
    (select count(*)::int from financial_company_facts) as sec,
    (select count(*)::int from financial_assets where source_id='coinranking-aggregate') as coinranking_assets,
    (select count(*)::int from financial_daily_prices where source_id='coinranking-aggregate') as coinranking_prices`;
  const before=(await client.query(protectedSql)).rows[0];
  // Fetch and validate both official payloads before any catalog or price write.
  const gold=await fetchPinkSheet();const crypto=await fetchAlternative();
  console.log(JSON.stringify({mode:options.apply?'apply':'dry-run',gold:{count:gold.prices.length,latest:gold.prices.at(-1),sha256:gold.checksum},crypto:{count:crypto.data.length,representatives:crypto.data.filter(c=>['BTC','ETH','XRP'].includes(c.symbol)).map(c=>({id:c.id,symbol:c.symbol,price:c.price,observedAt:c.observedAt})),sha256:crypto.checksum}}));
  if(options.apply){
    catalog=new pg.Pool({connectionString:process.env.DB_MIGRATION_URL,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=30000'});
    const owner=await catalog.connect();try{
      const {rows:[identity]}=await owner.query('select current_user as name');if(identity.name!=='woori_portal_migration')throw new Error('Catalog owner identity mismatch');
      await owner.query('begin');try{await registerOpenPriceCatalog(owner);await owner.query('commit');}catch(e){await owner.query('rollback');throw e;}
    }finally{owner.release();}
    console.log(JSON.stringify(await persistOpenPrices(client,'gold',gold)));
    console.log(JSON.stringify(await persistOpenPrices(client,'crypto',crypto)));
    // Real replay proves no duplicate key or redundant price mutation within this protected operation.
    const replayGold=await persistOpenPrices(client,'gold',gold);const replayCrypto=await persistOpenPrices(client,'crypto',crypto);
    if(replayGold.inserted||replayGold.updated||replayCrypto.inserted||replayCrypto.updated)throw new Error('Snapshot replay was not idempotent');
    console.log(JSON.stringify({idempotentReplay:{gold:replayGold,crypto:replayCrypto}}));
  }
  const after=(await client.query(protectedSql)).rows[0];if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Protected existing data counts changed');
  const {rows}=await client.query(`select a.source_id,count(distinct a.id)::int as assets,count(p.asset_id)::int as observations,
    min(p.reference_date) as first_date,max(p.reference_date) as latest_date from financial_assets a
    left join financial_daily_prices p on p.asset_id=a.id and p.source_id=a.source_id where a.source_id=any($1::text[])
    group by a.source_id`,[Object.values(OPEN_PRICE_SOURCES).map(s=>s.id)]);
  console.log(JSON.stringify({protectedBefore:before,protectedAfter:after,stored:rows}));
 }finally{client.release();}
}catch(error){console.error(JSON.stringify({error:'open-price-operation-failed',code:safeDatabaseErrorCode(error),reason:error instanceof Error&&!error.code?error.message:'Database details withheld'}));process.exitCode=1;}
finally{await pool?.end();await catalog?.end();}
