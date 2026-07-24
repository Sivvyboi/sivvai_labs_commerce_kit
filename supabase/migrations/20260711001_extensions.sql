-- =============================================================================
-- 001_extensions.sql
-- Enable required PostgreSQL extensions.
--
-- NOTE: uuid-ossp is intentionally NOT enabled.
--   All UUID generation uses gen_random_uuid() from pgcrypto, which is
--   Supabase's recommended approach and faster than uuid_generate_v4().
--
-- NOTE: Extension version clauses (e.g. VERSION '1.3') are omitted.
--   Supabase deprecated version pinning on 2026-07-22; from 2026-08-05,
--   version clauses are ignored. The default version is always installed.
-- =============================================================================

create extension if not exists pgcrypto;    -- gen_random_uuid(), gen_random_bytes()
create extension if not exists pg_trgm;     -- trigram similarity for fuzzy search
