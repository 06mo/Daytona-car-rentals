import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {Webhook} from 'standardwebhooks';
import {previewAuthEmail} from '../supabase/functions/preview-auth-email/handler.ts';
const secret='whsec_'+randomBytes(32).toString('base64');
const config:Record<string,string>={
 SUPABASE_URL:'https://moxcovrhondqpjykslkh.supabase.co',DCR_AUTH_HOOK_ENV:'preview',DCR_AUTH_HOOK_ENABLED:'true',
 DCR_AUTH_TEST_EMAILS:'msooijir@gmail.com',DCR_AUTH_HOOK_ORIGIN:'https://synthetic-preview.vercel.app',
 DCR_AUTH_RESEND_KEY:'re_synthetic_not_a_real_key',DCR_AUTH_HOOK_SIGNING_SECRET:'v1,'+secret,
};
const payload={user:{id:randomUUID(),email:'msooijir@gmail.com'},email_data:{email_action_type:'magiclink',token_hash:'synthetic_hash_not_a_token',redirect_to:config.DCR_AUTH_HOOK_ORIGIN+'/auth/confirm?intent='+'a'.repeat(64)}};
function request(value:unknown=payload,offset=0,override:Record<string,string>={}){
 const raw=JSON.stringify(value),id=randomUUID(),at=new Date(Date.now()+offset);
 return new Request('https://synthetic.invalid/hook',{method:'POST',headers:{'content-type':'application/json','webhook-id':id,'webhook-timestamp':String(Math.floor(+at/1000)),'webhook-signature':new Webhook(secret).sign(id,at,raw),...override},body:raw});
}
function setup(overrides:Record<string,string|undefined>={}, provider?:typeof fetch){
 const calls:{body:any,key:string}[]=[];
 const handler=previewAuthEmail(k=>({...config,...overrides})[k],provider||(async(url,options)=>{
  assert.equal(url,'https://api.resend.com/emails');calls.push({body:JSON.parse(String(options?.body)),key:(options!.headers as Record<string,string>)['Idempotency-Key']});return Response.json({id:'synthetic-delivery'});
 }));return {handler,calls};
}
test('signed signup and magiclink send only approved mailbox with compatible intent callback',async()=>{
 const {handler,calls}=setup();
 for(const action of ['signup','magiclink'])assert.equal((await handler(request({...payload,email_data:{...payload.email_data,email_action_type:action}}))).status,200);
 assert.equal(calls.length,2);
 for(const call of calls){assert.deepEqual(call.body.to,['msooijir@gmail.com']);assert.equal(call.body.from,'Daytona Car Rentals <notifications@notify.daytonacarrentals.com>');assert.equal(call.body.reply_to,undefined);assert.equal(call.body.cc,undefined);assert.equal(call.body.bcc,undefined);assert(call.body.text.includes('/auth/confirm?intent='+'a'.repeat(64)+'&token_hash=synthetic_hash_not_a_token'));assert(!call.key.includes('synthetic_hash'));}
});
test('direct Auth hook requests still reject every other recipient and Gmail aliases',async()=>{
 const {handler,calls}=setup();for(const email of ['tmdallianceltd@gmail.com','other@example.invalid','msooijir+preview@gmail.com','m.sooijir@gmail.com'])assert.equal((await handler(request({...payload,user:{...payload.user,email}}))).status,403);
 assert.equal(calls.length,0);
});
test('missing, forged, expired, future and tampered signatures never call provider',async()=>{
 const {handler,calls}=setup();
 for(const req of [request(payload,0,{'webhook-signature':''}),request(payload,0,{'webhook-signature':'v1,invalid'}),request(payload,-600000),request(payload,600000),request({...payload,user:{...payload.user,email:'other@example.invalid'}},0,{'webhook-signature':new Webhook(secret).sign('wrong',new Date(),JSON.stringify(payload))})])assert.equal((await handler(req)).status,401);
 assert.equal(calls.length,0);
});
test('missing configuration, wrong project, disabled hook and widened allowlist fail closed',async()=>{
 for(const key of Object.keys(config)){const {handler,calls}=setup({[key]:''});assert.equal((await handler(request())).status,503);assert.equal(calls.length,0);}
 for(const override of [{SUPABASE_URL:'https://other.supabase.co'},{DCR_AUTH_HOOK_ENV:'production'},{DCR_AUTH_TEST_EMAILS:'msooijir@gmail.com,other@example.invalid'},{DCR_AUTH_HOOK_ORIGIN:'https://daytonacarrentals.com'},{DCR_AUTH_HOOK_ENABLED:'false'}]){const {handler,calls}=setup(override);assert.equal((await handler(request())).status,503);assert.equal(calls.length,0);}
});
test('reject unexpected action, redirect origin/path/query and malformed payload without delivery',async()=>{
 const {handler,calls}=setup();
 for(const action of ['recovery','email_change','invite'])assert.equal((await handler(request({...payload,email_data:{...payload.email_data,email_action_type:action}}))).status,400);
 for(const url of ['https://evil.invalid/auth/confirm',config.DCR_AUTH_HOOK_ORIGIN+'/',config.DCR_AUTH_HOOK_ORIGIN+'/auth/confirm?next=https://evil.invalid',config.DCR_AUTH_HOOK_ORIGIN+'/auth/confirm?intent=bad',config.DCR_AUTH_HOOK_ORIGIN+'/auth/confirm?intent='+'a'.repeat(64)+'&intent='+'b'.repeat(64)])assert.equal((await handler(request({...payload,email_data:{...payload.email_data,redirect_to:url}}))).status,400);
 assert.equal((await handler(request({}))).status,400);assert.equal(calls.length,0);
});
test('direct approved request without an app intent still has a secure My trips callback',async()=>{
 const {handler,calls}=setup();assert.equal((await handler(request({...payload,email_data:{...payload.email_data,redirect_to:config.DCR_AUTH_HOOK_ORIGIN+'/auth/confirm'}}))).status,200);assert(calls[0].body.text.includes('/auth/confirm?token_hash='));
});
test('retries use a stable provider key/body, provider errors return generic failure',async()=>{
 const {handler,calls}=setup();await handler(request());await handler(request());assert.deepEqual(calls[0],calls[1]);
 for(const provider of [async()=>new Response('sensitive provider error',{status:429}),async()=>new Response('sensitive provider error',{status:500}),async()=>{throw Error('sensitive link or secret');}]){const h=setup({},provider).handler;const response=await h(request());assert.equal(response.status,502);assert(! (await response.text()).includes('sensitive'));}
});
test('body size, method and content type are bounded',async()=>{
 const {handler,calls}=setup();assert.equal((await handler(new Request('https://synthetic.invalid'))).status,405);assert.equal((await handler(request(payload,0,{'content-type':'text/plain'}))).status,415);assert.equal((await handler(request({extra:'a'.repeat(33000)}))).status,413);assert.equal(calls.length,0);
});
test('provider timeout fails closed within the hook budget',async()=>{
 const {handler}=setup({},async(_url,options)=>new Promise((_resolve,reject)=>{
  const fallback=setTimeout(()=>reject(Error('synthetic fallback')),3500);
  options!.signal!.addEventListener('abort',()=>{clearTimeout(fallback);reject(Error('synthetic timeout'));},{once:true});
 }));
 const start=Date.now();assert.equal((await handler(request())).status,502);assert(Date.now()-start<3500);
});

test('documented 24–64 byte Supabase secrets preserve bytes and verify real HMACs',async()=>{
 for(let size=24;size<=64;size++){
  const bytes=Buffer.alloc(size,251),key='whsec_'+bytes.toString('base64');
  const {handler,calls}=setup({DCR_AUTH_HOOK_SIGNING_SECRET:'v1,'+key});
  const raw=JSON.stringify(payload),id=randomUUID(),at=new Date();
  const signature=new Webhook(key).sign(id,at,raw);
  const req=(body=raw,sig=signature,time=at)=>new Request('https://synthetic.invalid/hook',{method:'POST',headers:{'content-type':'application/json','webhook-id':id,'webhook-timestamp':String(Math.floor(+time/1000)),'webhook-signature':sig},body});
  assert.equal((await handler(req())).status,200);
  assert.equal((await handler(req(raw+' '))).status,401);
  assert.equal((await handler(req(raw,new Webhook('whsec_'+Buffer.alloc(size,252).toString('base64')).sign(id,at,raw)))).status,401);
  const stale=new Date(Date.now()-600000);
  assert.equal((await handler(req(raw,new Webhook(key).sign(id,stale,raw),stale))).status,401);
  assert.equal(calls.length,1);
 }
});
test('malformed secret encodings and unsupported versions fail before delivery',async()=>{
 const canonical=Buffer.alloc(32).toString('base64');
 const invalid=['','whsec_'+canonical,canonical,'v2,whsec_'+canonical,'v1a,whsec_'+canonical,
  'v1,whsec_', 'v1,whsec_'+Buffer.alloc(23).toString('base64'), 'v1,whsec_'+Buffer.alloc(65).toString('base64'),
  'v1,whsec_'+canonical.slice(0,-1),'v1,whsec_'+canonical+'=', 'v1,whsec_'+canonical+'\n',
  ' v1,whsec_'+canonical, 'v1,whsec_'+canonical.slice(0,-2)+'B=', 'v1,whsec_'+'-'.repeat(32),
  'v1,whsec_'+'_'.repeat(32),'v1,whsec_'+canonical+',v1,whsec_'+canonical];
 for(const value of invalid){const {handler,calls}=setup({DCR_AUTH_HOOK_SIGNING_SECRET:value});assert.equal((await handler(request())).status,503);assert.equal(calls.length,0);}
});
