// ==========================================
// CONFIGURAÇÃO
// ==========================================
let sbClient;
let allOrders = [];
let allInvitations = [];
let invChart = null;
let currentOrderForLinks = null;

// Love Story Helpers
window.loveStoryChapters = [];

// Programa / Cronograma Multi-Dias Helpers
window.eventProgramSteps = [];

window.renderProgramSteps = function() {
    const container = document.getElementById('program-steps-list');
    if (!container) return;
    
    if (!window.eventProgramSteps || window.eventProgramSteps.length === 0) {
        container.innerHTML = '<p style="color:#999; font-size:0.85rem; text-align:center; padding:0.5rem 0;">Nenhuma etapa configurada. Clique em "Preencher Padrão" ou adicione uma nova etapa.</p>';
        return;
    }
    
    container.innerHTML = window.eventProgramSteps.map((st, i) => `
        <div style="background:#fff; border:1px solid #ddd; border-radius:10px; padding:0.85rem; position:relative; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; padding-right:2rem;">
                <span style="font-weight:700; color:var(--jobie-primary); font-size:0.85rem;">
                    <i class="fas fa-calendar-day"></i> Etapa ${i + 1}
                </span>
                <button type="button" class="btn btn-danger btn-sm" style="position:absolute; top:0.5rem; right:0.5rem; padding:0.2rem 0.5rem;" onclick="removeProgramStep(${i})" title="Remover Etapa"><i class="fas fa-trash"></i></button>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-bottom:0.5rem;">
                <div>
                    <label class="form-label" style="font-size:0.75rem; margin-bottom:2px;">Dia / Fase (ex: Sexta-Feira)</label>
                    <input type="text" class="form-control form-control-sm" value="${st.day || ''}" placeholder="Ex: Sexta-Feira" onchange="updateProgramStep(${i}, 'day', this.value)">
                </div>
                <div>
                    <label class="form-label" style="font-size:0.75rem; margin-bottom:2px;">Data (ex: 06 Nov)</label>
                    <input type="text" class="form-control form-control-sm" value="${st.date || ''}" placeholder="Ex: 06 Nov" onchange="updateProgramStep(${i}, 'date', this.value)">
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:0.5rem; margin-bottom:0.5rem;">
                <div>
                    <label class="form-label" style="font-size:0.75rem; margin-bottom:2px;">Título do Evento (ex: Lobolo Tradicional)</label>
                    <input type="text" class="form-control form-control-sm" value="${st.title || ''}" placeholder="Ex: Lobolo Tradicional" onchange="updateProgramStep(${i}, 'title', this.value)">
                </div>
                <div>
                    <label class="form-label" style="font-size:0.75rem; margin-bottom:2px;">Horário (ex: 10:00)</label>
                    <input type="text" class="form-control form-control-sm" value="${st.time || ''}" placeholder="Ex: 10:00" onchange="updateProgramStep(${i}, 'time', this.value)">
                </div>
            </div>

            <div class="form-group" style="margin-bottom:0.5rem;">
                <label class="form-label" style="font-size:0.75rem; margin-bottom:2px;">Localização (ex: Residência da Noiva, Matola)</label>
                <input type="text" class="form-control form-control-sm" value="${st.location || ''}" placeholder="Ex: Residência da Noiva, Bairro do Fomento" onchange="updateProgramStep(${i}, 'location', this.value)">
            </div>

            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:0.75rem; margin-bottom:2px;">Descrição Curta / Observação</label>
                <textarea class="form-control form-control-sm" rows="2" placeholder="Breve nota sobre a celebração..." onchange="updateProgramStep(${i}, 'description', this.value)">${st.description || ''}</textarea>
            </div>
        </div>
    `).join('');
};

window.addProgramStep = function() {
    window.eventProgramSteps.push({
        day: 'Dia ' + (window.eventProgramSteps.length + 1),
        date: '',
        title: '',
        time: '',
        location: '',
        description: ''
    });
    window.renderProgramSteps();
};

window.removeProgramStep = function(index) {
    if (confirm('Tem a certeza que deseja remover esta etapa do cronograma?')) {
        window.eventProgramSteps.splice(index, 1);
        window.renderProgramSteps();
    }
};

window.updateProgramStep = function(index, field, value) {
    if (window.eventProgramSteps[index]) {
        window.eventProgramSteps[index][field] = value;
    }
};

window.loadDefaultProgramSteps = function() {
    window.eventProgramSteps = [
        {
            day: 'Sexta-Feira',
            date: '06 Nov',
            title: 'Lobolo Tradicional',
            time: '10:00',
            location: 'Residência da Família da Noiva, Matola',
            description: 'Cerimónia tradicional de entrega do dote, união dos clãs e bênçãos familiares.'
        },
        {
            day: 'Sábado',
            date: '07 Nov',
            title: 'Casamento Religioso & Civil',
            time: '14:00',
            location: 'Catedral de São Paulo & Quinta Santo António',
            description: 'Celebração solene do matrimónio, bênção sagrada e banquete nobre de celebração.'
        },
        {
            day: 'Domingo',
            date: '08 Nov',
            title: 'Xiguiane & Agradecimento',
            time: '12:00',
            location: 'Residência dos Pais do Noivo',
            description: 'Tradicional almoço de confraternização, entrega de presentes à nova família e encerramento.'
        }
    ];
    window.renderProgramSteps();
};

function updateProgramSwitchUI(checked) {
    const slider = document.getElementById('program-switch-slider');
    const knob = document.getElementById('program-switch-knob');
    const details = document.getElementById('program-editor-details');
    if (!slider || !knob) return;
    if (checked) {
        slider.style.backgroundColor = '#c5a059';
        knob.style.left = '26px';
        if (details) details.style.display = 'block';
    } else {
        slider.style.backgroundColor = '#ccc';
        knob.style.left = '4px';
        if (details) details.style.display = 'none';
    }
}

// ════════════════════════════════════════════════════════════════
// GESTÃO AVANÇADA DA GALERIA (NOSSOS MOMENTOS): PREVIEWS, ENQUADRAMENTO E EXCLUSÃO
// ════════════════════════════════════════════════════════════════
window.adminGalleryItems = [];

window.renderAdminGalleryThumbnails = function() {
    const container = document.getElementById('admin-gallery-thumbnails');
    const badge = document.getElementById('gallery-count-badge');
    if (!container) return;

    if (badge) {
        badge.textContent = `${window.adminGalleryItems.length} foto${window.adminGalleryItems.length === 1 ? '' : 's'}`;
    }

    if (!window.adminGalleryItems || window.adminGalleryItems.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 24px 12px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 10px; color: #94a3b8; font-size: 0.85rem;">
                <i class="fas fa-images" style="font-size: 1.5rem; margin-bottom: 6px; display: block; color: #cbd5e1;"></i>
                Nenhuma foto na galeria ainda. Selecione fotos acima ou cole links.
            </div>
        `;
        return;
    }

    container.innerHTML = window.adminGalleryItems.map((item) => {
        const align = typeof item.align_y !== 'undefined' ? item.align_y : 50;
        return `
            <div class="gallery-thumb-card" id="thumb-card-${item.id}">
                <div class="gallery-thumb-img-wrapper">
                    <img src="${item.url}" class="gallery-thumb-img" id="thumb-img-${item.id}" style="object-position: center ${align}%;" loading="lazy">
                    <button type="button" class="thumb-delete-btn" onclick="removeAdminGalleryItem('${item.id}')" title="Apagar Foto">&times;</button>
                </div>
                <div class="thumb-crop-control">
                    <div class="thumb-crop-label">
                        <span><i class="fas fa-arrows-alt-v"></i> Foco</span>
                        <span id="thumb-align-val-${item.id}" style="color:#c5a059;">${align}%</span>
                    </div>
                    <input type="range" min="0" max="100" value="${align}" class="thumb-crop-slider" oninput="updateAdminGalleryAlign('${item.id}', this.value)" title="Ajuste para não cortar o casal">
                </div>
            </div>
        `;
    }).join('');
};

window.handleAdminGalleryFilesSelected = function(event) {
    const files = event.target.files;
    if (!files || !files.length) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewUrl = URL.createObjectURL(file);
        window.adminGalleryItems.push({
            id: 'gal-file-' + Date.now() + '-' + Math.random().toString(36).substring(7),
            url: previewUrl,
            file: file,
            align_y: 50
        });
    }

    window.renderAdminGalleryThumbnails();
    event.target.value = '';
};

window.handleAdminGalleryUrlEnter = function(event) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const input = event.target;
        const text = input.value.trim();
        if (!text) return;

        const links = text.split(',').map(s => s.trim()).filter(Boolean);
        links.forEach(url => {
            if (url) {
                window.adminGalleryItems.push({
                    id: 'gal-url-' + Date.now() + '-' + Math.random().toString(36).substring(7),
                    url: url,
                    file: null,
                    align_y: 50
                });
            }
        });

        input.value = '';
        window.renderAdminGalleryThumbnails();
    }
};

window.removeAdminGalleryItem = function(id) {
    window.adminGalleryItems = window.adminGalleryItems.filter(item => item.id !== id);
    window.renderAdminGalleryThumbnails();
};

window.updateAdminGalleryAlign = function(id, value) {
    const val = parseInt(value);
    const item = window.adminGalleryItems.find(it => it.id === id);
    if (item) {
        item.align_y = val;
    }
    const valSpan = document.getElementById(`thumb-align-val-${id}`);
    if (valSpan) valSpan.textContent = `${val}%`;
    const img = document.getElementById(`thumb-img-${id}`);
    if (img) img.style.objectPosition = `center ${val}%`;
};

// ════════════════════════════════════════════════════════════════
// GESTÃO DO LOVE STORY (A NOSSA HISTÓRIA): COM PREVIEWS, BOTÃO X E ENQUADRAMENTO
// ════════════════════════════════════════════════════════════════
window.renderLoveStoryChapters = function() {
    const container = document.getElementById('love-story-chapters');
    if (!container) return;
    
    if (window.loveStoryChapters.length === 0) {
        container.innerHTML = '<p style="color:#999; font-size:0.85rem; text-align:center;">Nenhum capítulo adicionado. Clique abaixo para iniciar a história!</p>';
        return;
    }
    
    container.innerHTML = window.loveStoryChapters.map((ch, i) => {
        const align = (typeof ch.photo_align !== 'undefined' && ch.photo_align !== null) ? ch.photo_align : 50;
        const hasPhoto = !!ch.photo_url;

        return `
        <div style="background:#fff; border:1px solid #ddd; border-radius:10px; padding:1.2rem; position:relative; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:0.75rem;">
            <button type="button" class="btn btn-danger btn-sm" style="position:absolute; top:0.6rem; right:0.6rem; padding: 0.25rem 0.6rem;" onclick="removeLoveStoryChapter(${i})" title="Remover Capítulo"><i class="fas fa-trash"></i></button>
            
            <div class="form-group" style="margin-bottom:0.75rem; padding-right:2rem;">
                <label class="form-label" style="font-size:0.8rem; font-weight:600;">Título do Capítulo (ex: Onde tudo começou)</label>
                <input type="text" class="form-control ls-title" value="${ch.title || ''}" onchange="updateLoveStoryChapter(${i}, 'title', this.value)" placeholder="Título do momento...">
            </div>

            <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" style="font-size:0.8rem; font-weight:600;">Fotografia do Capítulo</label>
                
                ${hasPhoto ? `
                    <div style="display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap; margin-bottom:0.5rem;">
                        <div class="lovestory-photo-preview-box">
                            <img src="${ch.photo_url}" class="lovestory-preview-img" id="ls-preview-img-${i}" style="object-position: center ${align}%;">
                            <button type="button" class="thumb-delete-btn" onclick="removeLoveStoryPhoto(${i})" title="Apagar Foto">&times;</button>
                        </div>
                        <div style="flex:1; min-width:200px; display:flex; flex-direction:column; gap:6px; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
                            <label style="font-size:0.75rem; font-weight:600; color:#475569; display:flex; justify-content:space-between;">
                                <span><i class="fas fa-arrows-alt-v"></i> Enquadramento Vertical</span>
                                <span id="ls-align-val-${i}" style="color:#c5a059; font-weight:700;">${align}%</span>
                            </label>
                            <input type="range" min="0" max="100" value="${align}" class="thumb-crop-slider" oninput="updateLoveStoryPhotoAlign(${i}, this.value)" style="width:100%;">
                            <small style="font-size:0.7rem; color:#64748b;">0% = Topo | 50% = Centro | 100% = Base</small>
                            <div style="display:flex; gap:6px; margin-top:4px;">
                                <button type="button" class="btn btn-light btn-sm" style="font-size:0.7rem; padding:2px 8px;" onclick="updateLoveStoryPhotoAlign(${i}, 0)">Topo</button>
                                <button type="button" class="btn btn-light btn-sm" style="font-size:0.7rem; padding:2px 8px;" onclick="updateLoveStoryPhotoAlign(${i}, 50)">Centro</button>
                                <button type="button" class="btn btn-light btn-sm" style="font-size:0.7rem; padding:2px 8px;" onclick="updateLoveStoryPhotoAlign(${i}, 100)">Base</button>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <input type="text" class="form-control ls-photo" style="flex:1; min-width:180px;" value="" onchange="updateLoveStoryChapter(${i}, 'photo_url', this.value)" placeholder="Cole o link da foto...">
                        <input type="file" class="form-control" accept="image/*" onchange="uploadLoveStoryPhoto(event, ${i})" style="max-width: 220px;">
                    </div>
                `}
            </div>

            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:0.8rem; font-weight:600;">Descrição (História do momento)</label>
                <textarea class="form-control ls-text" rows="2" onchange="updateLoveStoryChapter(${i}, 'text', this.value)" placeholder="Conte um pouco sobre este momento especial...">${ch.text || ''}</textarea>
            </div>
        </div>
        `;
    }).join('');
};

window.removeLoveStoryPhoto = function(index) {
    if (window.loveStoryChapters[index]) {
        window.loveStoryChapters[index].photo_url = '';
        window.renderLoveStoryChapters();
    }
};

window.updateLoveStoryPhotoAlign = function(index, value) {
    const val = parseInt(value);
    if (window.loveStoryChapters[index]) {
        window.loveStoryChapters[index].photo_align = val;
    }
    const valSpan = document.getElementById(`ls-align-val-${index}`);
    if (valSpan) valSpan.textContent = `${val}%`;
    const img = document.getElementById(`ls-preview-img-${index}`);
    if (img) img.style.objectPosition = `center ${val}%`;
};

window.addLoveStoryChapter = function() {
    window.loveStoryChapters.push({ title: '', photo_url: '', text: '', photo_align: 50 });
    window.renderLoveStoryChapters();
};

window.removeLoveStoryChapter = function(index) {
    if(confirm('Tem a certeza que deseja remover este capítulo?')) {
        window.loveStoryChapters.splice(index, 1);
        window.renderLoveStoryChapters();
    }
};

window.updateLoveStoryChapter = function(index, field, value) {
    if (window.loveStoryChapters[index]) {
        window.loveStoryChapters[index][field] = value;
    }
};

window.uploadLoveStoryPhoto = async function(event, index) {
    const file = event.target.files[0];
    if (!file) return;
    
    let slug = document.getElementById('inv-slug')?.value || 'new_invitation';
    
    try {
        const statusSpan = document.createElement('span');
        statusSpan.className = 'upload-status';
        statusSpan.style = 'font-size:0.75rem; color:#666; margin-top:0.25rem; display:block;';
        statusSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A enviar foto...';
        event.target.parentElement.appendChild(statusSpan);
        
        const ext = file.name.split('.').pop();
        const path = `${slug}/lovestory_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await window.supabaseClient.storage.from('invitations').upload(path, file);
        if (uploadError) throw uploadError;
        
        const { data } = window.supabaseClient.storage.from('invitations').getPublicUrl(path);
        
        window.loveStoryChapters[index].photo_url = data.publicUrl;
        window.loveStoryChapters[index].photo_align = 50;
        window.renderLoveStoryChapters();
    } catch (err) {
        console.error("Erro no upload:", err);
        alert("Falha ao enviar fotografia: " + err.message);
        
        const status = event.target.parentElement.querySelector('.upload-status');
        if(status) status.remove();
    }
};

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
    
    if (window.innerWidth <= 992) closeSidebar();
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
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
    
    let slug = (order.couple_names || 'convite').toLowerCase().replace(/&/g, 'e').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slug) slug = 'convite';
    
    // Check for duplicates
    const { data: existingSlug } = await sbClient.from('invitations').select('id').eq('slug', slug).maybeSingle();
    if (existingSlug) {
        slug = `${slug}-${Math.random().toString(36).slice(-4)}`;
    }
    
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
        renderInviteLinksModal(order, inv, pwd);
        loadOrders();
    }
}

// ── Centralizador dos Links de Convite nos Dois Domínios ──
function renderInviteLinksModal(order, inv, pwd) {
    const coupleNames = order?.couple_names || inv?.customer_name || 'Noivos';
    const clientPhone = order?.client_phone || '';
    currentOrderForLinks = { order: { couple_names: coupleNames, client_phone: clientPhone }, inv, pwd };
    const slug = inv?.slug || '';
    
    // Domínio Principal (DirectAdmin)
    const mainGuest = `https://divinosgraffic.co.mz/c/${slug}`;
    const mainCouple = `https://divinosgraffic.co.mz/pages/dashboard-noivos.html`;
    
    // Domínio Reserva (Vercel Cloud)
    const backupGuest = `https://divinos.vercel.app/c/${slug}`;
    const backupCouple = `https://divinos.vercel.app/pages/dashboard-noivos.html`;

    // Atualizar Código de Acesso Único
    const codeEl = document.getElementById('generated-access-code');
    if (codeEl) codeEl.textContent = pwd || '—';

    // Domínio Principal
    const gMain = document.getElementById('generated-guest-link-main');
    if (gMain) gMain.value = mainGuest;
    const cMain = document.getElementById('generated-couple-link-main');
    if (cMain) cMain.value = mainCouple;

    // Domínio Reserva
    const gBackup = document.getElementById('generated-guest-link-backup');
    if (gBackup) gBackup.value = backupGuest;
    const cBackup = document.getElementById('generated-couple-link-backup');
    if (cBackup) cBackup.value = backupCouple;

    // Manter IDs legados compatíveis com scripts existentes
    const gOld = document.getElementById('generated-guest-link');
    if (gOld) gOld.value = mainGuest;
    const cOld = document.getElementById('generated-couple-link');
    if (cOld) cOld.value = `${window.location.origin}/pages/dashboard-noivos.html`;

    showModal('inviteLinksModal');
}

function copyInputText(elementId, btnElement) {
    const input = document.getElementById(elementId);
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
        if (btnElement) {
            const originalHtml = btnElement.innerHTML;
            btnElement.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            btnElement.style.background = '#059669';
            btnElement.style.borderColor = '#059669';
            btnElement.style.color = '#fff';
            setTimeout(() => {
                btnElement.innerHTML = originalHtml;
                btnElement.style.background = '';
                btnElement.style.borderColor = '';
                btnElement.style.color = '';
            }, 2000);
        }
    }).catch(err => {
        alert('Erro ao copiar link: ' + err);
    });
}

function copyAccessCode(btnElement) {
    const code = currentOrderForLinks?.pwd || document.getElementById('generated-access-code')?.textContent?.trim();
    if (!code || code === '—') return;
    navigator.clipboard.writeText(code).then(() => {
        if (btnElement) {
            const originalHtml = btnElement.innerHTML;
            btnElement.innerHTML = '<i class="fas fa-check"></i> Senha Copiada!';
            btnElement.style.background = '#059669';
            btnElement.style.borderColor = '#059669';
            btnElement.style.color = '#fff';
            setTimeout(() => {
                btnElement.innerHTML = originalHtml;
                btnElement.style.background = '';
                btnElement.style.borderColor = '';
                btnElement.style.color = '';
            }, 2000);
        }
    });
}

async function showGeneratedLinks(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order || !order.invitation_id) return;
    const { data: inv } = await sbClient.from('invitations').select('*').eq('id', order.invitation_id).single();
    if (!inv) return;
    renderInviteLinksModal(order, inv, inv.couple_password);
}

function sendLinksViaWhatsApp(targetType = 'couple') {
    if (!currentOrderForLinks) return;
    const { order, inv, pwd } = currentOrderForLinks;
    const phone = order?.client_phone?.replace(/\D/g, '') || '';
    const coupleName = order?.couple_names || inv?.customer_name || 'Noivos';
    const slug = inv?.slug || '';

    let msg = '';
    if (targetType === 'guests') {
        msg = `💍 *Convite de Casamento de ${coupleName}*\n\n` +
              `Com imensa alegria, convidamos você para celebrar este momento especial connosco!\n\n` +
              `✨ *Acesse o nosso convite digital interativo:*\n` +
              `👉 https://divinosgraffic.co.mz/c/${slug}\n\n` +
              `_(Link alternativo/reserva: https://divinos.vercel.app/c/${slug})_`;
    } else {
        msg = `Olá *${coupleName}*! O vosso Convite Digital Divinos está pronto com sucesso! 🎉\n\n` +
              `👑 *PAINEL DE CONTROLE DOS NOIVOS:*\n` +
              `🔗 https://divinosgraffic.co.mz/pages/dashboard-noivos.html\n` +
              `_(Link reserva: https://divinos.vercel.app/pages/dashboard-noivos.html)_\n` +
              `🔑 *Código de Acesso / Senha Única:* ${pwd}\n\n` +
              `💌 *LINK DO CONVITE PARA ENVIAR AOS CONVIDADOS:*\n` +
              `👉 https://divinosgraffic.co.mz/c/${slug}\n` +
              `_(Link reserva com foto: https://divinos.vercel.app/c/${slug})_\n\n` +
              `Desejamos as maiores felicidades do mundo ao casal! ✨`;
    }
    window.open(`https://wa.me/258${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ==========================================
// PLANOS, MODERAÇÃO, FAQ
// ==========================================
async function loadPlans() {
    const tbody = document.getElementById('plans-table-body');
    if (!tbody) return;
    const { data } = await sbClient.from('invitation_plans').select('*');
    window.allPlans = data || [];
    tbody.innerHTML = (data || []).map(p => `<tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.price} MT</td>
        <td>
            <button class="btn btn-secondary btn-sm" onclick="editPlan('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deletePlan('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    </tr>`).join('') || '<tr><td colspan="3">Sem planos.</td></tr>';
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
    renderInviteLinksModal({ couple_names: inv.customer_name, client_phone: '' }, inv, inv.couple_password);
}

async function editInvitation(id) {
    const inv = allInvitations.find(i => i.id === id);
    if (!inv) return;
    window.currentEditInv = inv;
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
    document.getElementById('inv-event-map-url').value = inv.event_map_url || '';
    document.getElementById('inv-church-location').value = inv.church_location || '';
    document.getElementById('inv-church-time').value = inv.church_time || '';
    document.getElementById('inv-church-map-url').value = inv.church_map_url || '';
    document.getElementById('inv-civil-location').value = inv.civil_location || '';
    document.getElementById('inv-civil-time').value = inv.civil_time || '';
    document.getElementById('inv-civil-map-url').value = inv.civil_map_url || '';
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
    
    document.getElementById('inv-gallery-urls').value = '';
    document.getElementById('inv-gallery-files').value = '';

    // Extrair galeria do banco de dados (array ou JSON string ou CSV)
    let initialGallery = [];
    if (inv.gallery_urls) {
        if (Array.isArray(inv.gallery_urls)) {
            initialGallery = inv.gallery_urls;
        } else if (typeof inv.gallery_urls === 'string') {
            try { initialGallery = JSON.parse(inv.gallery_urls); }
            catch(e) { initialGallery = inv.gallery_urls.split(',').map(s => s.trim()).filter(Boolean); }
        }
    }

    let dbEditorType = inv.editor_type || 'template';
    let dbAnimation = 'palace';
    let dbTemplateId = 'modelo-ouro-floral';
    let dbPetals = true;
    let dbRings = true;
    if (dbEditorType.includes(',')) {
        const parts = dbEditorType.split(',');
        dbEditorType = parts[0];
        dbAnimation = parts[1];
        if (parts[2]) dbTemplateId = parts[2];
        if (parts[3]) dbPetals = parts[3] !== 'no-petals';
    }

    document.getElementById('inv-editor-type').value = dbEditorType;
    document.getElementById('inv-custom-html').value = inv.custom_html || '';
    document.getElementById('inv-opening-animation').value = dbAnimation;
    if (document.getElementById('inv-template-id')) {
        document.getElementById('inv-template-id').value = dbTemplateId;
    }
    
    // Love Story, Galeria & configurações adicionais - buscar da invitations_details
    try {
        const { data: detData } = await sbClient.from('invitations_details').select('tables_layout').eq('invitation_id', inv.id).single();
        const tl = detData && detData.tables_layout ? detData.tables_layout : {};
        window.loveStoryChapters = tl.love_story || [];
        
        // Sagrada Escritura (Versículo e Referência Bíblica)
        const bibleVerse = tl.bible_verse || inv.bible_verse || '';
        const bibleRef = tl.bible_reference || inv.bible_reference || '';
        if (document.getElementById('inv-bible-verse')) document.getElementById('inv-bible-verse').value = bibleVerse;
        if (document.getElementById('inv-bible-reference')) document.getElementById('inv-bible-reference').value = bibleRef;

        // Carregar Galeria com Miniaturas e Enquadramentos
        const gAligns = (tl && tl.gallery_aligns && Array.isArray(tl.gallery_aligns)) ? tl.gallery_aligns : [];
        window.adminGalleryItems = initialGallery.map((url, idx) => ({
            id: 'gal-saved-' + idx + '-' + Date.now(),
            url: typeof url === 'string' ? url : (url.url || ''),
            file: null,
            align_y: typeof url === 'object' && url.align_y ? url.align_y : (gAligns[idx] ?? 50)
        }));

        if (typeof tl.petals_enabled !== 'undefined') {
            dbPetals = !!tl.petals_enabled;
        }
        if (typeof tl.rings_enabled !== 'undefined') {
            dbRings = !!tl.rings_enabled;
        }
        let dbProgram = true;
        if (typeof tl.program_enabled !== 'undefined') {
            dbProgram = !!tl.program_enabled;
        }
        window.eventProgramSteps = Array.isArray(tl.event_program) && tl.event_program.length > 0 ? tl.event_program : [];
        if (window.eventProgramSteps.length === 0 && dbProgram) {
            window.loadDefaultProgramSteps();
        } else {
            window.renderProgramSteps();
        }
        const programCheckbox = document.getElementById('inv-program-enabled');
        if (programCheckbox) {
            programCheckbox.checked = dbProgram;
            updateProgramSwitchUI(dbProgram);
        }

        if (tl.civil_time) document.getElementById('inv-civil-time').value = tl.civil_time;
        if (tl.civil_map_url) document.getElementById('inv-civil-map-url').value = tl.civil_map_url;
        if (tl.church_time) document.getElementById('inv-church-time').value = tl.church_time;
        if (tl.church_map_url) document.getElementById('inv-church-map-url').value = tl.church_map_url;
        if (tl.event_map_url) document.getElementById('inv-event-map-url').value = tl.event_map_url;
    } catch(e) {
        window.loveStoryChapters = [];
        window.eventProgramSteps = [];
        window.adminGalleryItems = initialGallery.map((url, idx) => ({
            id: 'gal-saved-' + idx + '-' + Date.now(),
            url: typeof url === 'string' ? url : (url.url || ''),
            file: null,
            align_y: 50
        }));
    }
    if(typeof renderLoveStoryChapters === 'function') renderLoveStoryChapters();
    if(typeof renderAdminGalleryThumbnails === 'function') renderAdminGalleryThumbnails();

    const petalsCheckbox = document.getElementById('inv-petals-enabled');
    if (petalsCheckbox) {
        petalsCheckbox.checked = dbPetals;
        updatePetalsSwitchUI(dbPetals);
    }

    const ringsCheckbox = document.getElementById('inv-rings-enabled');
    if (ringsCheckbox) {
        ringsCheckbox.checked = dbRings;
        updateRingsSwitchUI(dbRings);
    }

    let dbMessages = true;
    if (typeof tl !== 'undefined' && typeof tl.messages_enabled !== 'undefined') {
        dbMessages = !!tl.messages_enabled;
    } else if (typeof inv.has_messages !== 'undefined') {
        dbMessages = !!inv.has_messages;
    }
    const messagesCheckbox = document.getElementById('inv-messages-enabled');
    if (messagesCheckbox) {
        messagesCheckbox.checked = dbMessages;
        updateMessagesSwitchUI(dbMessages);
    }

    toggleCodeEditor();
    showModal('invitationModal');
}

window.createNewInvitation = async function() {
    window.currentEditInv = null;
    await populatePlanSelects();
    document.getElementById('invitation-form').reset();
    document.getElementById('inv-id').value = '';
    document.getElementById('inv-cover-file').value = '';
    document.getElementById('inv-music-file').value = '';
    document.getElementById('inv-gallery-files').value = '';
    window.loveStoryChapters = [];
    if(typeof renderLoveStoryChapters === 'function') renderLoveStoryChapters();
    
    window.adminGalleryItems = [];
    if(typeof renderAdminGalleryThumbnails === 'function') renderAdminGalleryThumbnails();

    if (document.getElementById('inv-bible-verse')) document.getElementById('inv-bible-verse').value = '';
    if (document.getElementById('inv-bible-reference')) document.getElementById('inv-bible-reference').value = '';

    window.loadDefaultProgramSteps();
    const programCheckbox = document.getElementById('inv-program-enabled');
    if (programCheckbox) {
        programCheckbox.checked = true;
        updateProgramSwitchUI(true);
    }

    const petalsCheckbox = document.getElementById('inv-petals-enabled');
    if (petalsCheckbox) {
        petalsCheckbox.checked = true;
        updatePetalsSwitchUI(true);
    }

    const ringsCheckbox = document.getElementById('inv-rings-enabled');
    if (ringsCheckbox) {
        ringsCheckbox.checked = true;
        updateRingsSwitchUI(true);
    }

    const messagesCheckbox = document.getElementById('inv-messages-enabled');
    if (messagesCheckbox) {
        messagesCheckbox.checked = true;
        updateMessagesSwitchUI(true);
    }

    toggleCodeEditor();
    showModal('invitationModal');
}

function updatePetalsSwitchUI(checked) {
    const slider = document.getElementById('petals-switch-slider');
    const knob = document.getElementById('petals-switch-knob');
    if (!slider || !knob) return;
    if (checked) {
        slider.style.backgroundColor = '#c5a059';
        knob.style.left = '26px';
    } else {
        slider.style.backgroundColor = '#ccc';
        knob.style.left = '4px';
    }
}

function updateRingsSwitchUI(checked) {
    const slider = document.getElementById('rings-switch-slider');
    const knob = document.getElementById('rings-switch-knob');
    if (!slider || !knob) return;
    if (checked) {
        slider.style.backgroundColor = '#c5a059';
        knob.style.left = '26px';
    } else {
        slider.style.backgroundColor = '#ccc';
        knob.style.left = '4px';
    }
}

function updateMessagesSwitchUI(checked) {
    const slider = document.getElementById('messages-switch-slider');
    const knob = document.getElementById('messages-switch-knob');
    if (!slider || !knob) return;
    if (checked) {
        slider.style.backgroundColor = '#c5a059';
        knob.style.left = '26px';
    } else {
        slider.style.backgroundColor = '#ccc';
        knob.style.left = '4px';
    }
}

function setupForms() {
    document.getElementById('inv-petals-enabled')?.addEventListener('change', function() {
        updatePetalsSwitchUI(this.checked);
    });

    document.getElementById('inv-rings-enabled')?.addEventListener('change', function() {
        updateRingsSwitchUI(this.checked);
    });

    document.getElementById('inv-program-enabled')?.addEventListener('change', function() {
        updateProgramSwitchUI(this.checked);
    });

    document.getElementById('inv-messages-enabled')?.addEventListener('change', function() {
        updateMessagesSwitchUI(this.checked);
    });

    document.getElementById('invitation-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const id = document.getElementById('inv-id').value;
            let rawSlug = document.getElementById('inv-slug').value;
            let slug = rawSlug.toLowerCase().replace(/&/g, 'e').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            if (!slug) slug = 'convite';

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
            let finalGallery = [];
            let galleryAligns = [];

            // Processamento inteligente da Galeria (Upload dos novos arquivos e preservação dos existentes com enquadramento)
            if (window.adminGalleryItems && window.adminGalleryItems.length > 0) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A processar galeria...';
                for (let i = 0; i < window.adminGalleryItems.length; i++) {
                    const item = window.adminGalleryItems[i];
                    let finalUrl = item.url;
                    if (item.file) {
                        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A enviar foto ${i + 1}/${window.adminGalleryItems.length}...`;
                        finalUrl = await uploadFile(item.file, `${slug}/gallery`);
                        item.url = finalUrl;
                        item.file = null;
                    }
                    if (finalUrl && !finalUrl.startsWith('blob:')) {
                        finalGallery.push(finalUrl);
                        galleryAligns.push(typeof item.align_y !== 'undefined' ? item.align_y : 50);
                    }
                }
            } else if (galleryUrlsText) {
                finalGallery = galleryUrlsText.split(',').map(s => s.trim()).filter(Boolean);
                galleryAligns = finalGallery.map(() => 50);
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
                editor_type: document.getElementById('inv-editor-type').value + ',' + (document.getElementById('inv-opening-animation').value || 'palace') + ',' + (document.getElementById('inv-template-id') ? document.getElementById('inv-template-id').value : 'modelo-ouro-floral') + ',' + (document.getElementById('inv-petals-enabled')?.checked ? 'petals' : 'no-petals'),
                custom_html: document.getElementById('inv-custom-html').value || null
            };

            // Love Story é guardado em invitations_details.tables_layout (JSONB)
            // Será tratado após salvar a invitation principal

            console.log('DEBUG SALVAMENTO:', data);

            let savedInvId = id;
            if (id) {
                const { error } = await sbClient.from('invitations').update(data).eq('id', id);
                if (error) {
                    if (error.code === '23505') throw new Error("Este slug já existe! Por favor, escolha outro.");
                    throw error;
                }
            } else {
                // Verificar duplicado em vez de forçar um sufixo gigante
                const { data: existingSlug } = await sbClient.from('invitations').select('id').eq('slug', data.slug).maybeSingle();
                if (existingSlug) {
                    data.slug = `${data.slug}-${Math.random().toString(36).slice(-4)}`;
                }
                const pwd = Math.random().toString(36).slice(-8).toUpperCase();
                data.couple_password = pwd;
                data.status = 'active';
                data.is_public = true;
                data.guest_link = `https://divinosgraffic.co.mz/c/${data.slug}`;
                const { data: inserted, error } = await sbClient.from('invitations').insert([data]).select('id').single();
                if (error) throw error;
                savedInvId = inserted.id;
            }

            // Salvar Love Story, locais, programa e preferências em invitations_details.tables_layout
            const isPetals = document.getElementById('inv-petals-enabled')?.checked;
            const isRings = document.getElementById('inv-rings-enabled')?.checked;
            const isProgram = document.getElementById('inv-program-enabled')?.checked;
            const isMessages = document.getElementById('inv-messages-enabled')?.checked;
            const civilTime = document.getElementById('inv-civil-time')?.value || null;
            const civilMapUrl = document.getElementById('inv-civil-map-url')?.value || null;
            const churchTime = document.getElementById('inv-church-time')?.value || null;
            const churchMapUrl = document.getElementById('inv-church-map-url')?.value || null;
            const eventMapUrl = document.getElementById('inv-event-map-url')?.value || null;

            if (savedInvId) {
                const { data: existing } = await sbClient.from('invitations_details').select('id, tables_layout').eq('invitation_id', savedInvId).single();
                const baseLayout = (existing && existing.tables_layout) ? existing.tables_layout : {};
                const newLayout = {
                    ...baseLayout,
                    love_story: window.loveStoryChapters || [],
                    gallery_aligns: galleryAligns,
                    gallery_items: finalGallery.map((url, i) => ({ url, align_y: galleryAligns[i] ?? 50 })),
                    petals_enabled: isPetals,
                    rings_enabled: isRings,
                    program_enabled: isProgram,
                    messages_enabled: isMessages,
                    event_program: window.eventProgramSteps || [],
                    civil_time: civilTime,
                    civil_map_url: civilMapUrl,
                    church_time: churchTime,
                    church_map_url: churchMapUrl,
                    event_map_url: eventMapUrl,
                    bible_verse: document.getElementById('inv-bible-verse')?.value || null,
                    bible_reference: document.getElementById('inv-bible-reference')?.value || null
                };
                if (existing) {
                    await sbClient.from('invitations_details').update({ tables_layout: newLayout }).eq('id', existing.id);
                } else {
                    await sbClient.from('invitations_details').insert([{ invitation_id: savedInvId, tables_layout: newLayout }]);
                }
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
    const templateSelector = document.getElementById('template-selector-container');
    
    if(editor) editor.style.display = type === 'manual' ? 'block' : 'none';
    if(templateSelector) templateSelector.style.display = type === 'template' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupForms();
    setupGlobalSearch();
    setupCoverPreview();
});

// ==========================================
// FUNÇÕES DE PLANOS
// ==========================================
function showPlanModal() {
    document.getElementById('plan-form').reset();
    document.getElementById('plan-id').value = '';
    document.getElementById('plan-color').value = '#6d28d9';
    showModal('planModal');
}

async function editPlan(id) {
    if (!window.allPlans) return;
    const plan = window.allPlans.find(p => p.id === id);
    if (!plan) return;
    
    document.getElementById('plan-form').reset();
    document.getElementById('plan-id').value = plan.id;
    document.getElementById('plan-name').value = plan.name || '';
    document.getElementById('plan-price').value = plan.price || '';
    document.getElementById('plan-color').value = plan.color || '#6d28d9';
    document.getElementById('plan-description').value = plan.description || '';
    
    const features = plan.features || {};
    document.getElementById('plan-max-photos').value = features.max_photos || '';
    
    const boolFeats = [
        'has_rsvp', 'has_music', 'has_countdown', 'has_location',
        'has_messages', 'has_qr_code', 'has_pre_wedding_gallery',
        'has_save_the_date', 'has_ia_story', 'has_love_story', 'has_couple_dashboard',
        'has_stats', 'has_pre_wedding_video', 'has_live_stream',
        'has_table_map', 'has_guest_uploads', 'has_custom_playlist',
        'has_time_capsule', 'has_guest_list_security', 'has_gift_list'
    ];
    
    boolFeats.forEach(f => {
        const cb = document.getElementById('feat-' + f.replace(/_/g, '-'));
        if (cb) cb.checked = !!features[f];
    });
    
    showModal('planModal');
}

window.savePlan = async function(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-plan');
    if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }
    
    try {
        const id = document.getElementById('plan-id').value;
        const name = document.getElementById('plan-name').value;
        const price = parseFloat(document.getElementById('plan-price').value || 0);
        const maxPhotos = document.getElementById('plan-max-photos').value;
        
        const boolFeats = [
            'has_rsvp', 'has_music', 'has_countdown', 'has_location',
            'has_messages', 'has_qr_code', 'has_pre_wedding_gallery',
            'has_save_the_date', 'has_ia_story', 'has_love_story', 'has_couple_dashboard',
            'has_stats', 'has_pre_wedding_video', 'has_live_stream',
            'has_table_map', 'has_guest_uploads', 'has_custom_playlist',
            'has_time_capsule', 'has_guest_list_security', 'has_gift_list'
        ];
        
        const features = {};
        if (maxPhotos) features.max_photos = parseInt(maxPhotos);
        boolFeats.forEach(f => {
            const cb = document.getElementById('feat-' + f.replace(/_/g, '-'));
            // Gravar explicitamente true/false para cada feature
            features[f] = cb ? cb.checked : false;
        });
        
        const payload = {
            name, price, features
        };
        
        let error;
        if (id) {
            const res = await sbClient.from('invitation_plans').update(payload).eq('id', id);
            error = res.error;
        } else {
            const res = await sbClient.from('invitation_plans').insert([payload]);
            error = res.error;
        }
        
        if (error) throw error;
        hideModal('planModal');
        loadPlans();
    } catch (error) {
        alert('Erro ao guardar plano: ' + error.message);
    } finally {
        if(btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
    }
};

window.deletePlan = async function(id) {
    if (!confirm('Tem certeza que deseja eliminar este plano? Esta acção não pode ser desfeita.')) return;
    try {
        const { error } = await sbClient.from('invitation_plans').delete().eq('id', id);
        if (error) throw error;
        loadPlans();
    } catch (e) {
        alert('Erro ao eliminar plano: ' + e.message);
    }
};

// EXPORTS
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
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
window.showPlanModal = showPlanModal;
window.editPlan = editPlan;
