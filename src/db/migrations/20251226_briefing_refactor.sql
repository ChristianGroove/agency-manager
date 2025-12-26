-- Add structure column to briefing_templates
ALTER TABLE public.briefing_templates 
ADD COLUMN IF NOT EXISTS structure JSONB DEFAULT '[]'::jsonb;

-- Add description if not exists (User mentioned it, check if exists)
-- It likely exists, but let's be safe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefing_templates' AND column_name = 'description') THEN 
        ALTER TABLE public.briefing_templates ADD COLUMN description TEXT; 
    END IF; 
END $$;

-- Enable RLS if not enabled (Standard practice)
ALTER TABLE public.briefing_templates ENABLE ROW LEVEL SECURITY;

-- Policy (simulated, usually we grant access)
-- CREATE POLICY "Enable read access for all users" ON public.briefing_templates FOR SELECT USING (true);
