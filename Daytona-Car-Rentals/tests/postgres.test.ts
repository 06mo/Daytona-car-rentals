import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Client } from "pg";
import { createTestDatabase } from "./postgres-fixture";
import { connectionOptions, migrate, initialize } from "../scripts/database-setup";
import * as store from "../lib/pilot/store";
import { closeDatabase, query, transaction } from "../lib/pilot/database";
import { checks, type Reservation } from "../lib/pilot/model";
let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
before(async()=>{fixture=await createTestDatabase();process.env.DCR_DEMO_MODE='true';process.env.DCR_DATABASE_URL=fixture.url;});
after(async()=>{await closeDatabase();await fixture?.cleanup();});
const trip=(month:string)=>({vehicleId:'corolla-3275798',start:`2036-${month}-01T10:00`,end:`2036-${month}-04T10:00`,location:'local'});
const payload=(quoteId:string,key=randomUUID())=>({quoteId,idempotencyKey:key,name:'Synthetic Renter',email:'test@example.invalid',phone:'0000000000',acknowledged:true,website:''});
type Result={ok:boolean;value?:any;error?:string};
function worker(action:string,payload:unknown): Promise<Result> {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--conditions=react-server','--import','tsx','tests/postgres-worker.ts'],{env:process.env,stdio:['pipe','pipe','pipe']});
    let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
    child.on('error',reject);child.on('exit',code=>{if(code) reject(new Error('Worker failed: '+err));else {try{resolve(JSON.parse(out));}catch(e){reject(e);}}});
    child.stdin.end(JSON.stringify({action,payload}));
  });
}
// Hold the real database lock until every independent process is waiting on it.
async function race(actions: {action:string;payload:unknown}[]) {
  await fixture.owner.query('BEGIN');await fixture.owner.query('SELECT pg_advisory_xact_lock(724018,1)');
  const pending=actions.map(a=>worker(a.action,a.payload));
  try {
    let waiting=0;
    for(let attempt=0;attempt<400;attempt++) {
      await fixture.owner.query("SELECT pg_stat_clear_snapshot()");
      waiting=Number((await fixture.owner.query("SELECT count(*) FROM pg_stat_activity WHERE datname=$1 AND wait_event='advisory'",[fixture.name])).rows[0].count);
      if(waiting>=actions.length) break;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.ok(waiting>=actions.length,'All independent Postgres transactions must contend concurrently');
  } finally {await fixture.owner.query('COMMIT');}
  return Promise.all(pending);
}
async function reviewed(month:string) {
  const q=await store.quote(trip(month));const r=await store.createRequest(payload(q.id));
  for(const check of checks) {
    const current=(await store.reservations()).find(x=>x.id===r.id)!;
    await store.adminAction({action:'review',id:r.id,revision:current.revision,check,checked:true,evidence:'Synthetic operator evidence'});
  }
  return (await store.reservations()).find(x=>x.id===r.id)!;
}
test('concurrent independent processes allocate exactly one overlapping request',async()=>{
  const quotes=await Promise.all(Array.from({length:4},()=>store.quote(trip('01'))));
  const result=await race(quotes.map(q=>({action:'request',payload:payload(q.id)})));
  assert.equal(result.filter(r=>r.ok).length,1);
  assert.ok(result.filter(r=>!r.ok).every(r=>/calendar block/.test(r.error!)));
});
test('concurrent same-key submissions return one durable ID; changed key payload is rejected',async()=>{
  const q=await store.quote(trip('02'));const p=payload(q.id);
  const result=await race(Array.from({length:4},()=>({action:'request',payload:p})));
  assert.ok(result.every(r=>r.ok));assert.equal(new Set(result.map(r=>r.value.id)).size,1);
  await assert.rejects(store.createRequest({...p,quoteId:randomUUID()}),/already been used/);
});
test('concurrent confirmations respect revisions and manual blocks serialize with confirmation',async()=>{
  const r=await reviewed('03');
  const confirm={action:'status',id:r.id,revision:r.revision,status:'confirmed'};
  const result=await race([{action:'admin',payload:confirm},{action:'admin',payload:confirm}]);
  assert.equal(result.filter(x=>x.ok).length,1);
  const second=await reviewed('04');
  const conflict=await race([
    {action:'admin',payload:{action:'status',id:second.id,revision:second.revision,status:'confirmed'}},
    {action:'admin',payload:{action:'block',trip:trip('04'),reason:'Synthetic maintenance block'}},
  ]);
  assert.equal(conflict.filter(x=>x.ok).length,1);
  const confirmed=(await store.reservations()).find(x=>x.id===second.id)!.status==='confirmed';
  assert.equal((await store.blocks()).some(b=>b.start===trip('04').start),!confirmed);
});
test('even pre-existing overlapping pending records cannot be concurrently confirmed',async()=>{
  const r=await reviewed('05');const other:Reservation={...r,id:randomUUID()};
  await fixture.owner.query('INSERT INTO dcr_private.reservations VALUES($1,$2,$3,$4)',[other.id,randomUUID(),'synthetic-legacy',other]);
  const result=await race([r,other].map(x=>({action:'admin',payload:{action:'status',id:x.id,revision:x.revision,status:'confirmed'}})));
  assert.ok(result.every(x=>!x.ok && /calendar block/.test(x.error!)));
});
test('transactions roll back writes and durable quotes, sessions and requests survive process restart',async()=>{
  await assert.rejects(transaction(async()=>{await query("INSERT INTO dcr_private.sessions VALUES('rollback-probe',1)");throw new Error('rollback');}),/rollback/);
  assert.equal((await query("SELECT * FROM dcr_private.sessions WHERE hash='rollback-probe'")).rowCount,0);
  const q=await store.quote(trip('06'));await closeDatabase();
  const result=await worker('request',payload(q.id));assert.equal(result.ok,true);
  const state=await worker('state',null);
  assert.deepEqual(state.value.reservations.find((r:Reservation)=>r.id===result.value.id).quote,q);
  await query("INSERT INTO dcr_private.sessions VALUES('synthetic-session',$1)",[Date.now()+60000]);
  await closeDatabase();assert.equal((await worker('session','synthetic-session')).value.length,1);
  const expired=await store.quote(trip('07'));expired.expiresAt=Date.now()-1;
  await fixture.owner.query('UPDATE dcr_private.quotes SET data=$1 WHERE id=$2',[expired,expired.id]);
  assert.match((await worker('request',payload(expired.id))).error!,/expired/);
});
test('anonymous/authenticated API roles and runtime DDL/environment mutations are denied',async()=>{
  for(const role of ['anon','authenticated','service_role']) {
    await fixture.owner.query('BEGIN');await fixture.owner.query(`SET LOCAL ROLE ${role}`);
    try {await assert.rejects(fixture.owner.query('SELECT * FROM dcr_private.reservations'),/permission denied/);}
    finally {await fixture.owner.query('ROLLBACK');}
  }
  const app=new Client(connectionOptions(fixture.url));await app.connect();
  try {
    await assert.rejects(app.query('CREATE TABLE dcr_private.forbidden(id int)'),/permission denied/);
    await assert.rejects(app.query('TRUNCATE dcr_private.reservations'),/permission denied/);
    await assert.rejects(app.query("UPDATE dcr_private.config SET data='\"live\"' WHERE id='environment'"),/immutable/);
    const roles=(await app.query('SELECT rolsuper,rolbypassrls,rolcreatedb FROM pg_roles WHERE rolname=current_user')).rows[0];
    assert.deepEqual(roles,{rolsuper:false,rolbypassrls:false,rolcreatedb:false});
  } finally {await app.end();}
});
test('migrations are repeatable; synthetic seed never overwrites settings or accepts a live DB',async()=>{
  const s=await store.settings();await store.adminAction({action:'settings',settings:{...s,bufferMinutes:180}});
  await migrate(fixture.owner);await initialize(fixture.owner,true);
  assert.equal((await store.settings()).bufferMinutes,180);
  await assert.rejects(initialize(fixture.owner,false),/separate database/);
});
test('missing config, environment mismatches and Vercel preview/live separation fail closed',async()=>{
  await closeDatabase();const url=process.env.DCR_DATABASE_URL;delete process.env.DCR_DATABASE_URL;
  await assert.rejects(store.publicState(),/Postgres is not configured/);process.env.DCR_DATABASE_URL=url;
  process.env.DCR_DEMO_MODE='false';await assert.rejects(store.publicState(),/separate database/);
  process.env.VERCEL_ENV='preview';await assert.rejects(store.publicState(),/Preview deployments require/);
  process.env.DCR_DEMO_MODE='true';process.env.VERCEL_ENV='production';await assert.rejects(store.publicState(),/Demo mode cannot/);
  delete process.env.VERCEL_ENV;
});

test('config deletes succeed for ordinary rows while identity updates and deletes fail explicitly', async()=>{
  await fixture.owner.query("INSERT INTO dcr_private.config VALUES ('delete-probe', '{}')");
  assert.equal((await fixture.owner.query("DELETE FROM dcr_private.config WHERE id='delete-probe'")).rowCount,1);
  await assert.rejects(fixture.owner.query("DELETE FROM dcr_private.config WHERE id='environment'"),/immutable/);
  await assert.rejects(fixture.owner.query("UPDATE dcr_private.config SET id='renamed' WHERE id='environment'"),/immutable/);
  await assert.rejects(fixture.owner.query("UPDATE dcr_private.config SET data='\"live\"' WHERE id='environment'"),/immutable/);
  assert.equal((await fixture.owner.query("SELECT data FROM dcr_private.config WHERE id='environment'")).rows[0].data,'demo');
  await assert.rejects(query("DELETE FROM dcr_private.config WHERE id='settings'"),/permission denied/);
});

test('attached pool keeps one checked-out connection through nested work and idle timeout, then rolls back', async()=>{
  await assert.rejects(transaction(async()=>{
    const first=(await query('SELECT pg_backend_pid() AS pid, txid_current()::text AS tx')).rows[0];
    await query("INSERT INTO dcr_private.sessions VALUES('lifecycle-rollback',1)");
    // Longer than the pool's idle timeout: a checked-out connection is not idle.
    await new Promise(resolve=>setTimeout(resolve,5200));
    const nested=await transaction(async()=>(await query('SELECT pg_backend_pid() AS pid, txid_current()::text AS tx')).rows[0]);
    assert.deepEqual(nested,first);
    throw new Error('lifecycle rollback');
  }),/lifecycle rollback/);
  assert.equal((await query("SELECT * FROM dcr_private.sessions WHERE hash='lifecycle-rollback'")).rowCount,0);
  // Subsequent acquisition still works after rollback/release.
  assert.equal((await query('SELECT 1 AS healthy')).rows[0].healthy,1);
});
