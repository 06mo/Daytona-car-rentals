/** Explicit synthetic check for the approved hosted DEV project. No admin fixture/DDL. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { closeDatabase, query, transaction } from '../lib/pilot/database';
import * as store from '../lib/pilot/store';
import { PilotError } from '../lib/pilot/errors';

async function main() {
  const url=new URL(process.env.DCR_DATABASE_URL||'');
  assert.equal(url.hostname,'aws-0-us-east-1.pooler.supabase.com');
  assert.equal(url.username,'dcr_runtime.moxcovrhondqpjykslkh');
  assert.equal(url.port,'6543');assert.equal(url.pathname,'/postgres');
  assert.equal(process.env.DCR_DEMO_MODE,'true');
  assert.ok(process.env.DCR_DATABASE_CA);assert.notEqual(process.env.DCR_DATABASE_SSL,'disable');
  const runId=randomUUID(), quotes:string[]=[], requests:string[]=[];
  const evidence:Record<string,unknown>={runId,checkedAt:new Date().toISOString(),target:'approved hosted development project',syntheticOnly:true};
  try {
    evidence.identity=await transaction(async()=>{
      const env=(await query("SELECT data FROM dcr_private.config WHERE id='environment'")).rows[0].data;
      assert.equal(env,'demo');
      const role=(await query("SELECT current_user,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls,has_schema_privilege(current_user,'dcr_private','USAGE') AS usage,has_schema_privilege(current_user,'dcr_private','CREATE') AS create FROM pg_roles WHERE rolname=current_user")).rows[0];
      assert.equal(role.current_user,'dcr_runtime');
      for(const field of ['rolsuper','rolcreaterole','rolcreatedb','rolbypassrls','create'])assert.equal(role[field],false);
      assert.equal(role.usage,true);
      const tls=(await query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0];
      // pg_stat_ssl describes pooler-to-server TLS, not the independently verified client TLS.
      return {environment:env,role,poolerBackendTLS:tls?.ssl??'not exposed'};
    });
    const s=await store.settings();assert.equal(s.requestsEnabled,false,'Do not run checks against an enabled ledger');
    // Check permissions without attempting destructive operations or requiring owner credentials.
    for(const table of ['config','quotes','reservations','blocks','sessions','attempts','audit']) {
      const p=(await query("SELECT has_table_privilege(current_user,$1,'TRUNCATE') AS truncate",['dcr_private.'+table])).rows[0];
      assert.equal(p.truncate,false);
    }
    await assert.rejects(query("DELETE FROM dcr_private.config WHERE id='hosted-nonexistent-probe'"),/permission denied/);
    await assert.rejects(query("UPDATE dcr_private.config SET data=data WHERE id='environment'"),/immutable/);
    for(const role of ['anon','authenticated','service_role']) {
      const access=(await query("SELECT has_schema_privilege($1,'dcr_private','USAGE') AS usage,has_table_privilege($1,'dcr_private.reservations','SELECT') AS read",[role])).rows[0];
      assert.equal(access.usage,false);assert.equal(access.read,false);
    }
    evidence.permissions='PASS';
    // Use a distant synthetic date and stop if already occupied; never modify other records.
    const offset=parseInt(runId.slice(0,4),16)%250;
    const start=new Date(Date.UTC(2039,0,1+offset)).toISOString().slice(0,10)+'T10:00';
    const end=new Date(Date.UTC(2039,0,4+offset)).toISOString().slice(0,10)+'T10:00';
    const trip={vehicleId:'corolla-3275798',start,end,location:'local'};
    const first=await store.quote(trip);quotes.push(first.id);
    const second=await store.quote(trip);quotes.push(second.id);
    const payload=(quoteId:string,key:string)=>({quoteId,idempotencyKey:key,name:'Synthetic hosted check',email:'hosted-check@example.invalid',phone:'0000000000',acknowledged:true,website:''});
    const key=randomUUID();
    const race=await Promise.allSettled([store.createRequest(payload(first.id,key)),store.createRequest(payload(second.id,randomUUID()))]);
    for(const result of race)if(result.status==='fulfilled')requests.push(result.value.id);
    assert.equal(requests.length,1,'Exactly one overlapping request may be allocated');
    const rejected=race.find(r=>r.status==='rejected') as PromiseRejectedResult;
    assert.ok(rejected.reason instanceof PilotError && rejected.reason.status===409);
    const accepted=(race.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof store.createRequest>>>).value;
    // Recover the generated request key without reading unrelated customer records.
    const acceptedKey=(await query('SELECT request_key FROM dcr_private.reservations WHERE id=$1',[accepted.id])).rows[0].request_key;
    const replay=await Promise.all([store.createRequest(payload(accepted.quote.id,acceptedKey)),store.createRequest(payload(accepted.quote.id,acceptedKey))]);
    assert.ok(replay.every(r=>r.id===accepted.id));
    await assert.rejects(store.createRequest(payload(randomUUID(),acceptedKey)),/already been used/);
    await closeDatabase();
    const saved=(await query('SELECT data FROM dcr_private.reservations WHERE id=$1',[accepted.id])).rows[0].data;
    assert.deepEqual(saved,accepted);assert.equal(saved.status,'pending');assert.equal(saved.demo,true);
    const savedQuote=(await query('SELECT data FROM dcr_private.quotes WHERE id=$1',[accepted.quote.id])).rows[0].data;
    assert.deepEqual(saved.quote,savedQuote);
    evidence.quoteRequestPersistence='PASS after closing/reopening the application pool';
    evidence.idempotency='PASS concurrent replay and mismatched key payload rejection';
    evidence.overlappingRequests='PASS one pending request, one conflict';
    evidence.syntheticRequestIds=requests;
  } finally {
    // Release only this check's synthetic holds, retaining an auditable cancelled record.
    for(const id of requests) {
      const row=(await query('SELECT data FROM dcr_private.reservations WHERE id=$1',[id])).rows[0]?.data;
      if(row?.demo && row.status==='pending')await store.adminAction({action:'status',id,revision:row.revision,status:'cancelled'});
    }
    evidence.syntheticHoldsReleased=true;
    await closeDatabase();
    await writeFile('/projects/daytona-handoff/hosted-development/results.json',JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
  }
  console.log('Hosted development checks passed; synthetic request holds cancelled. Evidence saved.');
}
main().catch(error=>{
  // Avoid driver objects/URLs: they may contain connection details.
  let message=error instanceof Error?error.message:'Unknown error';
  if(process.env.DCR_DATABASE_URL) {
    const url=new URL(process.env.DCR_DATABASE_URL);
    for(const secret of [url.toString(),url.password,decodeURIComponent(url.password)])
      if(secret)message=message.split(secret).join('[redacted]');
  }
  console.error('Hosted development checks failed:',message);
  process.exitCode=1;
});
