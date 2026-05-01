-- Migration para o Motor de Inscrições Distribuídas

-- 1. Políticas de Inscrição (registration_policies)
CREATE TABLE IF NOT EXISTS public.registration_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.competition_templates(id) ON DELETE CASCADE,
    registration_mode TEXT DEFAULT 'distributed' CHECK (registration_mode IN ('centralized', 'distributed', 'hybrid')),
    min_players INTEGER DEFAULT 11,
    max_players INTEGER DEFAULT 25,
    required_fields JSONB DEFAULT '["name", "number", "position"]'::jsonb,
    approval_mode TEXT DEFAULT 'manual_admin' CHECK (approval_mode IN ('manual_admin', 'auto_after_president')),
    registration_open_date TIMESTAMPTZ,
    registration_close_date TIMESTAMPTZ,
    allow_edit_before_approval BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT registration_policies_target_check CHECK (
        (season_id IS NOT NULL AND template_id IS NULL) OR 
        (template_id IS NOT NULL AND season_id IS NULL)
    )
);

ALTER TABLE public.registration_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registration policies are viewable by everyone" ON public.registration_policies FOR SELECT USING (true);
CREATE POLICY "Registration policies are modifiable by admins" ON public.registration_policies FOR ALL USING (auth.role() = 'authenticated');

-- 2. Inscrições de Jogadores (player_registrations)
CREATE TABLE IF NOT EXISTS public.player_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    shirt_number INTEGER NOT NULL,
    position TEXT NOT NULL,
    photo_url TEXT,
    phone TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT player_registrations_unique_number_per_team UNIQUE (team_id, shirt_number)
);

ALTER TABLE public.player_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Player registrations can be created anonymously" ON public.player_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Player registrations are viewable by everyone" ON public.player_registrations FOR SELECT USING (true);
CREATE POLICY "Player registrations are modifiable by admins" ON public.player_registrations FOR ALL USING (auth.role() = 'authenticated');

-- 3. Trigger para inserir o jogador oficial ao ser aprovado
CREATE OR REPLACE FUNCTION public.handle_player_registration_approval()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO public.players (name, team_id, shirt_number, photo_url, position, active)
        VALUES (NEW.name, NEW.team_id, NEW.shirt_number, NEW.photo_url, NEW.position, true);
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_player_registration_approval
    BEFORE UPDATE ON public.player_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_player_registration_approval();
