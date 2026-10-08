-- Private application records; never exposed through the public Data API.
ALTER TABLE dcr_private.reservations ADD COLUMN customer_id uuid;
CREATE INDEX reservations_customer ON dcr_private.reservations(customer_id);
ALTER TABLE dcr_private.audit ADD COLUMN actor text NOT NULL DEFAULT 'legacy-owner';
ALTER TABLE dcr_private.audit ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE dcr_private.auth_intents (id text PRIMARY KEY, path text NOT NULL, expires bigint NOT NULL);
CREATE TABLE dcr_private.intakes (request_id uuid PRIMARY KEY REFERENCES dcr_private.reservations(id), data jsonb NOT NULL);
CREATE TABLE dcr_private.documents (
 id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES dcr_private.reservations(id),
 kind text NOT NULL CHECK(kind IN ('license','insurance')), content bytea NOT NULL CHECK(octet_length(content)<=2097152),
 created_at bigint NOT NULL, expires_at bigint NOT NULL, reviewed boolean NOT NULL DEFAULT false,
 UNIQUE(request_id,kind)
);
CREATE TABLE dcr_private.claims (id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES dcr_private.reservations(id), customer_id uuid NOT NULL, email_hash text NOT NULL, status text NOT NULL CHECK(status IN ('pending','approved','declined')), UNIQUE(request_id,customer_id));
CREATE TABLE dcr_private.outbox (
 id uuid PRIMARY KEY, event_key text UNIQUE NOT NULL, recipient text NOT NULL, payload jsonb NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','captured','sent','retry','blocked')),
 attempts integer NOT NULL DEFAULT 0, next_at bigint NOT NULL DEFAULT 0, created_at bigint NOT NULL, sent_at bigint
);
CREATE TABLE dcr_private.setting_history (id uuid PRIMARY KEY, at bigint NOT NULL, actor text NOT NULL, reference text NOT NULL, data jsonb NOT NULL);
DO $$ DECLARE t text; r text; BEGIN
 FOREACH t IN ARRAY ARRAY['auth_intents','intakes','documents','claims','outbox','setting_history'] LOOP
  EXECUTE format('ALTER TABLE dcr_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE dcr_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY runtime_only ON dcr_private.%I TO dcr_app USING (true) WITH CHECK (true)',t);
  EXECUTE format('REVOKE ALL ON dcr_private.%I FROM PUBLIC',t);
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON dcr_private.%I FROM %I',t,r); END IF;
  END LOOP;
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON dcr_private.%I TO dcr_app',t);
 END LOOP;
END $$;
REVOKE UPDATE,DELETE ON dcr_private.setting_history FROM dcr_app;
