import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { connectionOptions, migrate, initialize } from "../scripts/database-setup";

/** Only creates disposable loopback databases. Never connects to a hosted database. */
export async function createTestDatabase(demo = true) {
  if(!process.env.DCR_TEST_ADMIN_URL || !process.env.DCR_TEST_RUNTIME_PASSWORD)
    throw new Error('Postgres integration tests require DCR_TEST_ADMIN_URL (loopback administrator) and DCR_TEST_RUNTIME_PASSWORD for the local dcr_runtime role.');
  const adminURL=new URL(process.env.DCR_TEST_ADMIN_URL);
  if(!['localhost','127.0.0.1','[::1]'].includes(adminURL.hostname)) throw new Error('Integration fixture refuses non-loopback databases.');
  const name='dcr_test_'+randomUUID().replaceAll('-','');
  const admin=new Client(connectionOptions(adminURL.toString())); await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  adminURL.pathname='/'+name;
  const owner=new Client(connectionOptions(adminURL.toString()));await owner.connect();
  try {await migrate(owner);await initialize(owner,demo);await owner.query('GRANT dcr_app TO dcr_runtime');}
  catch(e) {await owner.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();throw e;}
  const runtimeURL=new URL(adminURL);runtimeURL.username='dcr_runtime';runtimeURL.password=process.env.DCR_TEST_RUNTIME_PASSWORD;
  return {owner,url:runtimeURL.toString(),name,async cleanup(){await owner.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}};
}
