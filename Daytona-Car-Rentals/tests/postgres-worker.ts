import * as store from "../lib/pilot/store";
import { closeDatabase, query } from "../lib/pilot/database";
async function main() {
  let input='';for await(const part of process.stdin) input+=part;
  const {action,payload}=JSON.parse(input);
  try {
    const value=action==='request'?await store.createRequest(payload):action==='admin'?await store.adminAction(payload):action==='quote'?await store.quote(payload):action==='session'? (await query('SELECT expires FROM dcr_private.sessions WHERE hash=$1',[payload])).rows:await store.adminState();
    console.log(JSON.stringify({ok:true,value}));
  } catch(e) {console.log(JSON.stringify({ok:false,error:e instanceof Error?e.message:'Unknown error'}));}
  finally {await closeDatabase();}
}
main();
