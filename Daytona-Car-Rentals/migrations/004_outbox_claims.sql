-- Expiring worker ownership; immutable delivery body survives provider retries.
ALTER TABLE dcr_private.outbox ADD COLUMN claim_token uuid;
ALTER TABLE dcr_private.outbox ADD COLUMN lease_until bigint NOT NULL DEFAULT 0;
ALTER TABLE dcr_private.outbox ADD COLUMN delivery text;
CREATE INDEX outbox_pending ON dcr_private.outbox(next_at,lease_until) WHERE state IN ('pending','retry');
