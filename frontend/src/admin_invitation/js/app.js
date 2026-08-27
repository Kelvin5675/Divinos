// ==========================================
// CONFIGURAÇÃO
// ==========================================
let sbClient;
let allOrders = [];
let allInvitations = [];
let invChart = null;
let currentOrderForLinks = null;

const initSupabase = () => {
    if (!sbClient) sbClient = window.supabaseClient;
    return sbClient;
};

const ORDER_STATUS_MAP = {
    new: { label: 'Novo', css: 'background:#FEE2E2;color:#991B1B;' },
    paid: { label: 'Pago', css: 'background:#D1FAE5;color:#065F46;' },
    in_production: { label: 'Produção', css: 'background:#FEF3C7;color:#92400E;' },
    completed: { label: 'Concluído', css: 'background:#E0E7FF;color:#3730A3;' },
    cancelled: { label: 'Cancelado', css: 'background:#F3F4F6;color:#6B7280;' }
};

// ==========================================
// AUTENTICAÇÃO
// ==========================================
async function checkAuth() {
    try {
        initSupabase();
        if (!sbClient) return;
        const { data: { session }, error } = await sbClient.auth.getSession();
        if (error) throw error;
        if (!session) {
            window.location.href = '/admin_invitation/index.html';
            return;
        }
        document.body.style.opacity = '1';
        const email = session.user.email || 'Admin';
        const nameEl = document.getElementById('admin-name');
        if (nameEl) nameEl.textContent = email.split('@')[0];
        
        loadDashboardData();
        setupRealtimeListeners();
    } catch (err) {
        console.error("Auth error:", err);
        window.location.href = '/admin_invitation/index.html';
    }
}

async function logout() {
    initSupabase();
    if (sbClient) await sbClient.auth.signOut();
    window.location.href = '/admin_invitation/index.html';
}

// ==========================================
// NAVEGAÇÃO
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabId}`)?.classList.add('active');
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const section = document.getElementById(tabId);
    if (section) section.classList.add('active');

    const titleEl = document.getElementById('page-title');
    const titles = {'dashboard':'Dashboard','orders':'Pedidos','invitations':'Convites','plans':'Planos','moderation':'Moderação','lp-editor':'Config Site','lp-faq':'FAQ'};
    if (titleEl) titleEl.textContent = titles[tabId] || 'Painel';

    // Load data for each tab
    if (tabId === 'orders') loadOrders();
    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'invitations') loadInvitations();
    if (tabId === 'plans') loadPlans();
    if (tabId === 'moderation') loadModeration();
    if (tabId === 'lp-editor') loadLandingPageSettings();
    if (tabId === 'lp-faq') loadFAQ();
    
    if (window.innerWidth < 768) toggleSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// ==========================================
// BUSCA GLOBAL
// ==========================================
function setupGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    if (!searchInput) return;
    searchInput.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const activeSection = document.querySelector('.section.active').id;
        
        if (activeSection === 'invitations') {
            const filtered = allInvitations.filter(inv => (inv.customer_name||'').toLowerCase().includes(q) || (inv.slug||'').toLowerCase().includes(q));
            renderInvitationsTable(filtered);
        } else if (activeSection === 'orders') {
            const filtered = allOrders.filter(o => (o.couple_names||'').toLowerCase().includes(q) || o.id.includes(q));
            renderOrdersTable(filtered);
        }
    });
}

// ==========================================
// MODAIS
// ==========================================
function showModal(id) { document.getElementById(id)?.classList.add('active'); }
function hideModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ==========================================
// DASHBOARD
// ==========================================
async function loadDashboardData() {
    try {
        const [invRes, ordersRes, plansRes] = await Promise.all([
            sbClient.from('invitations').select('*', { count: 'exact' }),
            sbClient.from('invitation_orders').select('*', { count: 'exact', head: true }),
            sbClient.from('invitation_plans').select('*', { count: 'exact', head: true })
        ]);

        document.getElementById('stat-total-invitations').textContent = invRes.count || 0;
        document.getElementById('stat-total-orders-count').textContent = ordersRes.count || 0;
        document.getElementById('stat-total-plans').textContent = plansRes.count || 0;

        if (invRes.data) {
            renderInvitationsChart(invRes.data);
            renderDashboardInvitationsList(invRes.data.slice(0, 5));
        }
    } catch (e) { console.error(e); }
}

function renderInvitationsChart(invitations) {
    const ctx = document.getElementById('invitationsChart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (invChart) invChart.destroy();
    
    const months = {};
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('pt', { month: 'short' });
        months[key] = 0;
    }
    invitations.forEach(inv => {
        const d = new Date(inv.created_at);
        const key = d.toLocaleString('pt', { month: 'short' });
        if (months.hasOwnProperty(key)) months[key]++;
    });

    invChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(months),
            datasets: [{
                label: 'Convites',
                data: Object.values(months),
                borderColor: '#4C1D95',
                backgroundColor: 'rgba(76, 29, 149, 0.1)',
                borderWidth: 3, tension: 0.4, fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#eee' } }, x: { grid: { display: false } } }
        }
    });
}

function renderDashboardInvitationsList(data) {
    const tbody = document.getElementById('dashboard-invitations-list');
    if (!tbody) return;
    tbody.innerHTML = (data || []).map(inv => `
        <tr>
            <td><strong style="color:var(--jobie-text);">${inv.customer_name || 'N/A'}</strong></td>
            <td>${new Date(inv.created_at).toLocaleDateString()}</td>
            <td><span class="badge ${inv.status === 'active' ? '' : 'badge-inactive'}">${inv.status === 'active' ? 'Público' : 'Privado'}</span></td>
            <td><a href="/invitation/index.html?slug=${inv.slug}" target="_blank" class="btn btn-secondary btn-sm"><i class="fas fa-eye"></i></a></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;padding:2rem;">Nenhum dado.</td></tr>';
}

// ==========================================
// CONVITES
// ==========================================
async function loadInvitations() {
    const tbody = document.getElementById('invitations-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    const { data } = await sbClient.from('invitations').select('*, invitation_plans(name)').order('created_at', { ascending: false });
    allInvitations = data || [];
    renderInvitationsTable(allInvitations);
}

function renderInvitationsTable(data) {
    const tbody = document.getElementById('invitations-table-body');
    if (!tbody) return;
    tbody.innerHTML = data.map(inv => `
        <tr>
            <td><strong style="color:var(--jobie-text);">${inv.customer_name || '—'}</strong></td>
            <td><code style="color:var(--jobie-primary);">${inv.slug}</code></td>
            <td><span class="badge ${inv.status === 'active' ? '' : 'badge-inactive'}">${inv.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-sm" style="background:#f59e0b;color:#fff;" onclick="showInvitationLinks('${inv.id}')" title="Senha & Links"><i class="fas fa-key"></i></button>
                    <a href="/invitation/index.html?slug=${inv.slug}" target="_blank" class="btn btn-secondary btn-sm" title="Ver"><i class="fas fa-eye"></i></a>
                    <button class="btn btn-primary btn-sm" onclick="editInvitation('${inv.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvitation('${inv.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;padding:2rem;">Nenhum convite.</td></tr>';
}

// ==========================================
// PEDIDOS
// ==========================================
async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    const { data } = await sbClient.from('invitation_orders').select('*').order('created_at', { ascending: false });
    allOrders = data || [];
    renderOrdersTable(allOrders);
}

function renderOrdersTable(data) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = data.map(o => {
        const st = ORDER_STATUS_MAP[o.status] || ORDER_STATUS_MAP.new;
        return `
        <tr>
            <td style="font-family:monospace; font-size:0.8rem; color:var(--jobie-text-muted);">#${o.id.substring(0,8)}</td>
            <td><strong style="color:var(--jobie-text);">${o.couple_names || '—'}</strong></td>
            <td>${o.plan_name || '—'}</td>
            <td><span class="badge" style="${st.css}">${st.label}</span></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-secondary btn-sm" onclick="viewOrderDetail('${o.id}')"><i class="fas fa-eye"></i></button>
                    ${!o.invitation_id ? `<button class="btn btn-primary btn-sm" onclick="startCreateInvitation('${o.id}')"><i class="fas fa-magic"></i></button>` : `<button class="btn btn-success btn-sm" onclick="showGeneratedLinks('${o.id}')"><i class="fas fa-link"></i></button>`}
                </div>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;padding:2rem;">Sem pedidos.</td></tr>';
}

async function viewOrderDetail(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    const body = document.getElementById('order-detail-body');
    if (!body) return;
    const st = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.new;
    body.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div class="form-group"><label class="form-label">Noivos</label><div class="form-control">${order.couple_names}</div></div>
            <div class="form-group"><label class="form-label">Estado</label><div class="badge" style="${st.css}">${st.label}</div></div>
            <div class="form-group"><label class="form-label">Data</label><div class="form-control">${order.event_date || '—'}</div></div>
            <div class="form-group"><label class="form-label">Telemóvel</label><div class="form-control">${order.client_phone || '—'}</div></div>
        </div>
        <div class="form-group">
            <label class="form-label">Atualizar Estado</label>
            <select class="form-control" onchange="updateOrderStatus('${order.id}', this.value)">
                ${Object.entries(ORDER_STATUS_MAP).map(([k,v]) => `<option value="${k}" ${order.status===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
        </div>
    `;
    showModal('orderDetailModal');
}

async function updateOrderStatus(id, status) {
    const { error } = await sbClient.from('invitation_orders').update({ status }).eq('id', id);
    if (error) alert(error.message);
    else { loadOrders(); hideModal('orderDetailModal'); }
}

async function startCreateInvitation(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    if (!confirm(`Criar convite para ${order.couple_names}?`)) return;
    
    const slug = (order.couple_names || 'convite').toLowerCase().replace(/&/g, 'e').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    const pwd = Math.random().toString(36).slice(-8).toUpperCase();
    const origin = window.location.origin;
    const guestLink = `https://divinosgraffic.co.mz/c/${slug}`;

    const { data: inv, error } = await sbClient.from('invitations').insert({
        customer_name: order.couple_names,
        slug: slug,
        couple_password: pwd,
        guest_link: guestLink,
        order_id: order.id,
        status: 'active',
        is_public: true
    }).select().single();

    if (error) alert(error.message);
    else {
        await sbClient.from('invitation_orders').update({ invitation_id: inv.id, status: 'in_production' }).eq('id', orderId);
        currentOrderForLinks = { order, inv, pwd };
        document.getElementById('generated-access-code').textContent = pwd;
        document.getElementById('generated-guest-link').value = guestLink;
        document.getElementById('generated-couple-link').value = `${origin}/pages/dashboard-noivos.html`;
        showModal('inviteLinksModal');
        loadOrders();
    }
}

async function showGeneratedLinks(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order || !order.invitation_id) return;
    const { data: inv } = await sbClient.from('invitations').select('*').eq('id', order.invitation_id).single();
    if (!inv) return;
    currentOrderForLinks = { order, inv, pwd: inv.couple_password };
    document.getElementById('generated-access-code').textContent = inv.couple_password || '—';
    document.getElementById('generated-guest-link').value = `https://divinosgraffic.co.mz/c/${inv.slug}`;
    document.getElementById('generated-couple-link').value = `${window.location.origin}/pages/dashboard-noivos.html`;
    showModal('inviteLinksModal');
}

function sendLinksViaWhatsApp() {
    if (!currentOrderForLinks) return;
    const { order, inv, pwd } = currentOrderForLinks;
    const phone = order.client_phone?.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${order.couple_names}! O vosso convite está pronto.\n\n🔗 ${inv.guest_link}\n🔑 Senha: ${pwd}`);
    window.open(`https://wa.me/258${phone || ''}?text=${msg}`, '_blank');
}

// ==========================================
// PLANOS, MODERAÇÃO, FAQ
// ==========================================
async function loadPlans() {
    const tbody = document.getElementById('plans-table-body');
    if (!tbody) return;
    const { data } = await sbClient.from('invitation_plans').select('*');
    tbody.innerHTML = (data || []).map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.price} MT</td><td><button class="btn btn-secondary btn-sm" onclick="editPlan('${p.id}')"><i class="fas fa-edit"></i></button></td></tr>`).join('') || '<tr><td colspan="3">Sem planos.</td></tr>';
}

async function loadModeration() {
    const tbody = document.getElementById('guestbook-table-body');
    if (!tbody) return;
    const { data } = await sbClient.from('wedding_guestbook').select('*');
    tbody.innerHTML = (data || []).map(m => `<tr><td><strong>${m.author_name}</strong></td><td>${m.message}</td><td><button class="btn btn-danger btn-sm" onclick="deleteGuestbook('${m.id}')"><i class="fas fa-trash"></i></button></td></tr>`).join('') || '<tr><td colspan="3">Sem mensagens.</td></tr>';
}
async function loadLandingPageSettings() { /* Logic */ }
async function loadFAQ() {
    const tbody = document.getElementById('faq-table-body');
    if (!tbody) return;
    const { data } = await sbClient.from('invitation_faq').select('*');
    tbody.innerHTML = (data || []).map(f => `<tr><td><strong>${f.question}</strong></td><td>${f.answer}</td><td><button class="btn btn-secondary btn-sm" onclick="editFAQ('${f.id}')"><i class="fas fa-edit"></i></button></td></tr>`).join('') || '<tr><td colspan="3">Sem FAQ.</td></tr>';
}

async function populatePlanSelects() {
    const el = document.getElementById('inv-plan-id');
    if (!el) return;
    const { data } = await sbClient.from('invitation_plans').select('id, name');
    el.innerHTML = '<option value="">Selecionar Plano...</option>' + (data || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

async function deleteInvitation(id) {
    if (!confirm('Deseja eliminar este convite permanentemente?')) return;
    const { error } = await sbClient.from('invitations').delete().eq('id', id);
    if (error) alert(error.message); else loadInvitations();
}

async function showInvitationLinks(invId) {
    const inv = allInvitations.find(i => i.id === invId);
    if (!inv) return;
    currentOrderForLinks = { order: { couple_names: inv.customer_name }, inv, pwd: inv.couple_password };
    document.getElementById('generated-access-code').textContent = inv.couple_password || '—';
    document.getElementById('generated-guest-link').value = `https://divinosgraffic.co.mz/c/${inv.slug}`;
    document.getElementById('generated-couple-link').value = `${window.location.origin}/pages/dashboard-noivos.html`;
    showModal('inviteLinksModal');
}

async function editInvitation(id) {
    const inv = allInvitations.find(i => i.id === id);
    if (!inv) return;
    await populatePlanSelects();
    document.getElementById('inv-id').value = inv.id;
    document.getElementById('inv-customer-name').value = inv.customer_name || '';
    document.getElementById('inv-slug').value = inv.slug || '';
    document.getElementById('inv-plan-id').value = inv.plan_id || '';
    
    // Formatar data para YYYY-MM-DD (necessário para <input type="date">)
    if (inv.event_date) {
        const dateObj = new Date(inv.event_date);
        if (!isNaN(dateObj)) {
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            document.getElementById('inv-event-date').value = `${yyyy}-${mm}-${dd}`;
        } else {
            document.getElementById('inv-event-date').value = '';
        }
    } else {
        document.getElementById('inv-event-date').value = '';
    }
    
    document.getElementById('inv-bride-name').value = inv.bride_name || '';
    document.getElementById('inv-groom-name').value = inv.groom_name || '';
    document.getElementById('inv-bride-parents').value = inv.bride_parents || '';
    document.getElementById('inv-groom-parents').value = inv.groom_parents || '';
    document.getElementById('inv-event-location').value = inv.event_location || '';
    document.getElementById('inv-event-time').value = inv.event_time || '';
    document.getElementById('inv-church-location').value = inv.church_location || '';
    document.getElementById('inv-civil-location').value = inv.civil_location || '';
    document.getElementById('inv-couple-message').value = inv.couple_message || '';
    
    document.getElementById('inv-cover-photo-url').value = inv.cover_photo_url || '';
    document.getElementById('inv-cover-file').value = '';
    
    document.getElementById('inv-align-desktop').value = inv.cover_align_desktop || 50;
    document.getElementById('val-desktop').textContent = (inv.cover_align_desktop || 50) + '%';
    document.getElementById('inv-align-mobile').value = inv.cover_align_mobile || 50;
    document.getElementById('val-mobile').textContent = (inv.cover_align_mobile || 50) + '%';

    // Preview
    setTimeout(() => {
        const previewImg = document.getElementById('cover-preview-img');
        if(inv.cover_photo_url) {
            previewImg.src = inv.cover_photo_url;
            previewImg.style.opacity = 1;
        } else {
            previewImg.style.opacity = 0;
        }
        document.getElementById('btn-preview-desktop').click();
    }, 100);

    document.getElementById('inv-music-url').value = inv.music_url || '';
    document.getElementById('inv-music-file').value = '';
    
    document.getElementById('inv-gallery-urls').value = (inv.gallery_urls && Array.isArray(inv.gallery_urls)) ? inv.gallery_urls.join(', ') : '';
    document.getElementById('inv-gallery-files').value = '';

    document.getElementById('inv-editor-type').value = inv.editor_type || 'template';
    document.getElementById('inv-custom-html').value = inv.custom_html || '';
    toggleCodeEditor();
    showModal('invitationModal');
}

window.createNewInvitation = async function() {
    await populatePlanSelects();
    document.getElementById('invitation-form').reset();
    document.getElementById('inv-id').value = '';
    document.getElementById('inv-cover-file').value = '';
    document.getElementById('inv-music-file').value = '';
    document.getElementById('inv-gallery-files').value = '';
    toggleCodeEditor();
    showModal('invitationModal');
}

function setupForms() {
    document.getElementById('invitation-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const id = document.getElementById('inv-id').value;
            const slug = document.getElementById('inv-slug').value;

            // Função helper para upload
            async function uploadFile(file, folder) {
                const ext = file.name.split('.').pop();
                const path = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const { error: uploadError } = await sbClient.storage.from('invitations').upload(path, file);
                if (uploadError) {
                    if (uploadError.message.toLowerCase().includes('bucket')) {
                        throw new Error("O bucket 'invitations' não existe! Por favor crie um Storage Bucket público chamado 'invitations' no Supabase.");
                    }
                    throw uploadError;
                }
                const { data } = sbClient.storage.from('invitations').getPublicUrl(path);
                return data.publicUrl;
            }

            let coverUrl = document.getElementById('inv-cover-photo-url').value;
            const coverFile = document.getElementById('inv-cover-file').files[0];
            if (coverFile) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A enviar capa...';
                coverUrl = await uploadFile(coverFile, slug);
            }

            let musicUrl = document.getElementById('inv-music-url').value;
            const musicFile = document.getElementById('inv-music-file').files[0];
            if (musicFile) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A enviar música...';
                musicUrl = await uploadFile(musicFile, slug);
            }

            let galleryUrlsText = document.getElementById('inv-gallery-urls').value;
            let finalGallery = null;
            const galleryFiles = document.getElementById('inv-gallery-files').files;
            
            if (galleryFiles && galleryFiles.length > 0) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A enviar galeria...';
                let urls = [];
                for (let i = 0; i < galleryFiles.length; i++) {
                    const gUrl = await uploadFile(galleryFiles[i], `${slug}/gallery`);
                    urls.push(gUrl);
                }
                finalGallery = urls;
            } else if (galleryUrlsText) {
                finalGallery = galleryUrlsText.split(',').map(s => s.trim()).filter(Boolean);
            }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar dados...';

            const data = {
                customer_name: document.getElementById('inv-customer-name').value,
                slug: slug,
                plan_id: document.getElementById('inv-plan-id').value || null,
                event_date: document.getElementById('inv-event-date').value || null,
                bride_name: document.getElementById('inv-bride-name').value || null,
                groom_name: document.getElementById('inv-groom-name').value || null,
                bride_parents: document.getElementById('inv-bride-parents').value || null,
                groom_parents: document.getElementById('inv-groom-parents').value || null,
                event_location: document.getElementById('inv-event-location').value || null,
                event_time: document.getElementById('inv-event-time').value || null,
                church_location: document.getElementById('inv-church-location').value || null,
                civil_location: document.getElementById('inv-civil-location').value || null,
                couple_message: document.getElementById('inv-couple-message').value || null,
                cover_photo_url: coverUrl || null,
                cover_align_desktop: document.getElementById('inv-align-desktop').value !== "" ? parseInt(document.getElementById('inv-align-desktop').value) : 50,
                cover_align_mobile: document.getElementById('inv-align-mobile').value !== "" ? parseInt(document.getElementById('inv-align-mobile').value) : 50,
                music_url: musicUrl || null,
                gallery_urls: finalGallery,
                editor_type: document.getElementById('inv-editor-type').value,
                custom_html: document.getElementById('inv-custom-html').value || null
            };

            console.log('DEBUG SALVAMENTO:', data);

            if (id) {
                const { error } = await sbClient.from('invitations').update(data).eq('id', id);
                if (error) throw error;
            } else {
                // Gerar sufixo único para evitar slug duplicado
                const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(-4);
                data.slug = data.slug ? `${data.slug}-${uniqueSuffix}` : uniqueSuffix;
                const pwd = Math.random().toString(36).slice(-8).toUpperCase();
                data.couple_password = pwd;
                data.status = 'active';
                data.is_public = true;
                data.guest_link = `https://divinosgraffic.co.mz/c/${data.slug}`;
                const { error } = await sbClient.from('invitations').insert([data]);
                if (error) throw error;
            }

            hideModal('invitationModal');
            loadInvitations();
        } catch (error) {
            alert('Erro ao guardar: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Guardar';
        }
    });
}

function setupRealtimeListeners() {
    sbClient.channel('any').on('postgres_changes', { event: '*', schema: 'public' }, () => {
        const active = document.querySelector('.section.active').id;
        if (active === 'dashboard') loadDashboardData();
        if (active === 'orders') loadOrders();
    }).subscribe();
}

function setupCoverPreview() {
    const urlInput = document.getElementById('inv-cover-photo-url');
    const fileInput = document.getElementById('inv-cover-file');
    const previewImg = document.getElementById('cover-preview-img');
    const previewBox = document.getElementById('cover-preview-box');
    
    const sliderDesktop = document.getElementById('inv-align-desktop');
    const sliderMobile = document.getElementById('inv-align-mobile');
    const valDesktop = document.getElementById('val-desktop');
    const valMobile = document.getElementById('val-mobile');
    
    const btnDesktop = document.getElementById('btn-preview-desktop');
    const btnMobile = document.getElementById('btn-preview-mobile');
    
    let isMobileView = false;

    function updatePreviewImage() {
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.opacity = 1;
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else if (urlInput.value) {
            previewImg.src = urlInput.value;
            previewImg.style.opacity = 1;
        } else {
            previewImg.style.opacity = 0;
        }
    }

    function updateObjectPosition() {
        if (isMobileView) {
            previewImg.style.objectPosition = `50% ${sliderMobile.value}%`;
        } else {
            previewImg.style.objectPosition = `50% ${sliderDesktop.value}%`;
        }
    }

    urlInput.addEventListener('input', updatePreviewImage);
    fileInput.addEventListener('change', updatePreviewImage);

    sliderDesktop.addEventListener('input', (e) => {
        valDesktop.textContent = e.target.value + '%';
        updateObjectPosition();
    });

    sliderMobile.addEventListener('input', (e) => {
        valMobile.textContent = e.target.value + '%';
        updateObjectPosition();
    });

    btnDesktop.addEventListener('click', () => {
        isMobileView = false;
        btnDesktop.className = 'btn btn-primary';
        btnMobile.className = 'btn btn-light';
        btnMobile.style.border = '1px solid #ddd';
        document.getElementById('slider-container-desktop').style.display = 'block';
        document.getElementById('slider-container-mobile').style.display = 'none';
        
        previewBox.style.height = '200px';
        previewBox.style.width = '100%';
        updateObjectPosition();
    });

    btnMobile.addEventListener('click', () => {
        isMobileView = true;
        btnMobile.className = 'btn btn-primary';
        btnDesktop.className = 'btn btn-light';
        btnDesktop.style.border = '1px solid #ddd';
        document.getElementById('slider-container-mobile').style.display = 'block';
        document.getElementById('slider-container-desktop').style.display = 'none';
        
        previewBox.style.height = '350px';
        previewBox.style.width = '200px';
        previewBox.style.margin = '0 auto';
        updateObjectPosition();
    });
}


function toggleCodeEditor() {
    const type = document.getElementById('inv-editor-type').value;
    const editor = document.getElementById('code-editor-container');
    if(editor) editor.style.display = type === 'manual' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupForms();
    setupGlobalSearch();
    setupCoverPreview();
});

// EXPORTS
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.toggleCodeEditor = toggleCodeEditor;
window.logout = logout;
window.loadOrders = loadOrders;
window.viewOrderDetail = viewOrderDetail;
window.updateOrderStatus = updateOrderStatus;
window.startCreateInvitation = startCreateInvitation;
window.showGeneratedLinks = showGeneratedLinks;
window.sendLinksViaWhatsApp = sendLinksViaWhatsApp;
window.editInvitation = editInvitation;
window.deleteInvitation = deleteInvitation;
window.showInvitationLinks = showInvitationLinks;
window.populatePlanSelects = populatePlanSelects;
window.showModal = showModal;
window.hideModal = hideModal;
