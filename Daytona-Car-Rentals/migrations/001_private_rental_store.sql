-- Apply with a migration-owner connection, never the application role.
CREATE SCHEMA IF NOT EXISTS dcr_private;
REVOKE ALL ON SCHEMA dcr_private FROM PUBLIC;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='dcr_app') THEN
    CREATE ROLE dcr_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
-- The migration owner must also pass FORCE RLS when it initializes configuration.
GRANT dcr_app TO CURRENT_USER;
CREATE TABLE dcr_private.config(id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE dcr_private.quotes(id uuid PRIMARY KEY, data jsonb NOT NULL CHECK (data->>'id'=id::text));
CREATE INDEX quotes_expiry ON dcr_private.quotes (((data->>'expiresAt')::bigint));
CREATE TABLE dcr_private.reservations(
  id uuid PRIMARY KEY,
  request_key uuid NOT NULL UNIQUE,
  payload_hash text NOT NULL,
  data jsonb NOT NULL CHECK (data->>'id'=id::text)
    CHECK (data->>'status' IN ('pending','confirmed','cancelled'))
);
CREATE TABLE dcr_private.blocks(id uuid PRIMARY KEY, data jsonb NOT NULL CHECK (data->>'id'=id::text));
CREATE TABLE dcr_private.sessions(hash text PRIMARY KEY, expires bigint NOT NULL);
CREATE TABLE dcr_private.attempts(id text PRIMARY KEY, count integer NOT NULL, reset bigint NOT NULL);
CREATE TABLE dcr_private.audit(id uuid PRIMARY KEY, at bigint NOT NULL, action text NOT NULL, reference text NOT NULL);
CREATE INDEX sessions_expiry ON dcr_private.sessions(expires);
CREATE INDEX audit_recent ON dcr_private.audit(at DESC);
-- Environment identity cannot be changed by the runtime (or accidentally by a seed rerun).
CREATE FUNCTION dcr_private.protect_environment() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog AS $$ BEGIN
  IF OLD.id='environment' THEN RAISE EXCEPTION 'Database environment is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER environment_immutable BEFORE UPDATE OR DELETE ON dcr_private.config
FOR EACH ROW EXECUTE FUNCTION dcr_private.protect_environment();
REVOKE ALL ON ALL TABLES IN SCHEMA dcr_private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dcr_private FROM PUBLIC;
DO $$ DECLARE role_name text; table_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA dcr_private FROM %I',role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA dcr_private FROM %I',role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dcr_private FROM %I',role_name);
    END IF;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['config','quotes','reservations','blocks','sessions','attempts','audit'] LOOP
    EXECUTE format('ALTER TABLE dcr_private.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE dcr_private.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY server_only ON dcr_private.%I TO dcr_app USING (true) WITH CHECK (true)',table_name);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA dcr_private TO dcr_app;
GRANT SELECT,UPDATE ON dcr_private.config TO dcr_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON dcr_private.quotes,dcr_private.reservations,dcr_private.blocks,dcr_private.sessions,dcr_private.attempts TO dcr_app;
GRANT SELECT,INSERT ON dcr_private.audit TO dcr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA dcr_private REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA dcr_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
