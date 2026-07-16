-- Enable pgcrypto — provides gen_random_uuid() and cryptographic functions.
-- NOTE: uuid-ossp is NOT enabled. Use gen_random_uuid() from pgcrypto everywhere.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_trgm for trigram-based similarity search and GIN indexing.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
