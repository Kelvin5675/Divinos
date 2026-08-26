const supabase = require('../config/supabase');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Obter os planos disponíveis para convites digitais
const getPlans = async (req, res) => {
    try {
        const { data, error } = await supabase.from('invitation_plans').select('*').order('price', { ascending: true });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obter convite público pelo slug
const getPublicInvitation = async (req, res) => {
    try {
        const { slug } = req.params;
        const { guest_name, device_id } = req.query; // Para validação do Modo Privado
        
        // 1. Busca o convite principal
        const { data: invitation, error: invError } = await supabase
            .from('invitations')
            .select(`*, plan:invitation_plans(*)`)
            .eq('slug', slug)
            .single();

        if (invError || !invitation) {
            return res.status(404).json({ message: 'Convite não encontrado.' });
        }

        // --- VERIFICAÇÃO DE LISTA FECHADA INTELIGENTE ---
        if (invitation.privacy_mode) {
            if (!device_id) {
                return res.status(401).json({ requireAuth: true, message: 'Acesso restrito. Dispositivo não identificado.' });
            }

            // 1. Verifica se ESTE dispositivo já está vinculado a algum convidado NESTE convite
            const { data: existingDeviceGuests } = await supabase
                .from('invitation_smart_list')
                .select('*')
                .eq('invitation_id', invitation.id)
                .eq('device_fingerprint', device_id)
                .limit(1);

            const existingDeviceGuest = existingDeviceGuests && existingDeviceGuests.length > 0 ? existingDeviceGuests[0] : null;

            if (existingDeviceGuest) {
                // O dispositivo JÁ está vinculado a alguém. 
                if (guest_name && guest_name.toLowerCase() !== existingDeviceGuest.guest_name.toLowerCase()) {
                    return res.status(403).json({ 
                        blocked: true,
                        message: `Este aparelho já está registrado em nome de ${existingDeviceGuest.guest_name}. Não é possível acessar com outro nome.`
                    });
                }
                // Se bateu ou não passou nome, passa direto (sucesso, já logado).
            } else {
                // 2. O dispositivo NÃO está vinculado a ninguém. Precisamos do guest_name.
                if (!guest_name) {
                    return res.status(401).json({ 
                        requireAuth: true, 
                        message: 'Acesso restrito. Identifique-se para acessar.' 
                    });
                }

                // Busca o convidado na lista pelo nome
                const { data: guestData, error: guestError } = await supabase
                    .from('invitation_smart_list')
                    .select('*')
                    .eq('invitation_id', invitation.id)
                    .ilike('guest_name', guest_name)
                    .maybeSingle();

                if (guestError || !guestData) {
                    return res.status(403).json({ 
                        blocked: true,
                        message: 'Desculpe, não localizamos o seu nome na lista oficial de convidados.' 
                    });
                }

                if (guestData.device_fingerprint) {
                    // Já existe um fingerprint para este convidado, e não é o device_id atual
                    return res.status(403).json({
                        blocked: true,
                        message: 'Acesso Restrito: Este convite é intransferível e já foi aberto pelo titular em outro aparelho.'
                    });
                } else {
                    // Primeiro acesso deste convidado: vincula o novo aparelho
                    await supabase
                        .from('invitation_smart_list')
                        .update({ device_fingerprint: device_id })
                        .eq('id', guestData.id);
                }
            }
        }
        // --- FIM DA VERIFICAÇÃO ---

        // 2. Busca Detalhes (separado para não quebrar tudo se falhar)
        const { data: details } = await supabase
            .from('invitations_details')
            .select('*')
            .eq('invitation_id', invitation.id)
            .single();

        // 3. Busca Seções
        const { data: sections } = await supabase
            .from('invitations_sections')
            .select('*')
            .eq('invitation_id', invitation.id)
            .order('sort_order', { ascending: true });

        // 4. Busca Mensagens
        const { data: messages } = await supabase
            .from('invitations_rsvp')
            .select('guest_name, message, created_at')
            .eq('invitation_id', invitation.id)
            .not('message', 'is', null)
            .order('created_at', { ascending: false });

        // Monta o objeto final
        const finalData = {
            ...invitation,
            details: details || {},
            sections: sections || [],
            messages: messages || []
        };

        res.status(200).json(finalData);
    } catch (error) {
        console.error('ERRO NO GET_PUBLIC_INVITATION:', error);
        res.status(500).json({ error: 'Erro interno ao processar convite' });
    }
};

// Gerador de página estática para Meta Tags (WhatsApp/Facebook Preview)
const getInvitationMetaPage = async (req, res) => {
    try {
        const { slug } = req.params;
        const { data: invitation, error } = await supabase
            .from('invitations')
            .select('title, customer_name, bride_name, groom_name, event_date, cover_photo_url')
            .eq('slug', slug)
            .single();
        
        if (error || !invitation) {
            return res.status(404).send('Convite não encontrado.');
        }

        // Formatar Título: "Convite de Casamento de Lasmi e Jalimo"
        const bride = invitation.bride_name || '';
        const groom = invitation.groom_name || '';
        const couple = (bride && groom) ? `${bride} e ${groom}` : (invitation.customer_name || 'os Noivos');
        const title = `Convite de Casamento de ${couple}`;
        
        const cover = invitation.cover_photo_url || 'https://divinos.vercel.app/assets/images/og-default.jpg';
        
        let desc = 'Convidamos-te para celebrar connosco este momento especial.';
        if (invitation.event_date) {
            const dObj = new Date(invitation.event_date);
            if (!isNaN(dObj.getTime())) {
                const dateOptions = { day: '2-digit', month: 'long', year: 'numeric' };
                const formattedDate = dObj.toLocaleDateString('pt-PT', dateOptions);
                desc = `Celebre o amor connosco no dia ${formattedDate}.`;
            }
        }
        
        const targetUrl = `https://divinos.vercel.app/pages/convite?slug=${slug}`;

        const html = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    
    <!-- Open Graph / WhatsApp -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://divinos.vercel.app/c/${slug}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${cover}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${cover}">

    <!-- Redirecionamento Automático -->
    <meta http-equiv="refresh" content="0;url=${targetUrl}">
    
    <style>
        body { background: #fff; color: #333; font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .loading-box { padding: 2rem; }
        .spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #C5A059; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { font-size: 1.1rem; color: #666; }
        a { color: #C5A059; text-decoration: none; font-weight: 500; margin-top: 1rem; display: block; }
    </style>
</head>
<body>
    <div class="loading-box">
        <div class="spinner"></div>
        <p>A abrir o convite de <strong>${couple}</strong>...</p>
        <a href="${targetUrl}">Clique aqui se não for redirecionado</a>
    </div>
    
    <script>
        window.location.href = "${targetUrl}";
    </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (e) {
        console.error('Erro Meta Page:', e);
        res.status(500).send('Erro interno do servidor.');
    }
};

// Confirmar presença (RSVP)
const submitRsvp = async (req, res) => {
    try {
        const { invitation_id } = req.params;
        const { guest_name, email, phone, is_attending, adult_count, child_count, message } = req.body;

        if (!guest_name || is_attending === undefined) {
            return res.status(400).json({ error: 'Nome do convidado e status de presença são obrigatórios.' });
        }

        const { data, error } = await supabase
            .from('invitations_rsvp')
            .insert([{
                invitation_id,
                guest_name,
                email,
                phone,
                is_attending,
                adult_count: adult_count || (is_attending ? 1 : 0),
                child_count: child_count || 0,
                message
            }]);

        if (error) throw error;
        res.status(201).json({ message: 'Presença confirmada com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- NOVAS FUNÇÕES DA PLATAFORMA PROFISSIONAL ---

// Criar Pedido de Convite (Checkout)
const createOrder = async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, event_type, event_date, plan_id } = req.body;

        const order_code = 'INV' + Date.now().toString().slice(-6);

        const { data, error } = await supabase
            .from('invitations_orders')
            .insert([{
                order_code,
                customer_name,
                customer_email,
                customer_phone,
                event_type,
                event_date,
                plan_id,
                payment_status: 'pending',
                order_status: 'new'
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Listar Pedidos (Admin)
const getOrders = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('invitations_orders')
            .select('*, plan:invitation_plans(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Gerar com IA (Gemini)
const generateWithIA = async (req, res) => {
    try {
        const { bride_name, groom_name, event_type, event_date, location, message, plan_name } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Gere uma estrutura de convite digital para um ${event_type} de ${bride_name} e ${groom_name}.
        Data: ${event_date}. Local: ${location}. Mensagem base: ${message}. Plano: ${plan_name}.
        Retorne APENAS um JSON com os campos: title, summary_text, color_palette (array de hex), suggested_sections (array de objetos {type, title, default_content}).
        O tom deve ser elegante e condizente com o plano ${plan_name}.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Limpar possíveis markdown do Gemini
        const jsonStr = text.replace(/```json|```/g, '').trim();
        res.status(200).json(JSON.parse(jsonStr));
    } catch (error) {
        console.error('ERRO AO GERAR COM IA:', error);
        res.status(500).json({ error: error.message });
    }
};

// Salvar Convite Finalizado (Admin)
const createInvitation = async (req, res) => {
    try {
        const { slug, title, event_date, plan_id, editor_type, details, sections, custom_html } = req.body;

        // 1. Criar entrada na tabela invitations
        const { data: invData, error: invError } = await supabase
            .from('invitations')
            .insert([{
                slug,
                title,
                event_date,
                plan_id,
                editor_type,
                status: 'active',
                couple_token: Math.random().toString(36).substring(2, 10).toUpperCase(),
                custom_html: editor_type === 'code' ? custom_html : null
            }])
            .select();

        if (invError) throw invError;
        const invitationId = invData[0].id;

        // 2. Criar Detalhes
        if (details) {
            const { error: detError } = await supabase
                .from('invitations_details')
                .insert([{ invitation_id: invitationId, ...details }]);
            if (detError) throw detError;
        }

        // 3. Criar Seções (Se for Manual ou IA)
        if (sections && sections.length > 0) {
            const sectionsWithId = sections.map((s, i) => ({
                invitation_id: invitationId,
                section_type: s.type,
                content: s.content,
                sort_order: i
            }));
            const { error: secError } = await supabase
                .from('invitations_sections')
                .insert(sectionsWithId);
            if (secError) throw secError;
        }

        res.status(201).json(invData[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obter Dados do Dashboard dos Noivos (via Token)
const getDashboardData = async (req, res) => {
    try {
        const { token } = req.params;

        // 1. Verificar Token e pegar ID do convite
        const { data: invData, error: invError } = await supabase
            .from('invitations')
            .select('id, slug, title, event_date, plan:invitation_plans(*)')
            .eq('couple_token', token)
            .single();

        if (invError || !invData) {
            return res.status(404).json({ error: 'Token inválido ou convite não encontrado.' });
        }

        // 2. Pegar RSVPs
        const { data: rsvpData, error: rsvpError } = await supabase
            .from('invitations_rsvp')
            .select('*')
            .eq('invitation_id', invData.id)
            .order('created_at', { ascending: false });

        // 3. Pegar Mensagens
        const { data: msgData, error: msgError } = await supabase
            .from('invitations_messages')
            .select('*')
            .eq('invitation_id', invData.id)
            .order('created_at', { ascending: false });

        res.status(200).json({
            invitation: invData,
            rsvps: rsvpError ? [] : rsvpData,
            messages: msgError ? [] : msgData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- SMART LIST (LISTA FECHADA) ---

// Obter a lista de convidados inteligente
const getSmartList = async (req, res) => {
    try {
        const { invitation_id } = req.params;
        const { data, error } = await supabase
            .from('invitation_smart_list')
            .select('*')
            .eq('invitation_id', invitation_id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Importar convidados em massa
const addToSmartListBulk = async (req, res) => {
    try {
        const { invitation_id } = req.params;
        const { names } = req.body; // Array de strings

        if (!names || !Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ error: 'Lista de nomes inválida.' });
        }

        const insertData = names.map(name => ({
            invitation_id,
            guest_name: name.trim()
        })).filter(item => item.guest_name.length > 0);

        const { data, error } = await supabase
            .from('invitation_smart_list')
            .insert(insertData)
            .select();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remover um convidado (ou revogar acesso)
const removeFromSmartList = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('invitation_smart_list')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Convidado removido com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Alternar modo privado
const togglePrivacyMode = async (req, res) => {
    try {
        const { invitation_id } = req.params;
        const { privacy_mode } = req.body;
        
        const { error } = await supabase
            .from('invitations')
            .update({ privacy_mode })
            .eq('id', invitation_id);

        if (error) throw error;
        res.status(200).json({ message: 'Modo privado atualizado.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


module.exports = {
    getPlans,
    getPublicInvitation,
    getInvitationMetaPage,
    submitRsvp,
    createOrder,
    getOrders,
    generateWithIA,
    createInvitation,
    getDashboardData,
    getSmartList,
    addToSmartListBulk,
    removeFromSmartList,
    togglePrivacyMode
};
