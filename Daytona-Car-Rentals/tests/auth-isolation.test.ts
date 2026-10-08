import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {authClient} from '../lib/customer/auth';
import {authFixture} from './auth-fixture';

test('hosted flags reject fixtures, test mode and unsafe URL/TLS configuration',()=>{
 const saved={...process.env};
 try{
  for(const flags of [{VERCEL:'1'},{VERCEL_ENV:'preview'},{VERCEL_ENV:'production'}]){
   for(const config of [
    {DCR_SUPABASE_AUTH_URL:'https://portal-fixture.supabase.co:4447',DCR_SUPABASE_PROJECT_REF:'portal-fixture'},
    {NODE_ENV:'test' as const,DCR_SUPABASE_AUTH_URL:'http://127.0.0.1:4447'},
    {NODE_TLS_REJECT_UNAUTHORIZED:'0'},
    {DCR_SUPABASE_AUTH_URL:'https://abcdefghijklmnopqrst.supabase.co:4447'},
    {DCR_SUPABASE_AUTH_URL:'https://user:pass@abcdefghijklmnopqrst.supabase.co'},
   ]){
    process.env={...saved,NODE_ENV:'production',DCR_SUPABASE_AUTH_URL:'https://abcdefghijklmnopqrst.supabase.co',DCR_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',DCR_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',...flags,...config};
    assert.throws(()=>authClient(),/forbidden/);
   }
   process.env={...saved,NODE_ENV:'production',DCR_SUPABASE_AUTH_URL:'https://abcdefghijklmnopqrst.supabase.co',DCR_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',DCR_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',...flags};
   assert.doesNotThrow(()=>authClient()); // Configuration only; never contacts this URL.
  }
 }finally{process.env=saved;}
});
test('diagnostic DNS/CA fixture cannot authenticate with hosted flags',async()=>{
 const fixture=await authFixture();
 try{for(const mode of ['preview','production']){
  const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'production',VERCEL:'1',VERCEL_ENV:mode,NODE_EXTRA_CA_CERTS:fixture.cert,DCR_SUPABASE_AUTH_URL:'https://portal-fixture.supabase.co:4447',DCR_SUPABASE_PROJECT_REF:'portal-fixture',DCR_SUPABASE_PUBLISHABLE_KEY:'synthetic-only'};
  const hook=spawnSync(process.execPath,['-e','process.exit(0)'],{env:{...env,NODE_OPTIONS:'--require '+process.cwd()+'/tests/browser/dns-fixture.cjs'},encoding:'utf8'});
  assert.notEqual(hook.status,0);assert.match(hook.stderr,/cannot run in hosted/);
  const client=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','-e',"import('./lib/customer/auth.ts').then(m=>{try{(m.authClient||m.default.authClient)();process.exit(1)}catch(e){if(!e.message.includes('forbidden'))process.exit(2)}})"],{env,encoding:'utf8'});assert.equal(client.status,0,client.stderr);
  const start=spawnSync(process.execPath,['--import','tsx','-e',"import('./tests/auth-fixture.ts').then(m=>(m.authFixture||m.default.authFixture)()).then(()=>process.exit(1)).catch(e=>{if(!e.message.includes('cannot run in hosted'))process.exit(2)})"],{env,encoding:'utf8'});assert.equal(start.status,0,start.stderr);
 }}finally{await fixture.close();}
});
test('Preview application sender rejects the owner mailbox and aliases with the approved list configured',async()=>{
 const {sendLink}=await import('../lib/customer/auth');const saved={...process.env};
 try{
  process.env={...saved,NODE_ENV:'production',DCR_DEMO_MODE:'true',DCR_SITE_ORIGIN:'https://synthetic-preview.vercel.app',DCR_AUTH_TEST_EMAILS:'msooijir@gmail.com',DCR_SUPABASE_AUTH_URL:'https://abcdefghijklmnopqrst.supabase.co',DCR_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',DCR_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'};
  for(const email of ['tmdallianceltd@gmail.com','msooijir+preview@gmail.com','other@example.invalid'])await assert.rejects(sendLink({email}),/approved test recipients/);
 }finally{process.env=saved;}
});
