CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('purge-expired-code', '15 3 * * *', $$SELECT public.purge_expired_code();$$);