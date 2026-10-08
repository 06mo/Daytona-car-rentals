import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Fresh modules/processes because metadata reads configuration at module load.
function probe(vercelEnv: string, explicit = false) {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', VERCEL_ENV: vercelEnv };
  for (const key of ['DCR_DATABASE_URL', 'DCR_SITE_ORIGIN', 'NEXT_PUBLIC_APP_URL']) delete (env as NodeJS.ProcessEnv)[key];
  if (explicit) Object.assign(env, { DCR_SITE_ORIGIN: 'https://preview.example.invalid', NEXT_PUBLIC_APP_URL: 'https://preview.example.invalid' });
  const result = spawnSync(process.execPath, ['--conditions=react-server', '--import', 'tsx', '--input-type=module', '-e', `
    import { BASE_URL, localBusinessSchema, createLandingMetadata } from './lib/data/localBusinessSchema.ts';
    import { sameOrigin } from './lib/pilot/http.ts';
    function status(origin) {
      try { sameOrigin(new Request('https://preview.example.invalid/api/pilot/quote', {method:'POST', headers:{origin,'content-type':'application/json'}})); return 200; }
      catch(e) { return e.status; }
    }
    console.log(JSON.stringify({base:BASE_URL,schema:localBusinessSchema.url,canonical:createLandingMetadata('suv','SUV','test').alternates.canonical,
      matching:status('https://preview.example.invalid'), foreign:status('https://daytonacarrentals.com')}));
  `], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
test('Preview without URL values uses relative metadata and fails closed', () => {
  assert.deepEqual(probe('preview'), {base:'',schema:'',canonical:'/rentals/suv',matching:503,foreign:503});
});
test('Production fallback and missing-origin guard remain unchanged', () => {
  assert.deepEqual(probe('production'), {base:'https://daytonacarrentals.com',schema:'https://daytonacarrentals.com',canonical:'https://daytonacarrentals.com/rentals/suv',matching:503,foreign:503});
});
test('configured Preview metadata uses explicit origin and rejects foreign writes', () => {
  assert.deepEqual(probe('preview',true), {base:'https://preview.example.invalid',schema:'https://preview.example.invalid',canonical:'https://preview.example.invalid/rentals/suv',matching:200,foreign:403});
});
test('configured Production retains the same exact origin validation', () => {
  assert.equal(probe('production',true).matching,200);
  assert.equal(probe('production',true).foreign,403);
});
