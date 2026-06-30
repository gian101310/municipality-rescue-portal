CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.trusted_sessions
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

UPDATE public.trusted_sessions
SET token_hash = encode(extensions.digest(convert_to(session_token, 'UTF8'), 'sha256'), 'hex')
WHERE token_hash IS NULL
  AND session_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_sessions_token_hash
  ON public.trusted_sessions(token_hash)
  WHERE token_hash IS NOT NULL AND NOT is_revoked;

ALTER TABLE public.trusted_sessions
  ALTER COLUMN session_token DROP NOT NULL;

UPDATE public.trusted_sessions
SET session_token = NULL
WHERE token_hash IS NOT NULL;

DROP INDEX IF EXISTS public.idx_trusted_sessions_token;

REVOKE INSERT, UPDATE, DELETE ON public.trusted_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.trusted_sessions FROM authenticated;
GRANT SELECT ON public.trusted_sessions TO authenticated;
