-- Create metadata table for cache versioning
CREATE TABLE IF NOT EXISTS app_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela TEXT UNIQUE NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_metadata ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public read app_metadata" ON app_metadata
    FOR SELECT USING (true);

-- Allow authenticated update (for admin actions)
CREATE POLICY "Admin update app_metadata" ON app_metadata
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Initial entries
INSERT INTO app_metadata (tabela, version) VALUES 
('jogadores', 1),
('noticias', 1),
('partidas', 1),
('classificacao', 1),
('times', 1)
ON CONFLICT (tabela) DO NOTHING;
