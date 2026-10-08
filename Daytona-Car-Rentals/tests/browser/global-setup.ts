export default function setup() {
  if(!process.env.DCR_TEST_ADMIN_URL || !process.env.DCR_TEST_RUNTIME_PASSWORD)
    throw new Error('Browser tests need isolated local Postgres: DCR_TEST_ADMIN_URL and DCR_TEST_RUNTIME_PASSWORD.');
}
