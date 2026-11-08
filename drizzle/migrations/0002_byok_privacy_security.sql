-- Personal AI provider credentials: encrypted by the server, never readable from the browser.
CREATE TABLE public.user_provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('openai','gemini','anthropic','groq','openrouter')),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  key_hint text NOT NULL,
  model text,
  models jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'untested' CHECK (status IN ('untested','connected','invalid','error')),
  last_error text,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT ALL ON public.user_provider_credentials TO service_role;
ALTER TABLE public.user_provider_credentials ENABLE ROW LEVEL SECURITY;
-- No policies and no grants for anon/authenticated: only trusted server code can touch this table.
CREATE TRIGGER user_provider_credentials_updated_at BEFORE UPDATE ON public.user_provider_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security activity log: users read their own events; only the server writes.
CREATE TABLE public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_audit_logs_user_created_idx ON public.security_audit_logs (user_id, created_at DESC);
GRANT SELECT ON public.security_audit_logs TO authenticated;
GRANT ALL ON public.security_audit_logs TO service_role;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own security events" ON public.security_audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Privacy preferences
CREATE TABLE public.user_privacy_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  code_retention text NOT NULL DEFAULT 'forever' CHECK (code_retention IN ('forever','30d','7d','none')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_privacy_settings TO authenticated;
GRANT ALL ON public.user_privacy_settings TO service_role;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own privacy settings" ON public.user_privacy_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own privacy settings" ON public.user_privacy_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own privacy settings" ON public.user_privacy_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_privacy_settings_updated_at BEFORE UPDATE ON public.user_privacy_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Usage now records which provider ran the scan.
ALTER TABLE public.ai_usage_logs ADD COLUMN provider text NOT NULL DEFAULT 'lovable';
CREATE INDEX ai_usage_logs_user_provider_created_idx ON public.ai_usage_logs (user_id, provider, created_at DESC);

-- Analyses remember which provider produced them; code may be cleared by retention settings.
ALTER TABLE public.analyses ADD COLUMN provider text NOT NULL DEFAULT 'lovable';
ALTER TABLE public.analyses ADD COLUMN code_purged boolean NOT NULL DEFAULT false;

-- Failed sign-in logging. Callable before sign-in; reveals nothing (always returns void) and is throttled.
CREATE OR REPLACE FUNCTION public.log_failed_sign_in(_email text, _user_agent text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
BEGIN
  IF _email IS NULL OR length(_email) > 320 THEN RETURN; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.security_audit_logs
      WHERE user_id = _uid AND event = 'sign_in_failed' AND created_at > now() - interval '1 hour') >= 20 THEN
    RETURN;
  END IF;
  INSERT INTO public.security_audit_logs (user_id, event, user_agent)
  VALUES (_uid, 'sign_in_failed', left(_user_agent, 300));
END;
$$;
REVOKE ALL ON FUNCTION public.log_failed_sign_in(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_failed_sign_in(text, text) TO anon, authenticated;

-- Retention cleanup: clears stored source code past each user's chosen retention period.
CREATE OR REPLACE FUNCTION public.purge_expired_code()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _n integer;
BEGIN
  UPDATE public.analyses a
  SET code = '', code_purged = true
  FROM public.user_privacy_settings s
  WHERE s.user_id = a.user_id
    AND a.code_purged = false
    AND (
      s.code_retention = 'none'
      OR (s.code_retention = '7d' AND a.created_at < now() - interval '7 days')
      OR (s.code_retention = '30d' AND a.created_at < now() - interval '30 days')
    );
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_code() TO service_role;