-- 1. Adicionar coluna privacy_mode na tabela invitations
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS privacy_mode BOOLEAN DEFAULT FALSE;

-- 2. Criar a tabela de Lista Fechada Inteligente (Smart List)
CREATE TABLE IF NOT EXISTS invitation_smart_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS (Row Level Security) e Criar Políticas
ALTER TABLE invitation_smart_list ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (necessária para validar o acesso no backend sem admin key, embora o backend geralmente use role admin, é bom ter)
CREATE POLICY "Public select smart_list" ON invitation_smart_list FOR SELECT USING (true);
CREATE POLICY "Public update smart_list" ON invitation_smart_list FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public insert smart_list" ON invitation_smart_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete smart_list" ON invitation_smart_list FOR DELETE USING (true);

-- Política de Admin para full access
CREATE POLICY "Admin all smart_list" ON invitation_smart_list FOR ALL USING (auth.role() = 'authenticated');
