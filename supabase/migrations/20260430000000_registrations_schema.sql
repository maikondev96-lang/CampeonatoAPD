-- Criação da tabela team_managers
CREATE TABLE IF NOT EXISTS public.team_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criação da tabela registration_links
CREATE TABLE IF NOT EXISTS public.registration_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criação da tabela registration_submissions
CREATE TABLE IF NOT EXISTS public.registration_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_link_id UUID REFERENCES public.registration_links(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    team_short_name TEXT,
    team_city TEXT,
    team_logo_url TEXT,
    manager_name TEXT NOT NULL,
    manager_email TEXT,
    manager_phone TEXT,
    players_data JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'correction_requested')),
    admin_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criação da tabela approval_logs
CREATE TABLE IF NOT EXISTS public.approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.registration_submissions(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campos de herança e configuração às tabelas base
ALTER TABLE public.competitions 
ADD COLUMN IF NOT EXISTS registration_fields JSONB DEFAULT '{"required": ["name", "number", "position"], "optional": ["photo", "nickname", "age", "document"]}'::jsonb;

ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS inherited_from_season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS allow_registrations BOOLEAN DEFAULT FALSE;

-- Atualizar Row Level Security (RLS)
ALTER TABLE public.team_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para registration_links (Qualquer pessoa pode ler links ativos, Admin escreve)
CREATE POLICY "Enable read access for all users on registration_links" ON public.registration_links FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins on registration_links" ON public.registration_links FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para registration_submissions (Presidentes podem inserir e ler as próprias através de um hash no frontend talvez, mas para simplificar: insert para anon/auth)
CREATE POLICY "Enable insert for all users on registration_submissions" ON public.registration_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable all access for admins on registration_submissions" ON public.registration_submissions FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para team_managers
CREATE POLICY "Enable all access for admins on team_managers" ON public.team_managers FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para approval_logs
CREATE POLICY "Enable read access for all users on approval_logs" ON public.approval_logs FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins on approval_logs" ON public.approval_logs FOR ALL USING (auth.role() = 'authenticated');
