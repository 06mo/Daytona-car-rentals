-- Preserve applied migration checksums while correcting ordinary DELETE handling.
CREATE OR REPLACE FUNCTION dcr_private.protect_environment() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog AS $$ BEGIN
  IF OLD.id='environment' THEN RAISE EXCEPTION 'Database environment is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
