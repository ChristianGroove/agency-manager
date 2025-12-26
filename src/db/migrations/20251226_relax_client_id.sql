-- Allow services to exist without a client (Catalog Items)
ALTER TABLE services ALTER COLUMN client_id DROP NOT NULL;
