-- Fix for AI history saves failing with:
--   value too long for type character varying(50)
--
-- Cause:
--   web/server/ai/historyHandler.js stores chat history in public.ai_summarization
--   using reference_type = 'chat_history_' || user_id || '_' || session_id.
--   A UUID user id plus a generated session id is normally longer than 50 chars.
--
-- This migration preserves existing data. It does not truncate values.

BEGIN;

ALTER TABLE public.ai_summarization
  ALTER COLUMN reference_type TYPE text;

COMMIT;

-- Optional production audit: run before/after the migration to identify fixed-width
-- AI columns and confirm no remaining varchar(50) limit blocks AI metadata.
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'ai_chat_logs',
    'ai_summarization',
    'ai_conversations',
    'ai_conversation_sessions',
    'ai_analytics'
  )
  AND data_type = 'character varying'
ORDER BY table_name, ordinal_position;

-- Optional live data check for the known failing history key shape.
SELECT
  'ai_summarization' AS table_name,
  'reference_type' AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS current_type,
  MAX(length(reference_type)) AS max_value_length,
  MIN(reference_type) FILTER (WHERE reference_type LIKE 'chat_history_%') AS sample_value
FROM public.ai_summarization s
JOIN pg_catalog.pg_attribute a
  ON a.attrelid = 'public.ai_summarization'::regclass
 AND a.attname = 'reference_type'
WHERE reference_type LIKE 'chat_history_%'
GROUP BY a.atttypid, a.atttypmod;
