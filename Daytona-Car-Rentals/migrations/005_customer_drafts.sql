-- Private, owned pre-request intake. No reservation or calendar allocation.
CREATE TABLE dcr_private.customer_drafts (
 id uuid PRIMARY KEY, customer_id uuid NOT NULL, data jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1, created_at bigint NOT NULL, expires_at bigint NOT NULL,
 request_id uuid UNIQUE REFERENCES dcr_private.reservations(id), submitted_hash text
);
CREATE INDEX customer_drafts_owner ON dcr_private.customer_drafts(customer_id,expires_at);
CREATE TABLE dcr_private.draft_documents (
 id uuid PRIMARY KEY, draft_id uuid NOT NULL REFERENCES dcr_private.customer_drafts(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('license','insurance')), content bytea NOT NULL CHECK(octet_length(content)<=2097152),
 valid_until text NOT NULL, created_at bigint NOT NULL, current boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX draft_document_current ON dcr_private.draft_documents(draft_id,kind) WHERE current;
ALTER TABLE dcr_private.documents ADD COLUMN valid_until text;
DO $$ DECLARE t text; r text; BEGIN
 FOREACH t IN ARRAY ARRAY['customer_drafts','draft_documents'] LOOP
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
