-- Create enum for briefing status
CREATE TYPE briefing_status AS ENUM ('draft', 'sent', 'in_progress', 'submitted', 'locked');

-- Create enum for field types
CREATE TYPE briefing_field_type AS ENUM ('text', 'textarea', 'select', 'multiselect', 'radio', 'checkbox', 'date', 'upload', 'scale', 'boolean');

-- 1. Briefing Templates
CREATE TABLE briefing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Briefing Steps
CREATE TABLE briefing_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES briefing_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Briefing Fields
CREATE TABLE briefing_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID REFERENCES briefing_steps(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    name TEXT NOT NULL, -- Internal key for the field
    type briefing_field_type NOT NULL,
    required BOOLEAN DEFAULT false,
    options JSONB, -- For select, radio, etc. e.g. ["Option 1", "Option 2"]
    placeholder TEXT,
    help_text TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Briefings (The instances sent to clients)
CREATE TABLE briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES briefing_templates(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Optional, can be a lead or existing client
    status briefing_status DEFAULT 'draft',
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'), -- Secure public access token
    metadata JSONB, -- Extra data if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Briefing Responses
CREATE TABLE briefing_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE,
    field_id UUID REFERENCES briefing_fields(id) ON DELETE CASCADE,
    value JSONB, -- Stores the answer. JSONB allows flexibility for arrays (multiselect) or complex objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(briefing_id, field_id) -- One response per field per briefing
);

-- Indexes for performance
CREATE INDEX idx_briefing_steps_template ON briefing_steps(template_id);
CREATE INDEX idx_briefing_fields_step ON briefing_fields(step_id);
CREATE INDEX idx_briefings_token ON briefings(token);
CREATE INDEX idx_briefings_client ON briefings(client_id);
CREATE INDEX idx_briefing_responses_briefing ON briefing_responses(briefing_id);

-- RLS Policies

-- Enable RLS
ALTER TABLE briefing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_responses ENABLE ROW LEVEL SECURITY;

-- Policies for Templates, Steps, Fields (Public Read for rendering, Admin Write)
-- Ideally, only Admin creates templates. Public needs to read them to render the form.
-- We can restrict public read to only "if they have a valid briefing token that uses this template", but for simplicity and since templates aren't sensitive, we can allow authenticated read or public read.
-- Let's stick to: Authenticated users (Admin) can do everything. Public (via token) needs specific access.

-- Admin Access (Authenticated)
CREATE POLICY "Admins can manage templates" ON briefing_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can manage steps" ON briefing_steps FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can manage fields" ON briefing_fields FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can manage briefings" ON briefings FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can view responses" ON briefing_responses FOR ALL TO authenticated USING (true);

-- Public Access via Token (The tricky part)
-- We need a function to validate token access or use simple policies.

-- 1. Briefings: Public can read their OWN briefing if they have the token.
-- Since we can't easily check "if user has token" in RLS without a custom function or passing it in query, 
-- a common pattern for public token access is to create a secure RPC or use `security definer` functions.
-- HOWEVER, for direct Supabase client access, we can use a policy like:
-- "Allow read if token matches" -> But the user doesn't "have" the token in their session. They send it in the query.
-- Standard RLS doesn't filter by "what I sent in the WHERE clause".
-- SO: We will rely on the Backend (Server Actions) to handle the security for Public access.
-- The Server Actions will use `supabase-admin` (service role) or a specific logic to fetch data by token.
-- For the Admin Dashboard (client-side fetching), the "authenticated" policies above are sufficient.

-- We will add a policy for "Public Read" on Templates/Steps/Fields just in case we want to fetch them publicly, 
-- but strictly speaking, if we use Server Actions for the wizard, we might not need public RLS.
-- Let's keep it locked to Authenticated for now, and use Service Role in Server Actions for the public wizard.

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_briefings_updated_at BEFORE UPDATE ON briefings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_briefing_responses_updated_at BEFORE UPDATE ON briefing_responses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
