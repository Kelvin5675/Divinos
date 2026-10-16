window.templatesCatalog = [
    {
        id: "premium-editorial",
        name: "Premium Editorial Cutout (Principal)",
        thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=400&auto=format&fit=crop",
        description: "Design contemporâneo de altíssimo nível com recortes (Framed UI / Cutouts), glassmorphism, tipografia editorial e experiência refinada.",
        path: "../templates/premium-editorial.html"
    },
    {
        id: "royal-luxury",
        name: "Royal Luxury & Ouro Imperial",
        thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=400&auto=format&fit=crop",
        description: "Convite cerimonioso de altíssimo luxo com envelope 3D realista, selo de cera com brasão, chuva de pétalas, filigrana dourada e arco catedral.",
        path: "../templates/royal-luxury.html"
    },
    {
        id: "convite-principal",
        name: "Convite Oficial Clássico (convite.html - Principal)",
        thumbnail: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=400&auto=format&fit=crop",
        description: "Design clássico oficial com brasão dourado, abertura animada, timeline interativa, carrossel de fotos e RSVP integrado.",
        path: "../pages/convite.html"
    },
    {
        id: "modelo-ouro-floral",
        name: "Modelo Ouro Floral (Padrão)",
        thumbnail: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=400&auto=format&fit=crop",
        description: "Design clássico floral dourado com música de fundo, mapa interativo e contagem regressiva.",
        path: "../pages/convite.html"
    },
    {
        id: "minimalist-elegance",
        name: "Minimalist Elegance",
        thumbnail: "https://in.limintso.com/wp-content/uploads/2024/10/Black-and-White-Minimalist-Wedding-Monogram-Logo.png",
        description: "Um design sofisticado com temas escuros, animações suaves e player de música elegante.",
        path: "../templates/minimalist-elegance.html"
    }
];

/**
 * Motor para baixar e renderizar um template preenchendo as variáveis
 * @param {string} templateId - O ID do template (ex: 'minimalist-elegance')
 * @param {object} formData - Os dados do formulário preenchidos no admin
 * @returns {Promise<string>} O HTML final renderizado
 */
window.generateTemplateHtml = async function (templateId, formData) {
    const templateDef = window.templatesCatalog.find(t => t.id === templateId);
    if (!templateDef) throw new Error("Template não encontrado no catálogo.");

    // Baixa o HTML bruto do arquivo do template respectivo
    const response = await fetch(templateDef.path);
    if (!response.ok) throw new Error(`Falha ao carregar o template HTML de ${templateDef.path}`);
    let html = await response.text();

    // Mapeamento de Variáveis Essenciais
    const dateObj = formData.event_date ? new Date(formData.event_date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    const formattedDayMonth = `${dateObj.getDate().toString().padStart(2, '0')} • ${(dateObj.getMonth() + 1).toString().padStart(2, '0')} • ${dateObj.getFullYear()}`;

    // Substituir as variáveis {{CHAVE}} dentro do HTML
    const replaceMap = {
        '{{BRIDE_NAME}}': formData.bride_name || 'Nome da Noiva',
        '{{GROOM_NAME}}': formData.groom_name || 'Nome do Noivo',
        '{{COUPLE_NAMES}}': `${formData.bride_name || 'Noiva'} & ${formData.groom_name || 'Noivo'}`,
        '{{EVENT_TITLE}}': formData.title || 'Nosso Casamento',
        '{{EVENT_DATE_EXTENDED}}': formattedDate.toUpperCase(),
        '{{EVENT_DATE_NUMBERS}}': formattedDayMonth,
        '{{EVENT_TIME}}': formData.event_time || '16H00',
        '{{LOCATION}}': formData.location || 'Local do Evento',
        '{{MUSIC_URL}}': formData.music_url || 'https://in.limintso.com/wp-content/uploads/2025/07/All-for-Love.Michael-Bolton.mp3',
        '{{BIBLE_VERSE}}': formData.bible_verse || 'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha. Tudo sofre, tudo crê, tudo espera, tudo suporta. O amor jamais acaba.',
        '{{BIBLE_REF}}': formData.bible_reference || '1 Coríntios 13:4, 7-8'
    };

    // Replace All occurrences in the string
    for (const [key, val] of Object.entries(replaceMap)) {
        // Usa expressão regular global para substituir todas as ocorrências da variável
        const regex = new RegExp(key, 'g');
        html = html.replace(regex, val);
    }

    return html;
};
