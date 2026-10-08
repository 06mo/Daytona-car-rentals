import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./postgres-fixture";
import { query, closeDatabase } from "../lib/pilot/database";
import { dispatchNotifications } from "../lib/customer/notifications";
process.env.DCR_DEMO_MODE = "false";
process.env.DCR_EMAIL_MODE = "resend";
process.env.DCR_EMAIL_API_KEY = "synthetic-key";
process.env.DCR_EMAIL_FROM = "test@example.invalid";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const original = global.fetch;
before(async () => {
  db = await createTestDatabase(false);
  process.env.DCR_DATABASE_URL = db.url;
});
after(async () => {
  global.fetch = original;
  await closeDatabase();
  await db.cleanup();
});
async function add() {
  const id = randomUUID();
  await query(
    "INSERT INTO dcr_private.outbox(id,event_key,recipient,payload,created_at) VALUES($1,$5,$2,$3,$4)",
    [
      id,
      "synthetic@example.invalid",
      { subject: "Synthetic test", text: "No customer data" },
      Date.now(),
      id,
    ],
  );
  return id;
}
test("network failure retries with same key and payload, then stops after acknowledged send", async () => {
  const id = await add(),
    calls: { key: string; body: unknown }[] = [];
  let fail = true;
  global.fetch = async (_url, options) => {
    calls.push({
      key: (options?.headers as Record<string, string>)["Idempotency-Key"],
      body: options?.body,
    });
    if (fail) throw Error("Synthetic network failure");
    return new Response("{}", { status: 200 });
  };
  await dispatchNotifications();
  let row = (await query("SELECT * FROM dcr_private.outbox WHERE id=$1", [id]))
    .rows[0];
  assert.equal(row.state, "retry");
  assert.equal(row.attempts, 1);
  fail = false;
  await query("UPDATE dcr_private.outbox SET next_at=0 WHERE id=$1", [id]);
  await dispatchNotifications();
  await dispatchNotifications();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  row = (await query("SELECT * FROM dcr_private.outbox WHERE id=$1", [id]))
    .rows[0];
  assert.equal(row.state, "sent");
});
test("uncertain delivery outside provider dedupe window is blocked, even after transaction rollback", async () => {
  const id = await add();
  await query("UPDATE dcr_private.outbox SET created_at=$2 WHERE id=$1", [
    id,
    Date.now() - 24 * 3600000,
  ]);
  global.fetch = async () => {
    throw Error("Must never send outside window");
  };
  await dispatchNotifications();
  assert.equal(
    (await query("SELECT state FROM dcr_private.outbox WHERE id=$1", [id]))
      .rows[0].state,
    "blocked",
  );
});

test('five slow deliveries do not block rental transactions or duplicate across workers', async () => {
  for(let i=0;i<5;i++) await add();
  let first!:()=>void; const started=new Promise<void>(r=>first=r);let calls=0;
  global.fetch=async()=>{if(++calls===1)first();await new Promise(r=>setTimeout(r,2500));return new Response('{}',{status:200});};
  const delivery=dispatchNotifications();await started;
  const {settings}=await import('../lib/pilot/store');const begin=Date.now();await settings();const elapsed=Date.now()-begin;assert(elapsed<1000,'rental transaction must not wait for provider');console.log('Slow five-message test: rental settings transaction completed in '+elapsed+' ms');
  const competing=await dispatchNotifications();assert.equal(competing.processed,0);
  await delivery;assert.equal(calls,5);
});
test('crashed claim is reclaimed after expiry with immutable sender and payload',async()=>{
  const {claimNotifications}=await import('../lib/customer/notifications');
  const id=await add();const claimed=await claimNotifications();assert.equal(claimed.rows.length,1);
  assert.equal((await dispatchNotifications()).processed,0);
  await db.owner.query('UPDATE dcr_private.outbox SET lease_until=0 WHERE id=$1',[id]);
  process.env.DCR_EMAIL_FROM='changed@example.invalid';let body:any;
  global.fetch=async(_url,options)=>{body=JSON.parse(String(options?.body));return new Response('{}',{status:200});};
  await dispatchNotifications();assert.equal(body.from,'test@example.invalid');
  assert.equal((await query('SELECT state FROM dcr_private.outbox WHERE id=$1',[id])).rows[0].state,'sent');
  process.env.DCR_EMAIL_FROM='test@example.invalid';
});
test('provider acceptance followed by acknowledgment crash retries the same deduplicated operation',async()=>{
  const id=await add();const accepted=new Map<string,string>();let calls=0;
  global.fetch=async(_url,options)=>{calls++;const key=(options!.headers as Record<string,string>)['Idempotency-Key'];const body=String(options!.body);if(accepted.has(key))assert.equal(accepted.get(key),body);else accepted.set(key,body);return new Response('{}',{status:200});};
  await db.owner.query(`CREATE FUNCTION dcr_private.test_ack_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='sent' THEN RAISE EXCEPTION 'synthetic acknowledgment crash'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER test_ack_failure BEFORE UPDATE ON dcr_private.outbox FOR EACH ROW EXECUTE FUNCTION dcr_private.test_ack_failure()`);
  await assert.rejects(dispatchNotifications(),/synthetic acknowledgment crash/);
  const before=(await query('SELECT state,claim_token FROM dcr_private.outbox WHERE id=$1',[id])).rows[0];assert.equal(before.state,'pending');assert(before.claim_token);
  await db.owner.query('DROP TRIGGER test_ack_failure ON dcr_private.outbox; DROP FUNCTION dcr_private.test_ack_failure()');
  await db.owner.query('UPDATE dcr_private.outbox SET lease_until=0 WHERE id=$1',[id]);
  await dispatchNotifications();assert.equal(calls,2);assert.equal(accepted.size,1);
});
test('a superseded worker cannot acknowledge the new claim',async()=>{
  const {claimNotifications}=await import('../lib/customer/notifications');const id=await add();let replacement:string;
  global.fetch=async()=>{await db.owner.query('UPDATE dcr_private.outbox SET lease_until=0 WHERE id=$1',[id]);const next=await claimNotifications();replacement=next.rows[0].claim_token;return new Response('{}',{status:200});};
  await dispatchNotifications();const row=(await query('SELECT state,claim_token FROM dcr_private.outbox WHERE id=$1',[id])).rows[0];assert.equal(row.state,'pending');assert.equal(row.claim_token,replacement!);
  await db.owner.query('UPDATE dcr_private.outbox SET lease_until=0 WHERE id=$1',[id]);global.fetch=async()=>new Response('{}',{status:200});await dispatchNotifications();
});
test('provider timeout leaves a durable retry, not a sent notification',async()=>{
 const id=await add();
 global.fetch=async(_url,options)=>new Promise((_resolve,reject)=>{
   options!.signal!.addEventListener('abort',()=>reject(new Error('synthetic timeout')),{once:true});
   setTimeout(()=>reject(new Error('timeout fallback')),3500).unref();
 });
 await dispatchNotifications();const row=(await query('SELECT state,claim_token,next_at FROM dcr_private.outbox WHERE id=$1',[id])).rows[0];assert.equal(row.state,'retry');assert.equal(row.claim_token,null);assert(Number(row.next_at)>Date.now());
});
