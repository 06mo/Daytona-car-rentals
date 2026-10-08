import { Client, type ClientConfig } from "pg";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { vehicles } from "../lib/data/vehicles";
import { isDirectRental } from "../lib/data/rentalChannels";

export function connectionOptions(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  for (const key of ["ssl","sslmode","sslcert","sslkey","sslrootcert"]) url.searchParams.delete(key);
  const local = ["127.0.0.1","localhost","[::1]"].includes(url.hostname);
  if (process.env.DCR_DATABASE_SSL === "disable" && !local) throw new Error("TLS may only be disabled on loopback.");
  return { connectionString:url.toString(), ssl:local && process.env.DCR_DATABASE_SSL === "disable" ? false : {rejectUnauthorized:true,...(process.env.DCR_DATABASE_CA ? {ca:process.env.DCR_DATABASE_CA.replace(/\\n/g,"\n")} : {})} };
}
export async function migrate(client: Client) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(724018,1)");
    await client.query("CREATE SCHEMA IF NOT EXISTS dcr_private");
    await client.query("REVOKE ALL ON SCHEMA dcr_private FROM PUBLIC");
    await client.query("CREATE TABLE IF NOT EXISTS dcr_private.schema_migrations(version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()) {
      const sql=await readFile(new URL('../migrations/'+name,import.meta.url),'utf8');
      const checksum=createHash('sha256').update(sql).digest('hex');
      const previous=(await client.query('SELECT checksum FROM dcr_private.schema_migrations WHERE version=$1',[name])).rows[0];
      if (previous) { if(previous.checksum!==checksum) throw new Error('Applied migration checksum changed: '+name); continue; }
      await client.query(sql);
      await client.query('INSERT INTO dcr_private.schema_migrations(version,checksum) VALUES($1,$2)',[name,checksum]);
    }
    await client.query('COMMIT');
  } catch(e) { await client.query('ROLLBACK');throw e; }
}
export async function initialize(client: Client, demo: boolean) {
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(724018,1)');
    const env=(await client.query("SELECT data FROM dcr_private.config WHERE id='environment'")).rows[0];
    if(env && env.data!==(demo?'demo':'live')) throw new Error('Use a separate database for live rentals and preview data.');
    const insert=async(id:string,data:unknown)=>client.query('INSERT INTO dcr_private.config VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[id,JSON.stringify(data)]);
    await insert('environment',demo?'demo':'live');
    await insert('settings',{taxBps:demo?650:0,surchargeCents:200,deliveryCents:demo?3500:0,depositCents:demo?30000:0,bufferMinutes:120,policyApproved:false,agreementApproved:false,taxApproved:false,airportApproved:false,requestsEnabled:false,policyReference:'',agreementVersion:'',mileage:demo?'150 miles per rental day (example)':'',minimumAge:demo?25:0,revision:1});
    for(const v of vehicles) await insert('rate:'+v.id,{vehicleId:v.id,dailyCents:demo?(v.category==='van'?9500:v.category==='truck'?8500:v.category==='suv'?7000:5500):0,enabled:demo&&isDirectRental(v.id),revision:1});
    await client.query('COMMIT');
  } catch(e) {await client.query('ROLLBACK');throw e;}
}
