CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  industry TEXT NOT NULL,
  software TEXT,
  revenue TEXT NOT NULL,
  referral TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  stage TEXT NOT NULL,
  why_bookkeeper TEXT NOT NULL,
  stressors TEXT,
  anything_else TEXT,
  clickup_task_id TEXT,
  clickup_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) can submit a lead via the public form
CREATE POLICY "Anyone can submit a lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only authenticated users can read leads
CREATE POLICY "Authenticated users can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_leads_created_at ON public.leads (created_at DESC);