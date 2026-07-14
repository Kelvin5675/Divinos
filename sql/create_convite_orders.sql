-- Migração para criar a tabela de pedidos de convites simplificada
CREATE TABLE IF NOT EXISTS public.convite_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    plan_id TEXT, -- Mudei de UUID para TEXT pois alguns planos (ex: teste-id) podem não ser UUID. Pode alterar para UUID se todos os IDs dos planos no Supabase forem UUIDs.
    plan_name TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_producao', 'concluido', 'cancelado')),
    invitation_id UUID, -- Referência futura para o convite gerado
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuração de Row Level Security (RLS)
ALTER TABLE public.convite_orders ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (se necessário, ou restringir ao admin)
CREATE POLICY "Permitir leitura pública de convite_orders"
    ON public.convite_orders FOR SELECT
    USING (true);

-- Permitir inserção anónima (para os clientes poderem fazer o pedido na landing page)
CREATE POLICY "Permitir inserção anónima de convite_orders"
    ON public.convite_orders FOR INSERT
    WITH CHECK (true);

-- Acesso total para utilizadores autenticados (Admin)
CREATE POLICY "Acesso total admin convite_orders"
    ON public.convite_orders FOR ALL
    USING (auth.role() = 'authenticated');
