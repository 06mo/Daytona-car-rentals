import { spawn } from "node:child_process";
import { createTestDatabase } from "../tests/postgres-fixture";
async function main() {
  const fixture=await createTestDatabase(true);
  const {DCR_TEST_ADMIN_URL: _owner, DCR_TEST_RUNTIME_PASSWORD: _password, ...runtimeEnv}=process.env;
  const child=spawn('npm',['run',process.env.DCR_E2E_PRODUCTION==='true'?'start':'dev','--','--hostname','127.0.0.1'],{stdio:'inherit',env:{...runtimeEnv,DCR_DATABASE_URL:fixture.url,DCR_DEMO_MODE:'true'}});
  let stopping=false;
  const stop=()=>{if(!stopping){stopping=true;child.kill('SIGTERM');}};
  process.on('SIGTERM',stop);process.on('SIGINT',stop);
  child.on('exit',async code=>{await fixture.cleanup();process.exit(code??0);});
}
main().catch(()=>{console.error('Unable to initialize isolated Postgres E2E database. Check DCR_TEST_ADMIN_URL and DCR_TEST_RUNTIME_PASSWORD.');process.exit(1);});
