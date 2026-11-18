ALTER TABLE public.analyses ADD COLUMN ai_model text;
CREATE TABLE public.ai_gateway_blocks (model text PRIMARY KEY, message text NOT NULL, status integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.ai_gateway_blocks TO service_role;
ALTER TABLE public.ai_gateway_blocks ENABLE ROW LEVEL SECURITY;