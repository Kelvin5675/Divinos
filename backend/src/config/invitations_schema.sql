-- Supabase Schema for Digital Invitations Module

CREATE TABLE IF NOT EXISTS public.invitation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    features JSONB -- { "has_music": true, "max_photos": 10 }
);

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID, -- REFERENCE TO AUTH se aplicável futuramente
    slug VARCHAR(255) UNIQUE NOT NULL, -- Ex: "casamento-ana-e-joao"
    title VARCHAR(255),
    event_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending_approval', -- pending, active, inactive, draft
    plan_id UUID REFERENCES public.invitation_plans(id),
    editor_type TEXT DEFAULT 'manual', -- template, animation, template_id, petals...
    couple_token VARCHAR(255) UNIQUE, -- Token para acesso ao dashboard dos noivos
    custom_html TEXT, -- Para o modo 'importação de código'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela para os Blocos/Seções do Editor Visual (Estilo Canva)
CREATE TABLE IF NOT EXISTS public.invitations_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
    section_type VARCHAR(100) NOT NULL, -- hero, gallery, location, rsvp, etc
    content JSONB NOT NULL, -- Conteúdo específico da seção (textos, imagens, configs)
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.invitations_details (
-- ... (manteve o anterior, mas vamos expandir se necessário via JSONB nas sections)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
    bride_name VARCHAR(255),
    groom_name VARCHAR(255),
    event_location TEXT,
    maps_url TEXT,
    music_url TEXT,
    gallery_images TEXT[],
    tables_layout JSONB
);

-- Feed de Felicitações (Mensagens dos Convidados) - Independente do RSVP
CREATE TABLE IF NOT EXISTS public.invitations_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.invitations_rsvp (
-- ... (inalterado)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_attending BOOLEAN NOT NULL,
    adult_count INT DEFAULT 1,
    child_count INT DEFAULT 0,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Pedidos de Convites (Checkout)
CREATE TABLE IF NOT EXISTS public.invitations_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    event_date DATE,
    plan_id UUID REFERENCES public.invitation_plans(id),
    total_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, cancelled
    order_status VARCHAR(50) DEFAULT 'new', -- new, creating, finished
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS)
ALTER TABLE public.invitation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations_rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations_orders ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public Read Plans" ON public.invitation_plans;
CREATE POLICY "Public Read Plans" ON public.invitation_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Invitations" ON public.invitations;
CREATE POLICY "Public Read Invitations" ON public.invitations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Sections" ON public.invitations_sections;
CREATE POLICY "Public Read Sections" ON public.invitations_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Messages" ON public.invitations_messages;
CREATE POLICY "Public Read Messages" ON public.invitations_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Messages" ON public.invitations_messages;
CREATE POLICY "Public Insert Messages" ON public.invitations_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Details" ON public.invitations_details;
CREATE POLICY "Public Read Details" ON public.invitations_details FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert RSVP" ON public.invitations_rsvp;
CREATE POLICY "Public Insert RSVP" ON public.invitations_rsvp FOR INSERT WITH CHECK (true);

-- Insert Professional Plans
DELETE FROM public.invitation_plans;
INSERT INTO public.invitation_plans (name, price, features) VALUES 
('Plano Básico', 1500.00, '{
    "design_style": "simple",
    "has_rsvp": true,
    "has_music": true,
    "max_photos": 5,
    "has_countdown": true,
    "has_location": true,
    "has_messages": true,
    "has_qr_code": true
}'),
('Plano Premium', 3500.00, '{
    "design_style": "premium",
    "has_rsvp": true,
    "has_music": true,
    "max_photos": 20,
    "has_countdown": true,
    "has_location": true,
    "has_messages": true,
    "has_qr_code": true,
    "has_pre_wedding_gallery": true,
    "has_save_the_date": true,
    "has_ia_story": true,
    "has_couple_dashboard": true,
    "has_stats": true
}'),
('Plano Luxo', 5900.00, '{
    "design_style": "luxury",
    "has_rsvp": true,
    "has_music": true,
    "max_photos": 50,
    "has_countdown": true,
    "has_location": true,
    "has_messages": true,
    "has_qr_code": true,
    "has_pre_wedding_gallery": true,
    "has_save_the_date": true,
    "has_ia_story": true,
    "has_couple_dashboard": true,
    "has_stats": true,
    "has_pre_wedding_video": true,
    "has_live_stream": true,
    "has_table_map": true,
    "has_guest_uploads": true,
    "has_custom_playlist": true,
    "has_time_capsule": true
}');
