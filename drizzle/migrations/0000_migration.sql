CREATE TABLE public.scheduled_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'Request',
  url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status int,
  last_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_requests TO authenticated;
GRANT ALL ON public.scheduled_requests TO service_role;
ALTER TABLE public.scheduled_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rows" ON public.scheduled_requests FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());