CREATE TABLE public.daily_uids (
  uid text PRIMARY KEY,
  last_run_at timestamptz,
  last_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.daily_uids TO service_role;
ALTER TABLE public.daily_uids ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.scheduled_requests IS 'DEPRECATED: replaced by daily_uids';