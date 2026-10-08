import { Client } from "pg";
import { connectionOptions, migrate, initialize } from "./database-setup";
async function main() {
  const url=process.env.DCR_MIGRATION_DATABASE_URL;
  if(!url) throw new Error('Set DCR_MIGRATION_DATABASE_URL to an explicitly selected development or deployment database.');
  const action=process.argv[2];
  if(!['migrate','seed-demo','init-live'].includes(action)) throw new Error('Choose migrate, seed-demo or init-live.');
  if(action==='seed-demo' && process.env.DCR_DEMO_MODE!=='true') throw new Error('Synthetic seeding requires DCR_DEMO_MODE=true.');
  if(action==='init-live' && process.env.DCR_DEMO_MODE!=='false') throw new Error('Live initialization requires DCR_DEMO_MODE=false; rates stay zero and launch stays closed.');
  const client=new Client(connectionOptions(url));await client.connect();
  try {if(action==='migrate') await migrate(client);else await initialize(client,action==='seed-demo');console.log('Database '+action+' complete.');}
  finally {await client.end();}
}
main().catch(e=>{console.error(e instanceof Error && !('code' in e) ? e.message : 'Database setup failed; check the selected connection, migration privileges and database logs.');process.exitCode=1;});
