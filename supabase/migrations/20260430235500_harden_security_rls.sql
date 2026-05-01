-- 1. ATIVAR RLS EM TODAS AS TABELAS QUE AINDA NÃO TÊM
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.season_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.news ENABLE ROW LEVEL SECURITY;

-- 2. LIMPAR POLÍTICAS EXISTENTES (PARA REPOSIÇÃO SEGURA) - Opcional, mas recomendado para evitar conflitos
-- Drop existing policies if needed (omitted for safety, using CREATE POLICY IF NOT EXISTS logic below)

-- 3. POLÍTICAS DE LEITURA PÚBLICA (ANON/AUTHENTICATED)
-- Quase todas as tabelas de um portal esportivo são de leitura pública
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'organizations', 'competitions', 'seasons', 'stages', 'teams', 
        'season_teams', 'players', 'matches', 'match_events', 'standings', 'news', 'app_metadata'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Read Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Public Read Access" ON public.%I FOR SELECT USING (true)', t);
    END LOOP;
END $$;

-- 4. POLÍTICAS DE ESCRITA (APENAS O ADMIN ESPECÍFICO)
-- Criamos uma função auxiliar para verificar se o usuário é o Admin oficial
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  -- Verifica se o e-mail no JWT da sessão é o e-mail do administrador
  RETURN (auth.jwt() ->> 'email') = 'admin@apd.com.br';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'organizations', 'competitions', 'seasons', 'stages', 'teams', 
        'season_teams', 'players', 'matches', 'match_events', 'standings', 'news', 'app_metadata'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin Full Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Admin Full Access" ON public.%I FOR ALL USING (public.is_admin())', t);
    END LOOP;
END $$;

-- 5. SEGURANÇA ADICIONAL PARA STORAGE (IMAGENS)
-- Permitir leitura pública de arquivos no storage
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('logos', 'players', 'news'));

-- Permitir upload apenas para o Admin oficial
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (
    public.is_admin() AND 
    bucket_id IN ('logos', 'players', 'news')
);

-- Permitir exclusão apenas para Admin oficial
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (
    public.is_admin() AND 
    bucket_id IN ('logos', 'players', 'news')
);
