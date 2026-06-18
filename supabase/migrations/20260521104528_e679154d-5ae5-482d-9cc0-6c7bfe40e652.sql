
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pdf_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-pdfs', 'lead-pdfs', false)
ON CONFLICT (id) DO NOTHING;
