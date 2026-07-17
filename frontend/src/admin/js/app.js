// ==========================================
// CONFIGURATION
// ==========================================
let allOrders = [];
let visitorsDate = new Date();
let salesDate = new Date();
const API_BASE_URL = (window.location.protocol === 'http:' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')))
    ? `http://${window.location.hostname}:8000/api/v1`
    : 'https://divinos-backend.onrender.com/api/v1';

console.log('App initialization...', { hostname: window.location.hostname, API_BASE_URL });

// ==========================================
// AUTHENTICATION CHECK
// ==========================================
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const is2FAPending = sessionStorage.getItem('admin_2fa_pending') === 'true';

    if (!session || is2FAPending) {
        window.location.href = 'index.html';
    } else {
        try {
            // Load initial data
            await loadDashboardData();
            setupRealtimeListeners();
            setupAutoLogout();
        } catch (dashErr) {
            console.error("Dashboard initialization error:", dashErr);
            showToast("Erro ao carregar alguns dados do painel.", "error");
        }
    }
}
// Run check on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();


});

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// ==========================================
// NAVIGATION & UI
// ==========================================
function switchTab(tabId) {
    // Buttons
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabId}`)?.classList.add('active');

    // Sections
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
        targetSection.classList.add('active');
        // Reload data for specific tabs if needed
        if (tabId === 'products') loadProductsAdmin();
        if (tabId === 'categories') loadCategoriesAdmin();
        if (tabId === 'orders') loadOrdersAdmin();
        if (tabId === 'carousel-editor') loadCarouselAdmin();
        if (tabId === 'trabalhos-editor') loadTrabalhosAdmin();
        if (tabId === 'payments') loadPaymentSettings();
        if (tabId === 'content-mgmt') {
            loadServicesAdmin();
            loadMomentosAdmin();
        }

        if (tabId.includes('editor') || tabId === 'settings' || tabId === 'marketing' || tabId === 'profile') loadSettingsToForms();
    }

    // Close sidebar on mobile after selecting
    if (window.innerWidth <= 768) {
        toggleSidebar(false);
    }
}

function toggleSidebar(force) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (force !== undefined) {
        if (force) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
        return;
    }

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');

    msg.textContent = message;
    toast.className = `notification show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==========================================
// DASHBOARD DATA (ANALYTICS)
// ==========================================
const supabaseClient = window.supabaseClient;

async function loadDashboardData() {
    if (!supabaseClient) return;

    // 1. Total Visits Count (Real)
    try {
        const { count, error } = await supabaseClient
            .from('page_visits')
            .select('*', { count: 'exact', head: true });

        if (!error) {
            document.getElementById('views-count').innerText = count;
        }
    } catch (e) {
        console.error("Error fetching views", e);
    }

    // 2. Count products
    try {
        const { count } = await supabaseClient.from('products').select('*', { count: 'exact', head: true });
        document.getElementById('products-count').innerText = count || 0;
    } catch (e) {
        console.error("Error fetching products", e);
    }

    // 3. Load Charts (Real Data - Last 7 Days)
    fetchChartData();

    // 4. Load Recent Visits Table
    fetchRecentVisits();

    // 5. Load Settings (Profile, etc.)
    loadSettingsToForms();
}

async function fetchRecentVisits() {
    const tableBody = document.getElementById('visits-table-body');
    if (!tableBody) return;

    try {
        const { data, error } = await supabaseClient
            .from('page_visits')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        tableBody.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach(visit => {
                const tr = document.createElement('tr');
                const date = new Date(visit.created_at).toLocaleString('pt-BR');
                tr.innerHTML = `
                    <td style="font-weight: 500;"><i class="fas fa-globe-africa" style="margin-right:8px; color:#457b9d;"></i>${visit.country || 'Local'}</td>
                    <td>${visit.region || visit.city || 'Desconhecido'}</td>
                    <td><i class="fas ${visit.device_type === 'Mobile' ? 'fa-mobile-alt' : 'fa-desktop'}" style="margin-right:8px;"></i>${visit.device_type || 'Desktop'}</td>
                    <td>${date}</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma visita registrada ainda.</td></tr>';
        }
    } catch (e) {
        console.error("Error fetching recent visits:", e);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Erro ao carregar visitas.</td></tr>';
    }
}

async function fetchChartData(refDate = visitorsDate) {
    visitorsDate = new Date(refDate);
    const datePicker = document.getElementById('visitors-date-picker');
    if (datePicker) datePicker.value = visitorsDate.toISOString().split('T')[0];

    const today = new Date(visitorsDate);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);

    const { data, error } = await supabaseClient
        .from('page_visits')
        .select('created_at')
        .gte('created_at', lastWeek.toISOString());

    if (error) {
        console.error("Chart data error", error);
        // Fallback to empty chart
        renderVisitorsChart([], []);
        return;
    }

    // Process data: Group by Day
    const counts = {};
    const labels = [];

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dayStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
        const dateKey = d.toISOString().split('T')[0];

        counts[dateKey] = 0;
        labels.push(dayStr);
    }

    // Count actuals
    data.forEach(visit => {
        const dateKey = visit.created_at.split('T')[0];
        if (counts.hasOwnProperty(dateKey) || counts[dateKey] !== undefined) {
            counts[dateKey] = (counts[dateKey] || 0) + 1;
        } else {
            // Find closest key? Or specific logic. 
            // Simple approach: map keys to label index.
            // Re-loop to fill array
        }
    });

    // Convert object to array sorted by date
    const dataPoints = [];
    // We need to match the labels order (which is last 7 days)
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        dataPoints.push(counts[dateKey] || 0);
    }

    renderVisitorsChart(labels, dataPoints);
}

window.navigateChart = (type, direction) => {
    if (type === 'visitors') {
        visitorsDate.setDate(visitorsDate.getDate() + (direction * 7));
        fetchChartData(visitorsDate);
    } else {
        const jump = currentChartPeriod === 'daily' ? 7 : (currentChartPeriod === 'weekly' ? 28 : 180);
        salesDate.setDate(salesDate.getDate() + (direction * jump));
        renderSalesChart(allOrders, salesDate);
    }
};

window.jumpToDate = (type, dateStr) => {
    if (!dateStr) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (type === 'visitors') {
        visitorsDate = d;
        fetchChartData(visitorsDate);
    } else {
        salesDate = d;
        renderSalesChart(allOrders, salesDate);
    }
};

let visitorsChartInstance = null;

function renderVisitorsChart(labels, dataPoints) {
    const ctx = document.getElementById('visitorsChart').getContext('2d');

    // Destroy previous instance if exists to prevent overlapping
    if (visitorsChartInstance) {
        visitorsChartInstance.destroy();
    }

    visitorsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Visitantes',
                data: dataPoints,
                borderColor: '#457b9d',
                backgroundColor: 'rgba(69, 123, 157, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [5, 5] }, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ==========================================
// CATEGORIES MANAGEMENT
// ==========================================
const categoriesTableBody = document.getElementById('categories-table-body');
const prodCategorySelect = document.getElementById('prod-category');

async function loadCategoriesAdmin() {
    if (!categoriesTableBody) return;
    categoriesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';

    const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error(error);
        categoriesTableBody.innerHTML = '<tr><td colspan="3" style="color:red">Erro ao carregar</td></tr>';
        return;
    }

    // Self-healing: Ensure 'Quadros' exists (case insensitive)
    const hasQuadros = data.some(cat => cat.name.toLowerCase() === 'quadros');
    if (!hasQuadros) {
        try {
            await supabaseClient.from('categories').insert([{ name: 'Quadros' }]);
            // Reload to show it
            const { data: newData } = await supabaseClient.from('categories').select('*').order('name', { ascending: true });
            if (newData) data = newData;
        } catch (e) { console.error("Could not auto-create category", e); }
    }

    categoriesTableBody.innerHTML = '';
    data.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 500;">${cat.name}</td>
            <td>${new Date(cat.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-primary" onclick="editCategory(${cat.id}, '${cat.name}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger" onclick="deleteCategory(${cat.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        categoriesTableBody.appendChild(tr);
    });

    // Also update product form dropdown
    updateProductCategoryDropdown(data);
}

function updateProductCategoryDropdown(categories) {
    if (!prodCategorySelect) return;
    const currentVal = prodCategorySelect.value;
    prodCategorySelect.innerHTML = '<option value="">Selecione...</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        prodCategorySelect.appendChild(opt);
    });
    if (currentVal) prodCategorySelect.value = currentVal;
}

function showAddCategoryForm() {
    document.getElementById('category-form-container').style.display = 'block';
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = '';
}

function hideCategoryForm() {
    document.getElementById('category-form-container').style.display = 'none';
}

window.editCategory = (id, name) => {
    showAddCategoryForm();
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
};

window.deleteCategory = async (id) => {
    if (confirm('Atenção: A exclusão de uma categoria não exclui os produtos, mas eles podem perder o vínculo. Deseja continuar?')) {
        const { error } = await supabaseClient.from('categories').delete().eq('id', id);
        if (error) showToast('Erro: ' + error.message, 'error');
        else {
            showToast('Categoria excluída!');
            loadCategoriesAdmin();
        }
    }
};

// Add category form listener in setup
function setupCategoryFormListener() {
    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('cat-id').value;
            const name = document.getElementById('cat-name').value;

            let error;
            if (id) {
                const { error: err } = await supabaseClient.from('categories').update({ name }).eq('id', id);
                error = err;
            } else {
                const { error: err } = await supabaseClient.from('categories').insert([{ name }]);
                error = err;
            }

            if (error) showToast('Erro ao salvar: ' + error.message, 'error');
            else {
                showToast('Categoria salva!');
                hideCategoryForm();
                loadCategoriesAdmin();
            }
        });
    }
}


// ==========================================
// PRODUCTS MANAGEMENT
// ==========================================
const productsTableBody = document.getElementById('products-table-body');

// Quill Editor Instances
let shortDescriptionQuill = null;
let longDescriptionQuill = null;

function initializeQuillEditors() {
    // Verificar se os elementos existem antes de inicializar
    const shortDescEl = document.getElementById('short-description-editor');
    const longDescEl = document.getElementById('long-description-editor');

    if (shortDescEl && !shortDescriptionQuill) {
        shortDescriptionQuill = new Quill('#short-description-editor', {
            theme: 'snow',
            placeholder: 'Breve descrição do produto...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                ]
            }
        });
    }

    if (longDescEl && !longDescriptionQuill) {
        longDescriptionQuill = new Quill('#long-description-editor', {
            theme: 'snow',
            placeholder: 'Descrição detalhada com todas as características...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        });
    }
}

async function loadProductsAdmin() {
    await loadCategoriesAdmin(); // Refresh categories dropdown before showing products
    if (!productsTableBody) return;
    productsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>';

    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        productsTableBody.innerHTML = '<tr><td colspan="6" style="color:red">Erro ao carregar</td></tr>';
        return;
    }

    productsTableBody.innerHTML = '';
    if (data.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum produto encontrado.</td></tr>';
        return;
    }

    data.forEach(prod => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${prod.image_url || '../images/placeholder.jpg'}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
            </td>
            <td style="font-weight: 500;">${prod.title}</td>
            <td><span style="background:#eef2f7; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${prod.category || '-'}</span></td>
            <td>${prod.price || '-'}</td>
            <td style="text-align: center;">
                ${prod.is_featured ? '<i class="fas fa-star" style="color: #f1c40f;" title="Em Destaque"></i>' : '<i class="far fa-star" style="color: #ccc;"></i>'}
            </td>
            <td>
                <button class="btn btn-primary" onclick="editProduct(${prod.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger" onclick="deleteProduct(${prod.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        productsTableBody.appendChild(tr);
    });
}

function showAddProductForm() {
    document.getElementById('product-form-container').style.display = 'block';
    // Initialize editors if not already done
    initializeQuillEditors();

    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-gallery').value = '[]';
    document.getElementById('gallery-container').innerHTML = '';
    document.getElementById('prod-preview').src = '';
    document.getElementById('prod-preview').style.display = 'none';
    document.getElementById('prod-featured').checked = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideProductForm() {
    document.getElementById('product-form-container').style.display = 'none';
}

window.editProduct = async (id) => {
    const { data, error } = await supabaseClient.from('products').select('*').eq('id', id).single();
    if (data) {
        showAddProductForm();

        // Campos básicos
        document.getElementById('prod-id').value = data.id;
        document.getElementById('prod-title').value = data.title;
        document.getElementById('prod-category').value = data.category || '';
        document.getElementById('prod-price').value = data.price;
        document.getElementById('prod-image').value = data.image_url;
        document.getElementById('prod-featured').checked = data.is_featured || false;

        // Novos campos
        document.getElementById('prod-sku').value = data.sku || '';
        document.getElementById('prod-discount').value = data.discount_percentage || 0;
        document.getElementById('prod-rating').value = data.rating || 0;
        document.getElementById('prod-reviews').value = data.review_count || 0;
        document.getElementById('prod-badge').value = data.badge || '';
        document.getElementById('prod-tags').value = (data.tags && Array.isArray(data.tags)) ? data.tags.join(', ') : '';
        document.getElementById('prod-sizes').value = (data.sizes && Array.isArray(data.sizes)) ? data.sizes.join(', ') : '';

        // Descrições com Quill
        if (shortDescriptionQuill) {
            shortDescriptionQuill.root.innerHTML = data.description || '';
        }
        if (longDescriptionQuill) {
            longDescriptionQuill.root.innerHTML = data.long_description || '';
        }

        // Gallery
        let galleryArray = [];
        try {
            galleryArray = typeof data.gallery === 'string' ? JSON.parse(data.gallery) : (data.gallery || []);
        } catch (e) { galleryArray = []; }

        document.getElementById('prod-gallery').value = JSON.stringify(galleryArray);
        renderGalleryUI();

        if (data.image_url) {
            document.getElementById('prod-preview').src = data.image_url;
            document.getElementById('prod-preview').style.display = 'block';
        }
    }
};

async function handleGalleryUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Show indicator
    showToast('Enviando para galeria...', 'info');

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_gal.${fileExt}`;

        const { data, error } = await supabaseClient.storage
            .from('products-images')
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabaseClient.storage.from('products-images').getPublicUrl(fileName);

        // Add to array
        let gallery = JSON.parse(document.getElementById('prod-gallery').value || '[]');
        gallery.push(publicUrl);
        document.getElementById('prod-gallery').value = JSON.stringify(gallery);

        renderGalleryUI();
        showToast('Foto adicionada à galeria!');
    } catch (err) {
        console.error(err);
        showToast('Erro no upload da galeria: ' + err.message, 'error');
    }
}

function renderGalleryUI() {
    const container = document.getElementById('gallery-container');
    const gallery = JSON.parse(document.getElementById('prod-gallery').value || '[]');
    container.innerHTML = '';

    gallery.forEach((url, index) => {
        const div = document.createElement('div');
        div.style = 'position: relative; width: 80px; height: 80px;';
        div.innerHTML = `
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;">
            <button type="button" onclick="removeFromGallery(${index})" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px;">&times;</button>
        `;
        container.appendChild(div);
    });
}

function removeFromGallery(index) {
    let gallery = JSON.parse(document.getElementById('prod-gallery').value || '[]');
    gallery.splice(index, 1);
    document.getElementById('prod-gallery').value = JSON.stringify(gallery);
    renderGalleryUI();
}

// Globalize helper
window.handleGalleryUpload = handleGalleryUpload;
window.removeFromGallery = removeFromGallery;

window.deleteProduct = async (id) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) showToast('Erro: ' + error.message, 'error');
        else {
            showToast('Produto excluído com sucesso!');
            loadProductsAdmin();
        }
    }
};

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;

    // Processar tags e sizes (converter de string para array)
    const tagsInput = document.getElementById('prod-tags').value;
    const sizesInput = document.getElementById('prod-sizes').value;

    const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    const sizesArray = sizesInput ? sizesInput.split(',').map(s => s.trim()).filter(s => s) : [];

    // Obter conteúdo dos editores Quill
    const shortDesc = shortDescriptionQuill ? shortDescriptionQuill.root.innerHTML : '';
    const longDesc = longDescriptionQuill ? longDescriptionQuill.root.innerHTML : '';

    // Auto-gerar SKU se vazio
    let sku = document.getElementById('prod-sku').value;
    if (!sku && !id) {
        sku = 'PRD' + Date.now().toString().slice(-8);
    }

    const productData = {
        title: document.getElementById('prod-title').value,
        category: document.getElementById('prod-category').value,
        price: document.getElementById('prod-price').value,
        image_url: document.getElementById('prod-image').value,
        description: shortDesc,
        long_description: longDesc,
        gallery: document.getElementById('prod-gallery').value, // JSON String
        is_featured: document.getElementById('prod-featured').checked,
        // Novos campos
        sku: sku,
        discount_percentage: parseInt(document.getElementById('prod-discount').value) || null,
        rating: parseFloat(document.getElementById('prod-rating').value) || null,
        review_count: parseInt(document.getElementById('prod-reviews').value) || 0,
        badge: document.getElementById('prod-badge').value || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        sizes: sizesArray.length > 0 ? sizesArray : null
    };

    let error;
    if (id) {
        const { error: err } = await supabaseClient.from('products').update(productData).eq('id', id);
        error = err;
    } else {
        const { error: err } = await supabaseClient.from('products').insert([productData]);
        error = err;
    }

    if (error) {
        showToast('Erro ao salvar: ' + error.message, 'error');
    } else {
        showToast('Produto salvo com sucesso!');
        hideProductForm();
        loadProductsAdmin();
    }
});

// ==========================================
// SETTINGS (GENERIC HANDLER)
// ==========================================
// Loads settings into any form input that has name="KEY_IN_DB"
async function loadSettingsToForms() {
    const { data, error } = await supabaseClient.from('site_settings').select('*');
    if (!data) return;

    data.forEach(setting => {
        // Find inputs with this name
        const inputs = document.querySelectorAll(`[name="${setting.key}"]`);
        inputs.forEach(input => {
            input.value = setting.value || '';
        });

        // SPECIAL: Update Header UI with current profile settings
        if (setting.key === 'admin_display_name') {
            document.getElementById('admin-display-name').innerText = setting.value || 'Admin';
        }
        if (setting.key === 'admin_profile_pic') {
            const img = document.getElementById('admin-profile-img');
            const icon = document.getElementById('admin-default-icon');
            if (setting.value) {
                img.src = setting.value;
                img.style.display = 'block';
                icon.style.display = 'none';
            } else {
                img.style.display = 'none';
                icon.style.display = 'block';
            }
        }
        if (setting.key === 'admin_2fa_enabled') {
            const status = document.getElementById('2fa-status');
            const btn = document.getElementById('toggle-2fa-btn');
            if (setting.value === 'true') {
                status.innerText = 'ATIVADO';
                status.style.color = '#2ecc71';
                btn.innerText = 'Desativar';
            } else {
                status.innerText = 'DESATIVADO';
                status.style.color = '#e63946';
                btn.innerText = 'Ativar';
            }
        }
    });
}

async function saveSettingsFromForm(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const updates = [];

    for (const [key, value] of formData.entries()) {
        // Upsert setting: try to update, if not exist insert (requires logic, but our setup.sql uses ON CONFLICT DO NOTHING for inserts, 
        // effectively we should check if exists or use upsert if we had proper constraints. 
        // Since setup.sql defined key as UNIQUE, upsert works good.)

        updates.push(
            supabaseClient.from('site_settings').upsert({
                key: key,
                value: value
            }, { onConflict: 'key' })
        );
    }

    try {
        await Promise.all(updates);
        showToast('Configurações salvas com sucesso!');
    } catch (err) {
        console.error(err);
        showToast('Erro ao salvar configurações.', 'error');
    }
}

function setupEventListeners() {
    setupCategoryFormListener();
    // Attach generic save handlers
    ['hero-form', 'about-form', 'contact-info-form', 'visual-settings-form', 'admin-profile-form', 'marketing-settings-form'].forEach(id => {
        const form = document.getElementById(id);
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveSettingsFromForm(id);
                // Refresh specific UI if profile or marketing was saved
                if (id === 'admin-profile-form' || id === 'marketing-settings-form') {
                    loadSettingsToForms();
                }
            });
        }
    });

    // Content Forms
    const serviceForm = document.getElementById('service-form');
    if (serviceForm) {
        serviceForm.addEventListener('submit', saveService);
    }
    const momentoForm = document.getElementById('momento-form');
    if (momentoForm) {
        momentoForm.addEventListener('submit', saveMomento);
    }



    // Password Change Listener ...
    const passForm = document.getElementById('change-password-form');
    if (passForm) {
        passForm.addEventListener('submit', handlePasswordChange);
    }

    // 2FA Toggle Listener ...
    const tfaBtn = document.getElementById('toggle-2fa-btn');
    if (tfaBtn) {
        tfaBtn.addEventListener('click', toggle2FA);
    }

    // New 2FA setup listener
    const setup2FABtn = document.getElementById('setup-2fa-new-btn');
    if (setup2FABtn) {
        setup2FABtn.addEventListener('click', show2FASetup);
    }
}

// ==========================================
// SERVICES MANAGEMENT
// ==========================================
async function loadServicesAdmin() {
    const tableBody = document.getElementById('services-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';

    const { data, error } = await supabaseClient.from('site_services').select('*').order('display_order', { ascending: true });
    if (error) {
        tableBody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Erro ao carregar dados</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    data.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.display_order}</td>
            <td style="font-weight: 500;">${s.title_pt}</td>
            <td><i class="${s.icon || 'fas fa-star'}"></i></td>
            <td>
                <button class="btn btn-primary" onclick="showServiceModal(${s.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger" onclick="deleteService(${s.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function showServiceModal(id = null) {
    const modal = document.getElementById('serviceModal');
    const form = document.getElementById('service-form');
    const title = document.getElementById('service-modal-title');

    form.reset();
    document.getElementById('service-id').value = '';
    title.innerText = 'Novo Serviço';

    if (id) {
        title.innerText = 'Editar Serviço';
        fetchServiceData(id);
    }
    modal.style.display = 'block';
}

async function fetchServiceData(id) {
    const { data, error } = await supabaseClient.from('site_services').select('*').eq('id', id).single();
    if (data) {
        const form = document.getElementById('service-form');
        document.getElementById('service-id').value = data.id;
        form.querySelector('[name="title_pt"]').value = data.title_pt;
        form.querySelector('[name="title_en"]').value = data.title_en || '';
        form.querySelector('[name="description_pt"]').value = data.description_pt;
        form.querySelector('[name="description_en"]').value = data.description_en || '';
        form.querySelector('[name="icon"]').value = data.icon || '';
        form.querySelector('[name="display_order"]').value = data.display_order;
    }
}

function hideServiceModal() {
    document.getElementById('serviceModal').style.display = 'none';
}

async function saveService(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');
    const data = Object.fromEntries(formData.entries());
    delete data.id;

    let res;
    if (id) res = await supabaseClient.from('site_services').update(data).eq('id', id);
    else res = await supabaseClient.from('site_services').insert([data]);

    if (res.error) showToast('Erro ao salvar serviço: ' + res.error.message, 'error');
    else {
        showToast('Serviço salvo com sucesso!');
        hideServiceModal();
        loadServicesAdmin();
    }
}

async function deleteService(id) {
    if (confirm('Deseja realmente excluir este serviço?')) {
        const { error } = await supabaseClient.from('site_services').delete().eq('id', id);
        if (error) showToast('Erro ao excluir: ' + error.message, 'error');
        else {
            showToast('Serviço removido!');
            loadServicesAdmin();
        }
    }
}

// ==========================================
// MOMENTOS MANAGEMENT
// ==========================================
async function loadMomentosAdmin() {
    const tableBody = document.getElementById('momentos-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';

    const { data, error } = await supabaseClient.from('site_momentos').select('*').order('display_order', { ascending: true });
    if (error) {
        tableBody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Erro ao carregar dados</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    data.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.display_order}</td>
            <td style="font-size: 0.85rem; color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.video_url}</td>
            <td>
                <button class="btn btn-primary" onclick="showMomentoModal(${m.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger" onclick="deleteMomento(${m.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function showMomentoModal(id = null) {
    const modal = document.getElementById('momentoModal');
    const form = document.getElementById('momento-form');
    const title = document.getElementById('momento-modal-title');

    form.reset();
    document.getElementById('momento-id').value = '';
    title.innerText = 'Adicionar Vídeo';

    if (id) {
        title.innerText = 'Editar Vídeo';
        fetchMomentoData(id);
    }
    modal.style.display = 'block';
}

async function fetchMomentoData(id) {
    const { data, error } = await supabaseClient.from('site_momentos').select('*').eq('id', id).single();
    if (data) {
        const form = document.getElementById('momento-form');
        document.getElementById('momento-id').value = data.id;
        form.querySelector('[name="video_url"]').value = data.video_url;
        form.querySelector('[name="display_order"]').value = data.display_order;
    }
}

function hideMomentoModal() {
    document.getElementById('momentoModal').style.display = 'none';
}

async function saveMomento(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');
    const data = Object.fromEntries(formData.entries());
    delete data.id;

    let res;
    if (id) res = await supabaseClient.from('site_momentos').update(data).eq('id', id);
    else res = await supabaseClient.from('site_momentos').insert([data]);

    if (res.error) showToast('Erro ao salvar vídeo: ' + res.error.message, 'error');
    else {
        showToast('Vídeo salvo com sucesso!');
        hideMomentoModal();
        loadMomentosAdmin();
    }
}

async function deleteMomento(id) {
    if (confirm('Deseja realmente remover este vídeo?')) {
        const { error } = await supabaseClient.from('site_momentos').delete().eq('id', id);
        if (error) showToast('Erro ao remover: ' + error.message, 'error');
        else {
            showToast('Vídeo removido!');
            loadMomentosAdmin();
        }
    }
}


// ==========================================
// IMAGE UPLOAD HANDLER
// ==========================================
async function handleFileUpload(inputElement, targetUrlInputId, previewImgId) {
    const file = inputElement.files[0];
    if (!file) return;

    // Store original button or indicator if needed, but let's just use toast
    showToast('Enviando imagem principal...', 'info');

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabaseClient.storage
            .from('products-images')
            .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabaseClient.storage.from('products-images').getPublicUrl(filePath);

        const targetInput = document.getElementById(targetUrlInputId);
        if (targetInput) {
            targetInput.value = publicUrl;
        }

        const preview = document.getElementById(previewImgId);
        if (preview) {
            preview.src = publicUrl;
            preview.style.display = 'block';
        }

        showToast('Imagem enviada com sucesso!');

    } catch (err) {
        console.error('Upload Error:', err);
        showToast('Erro no upload: ' + err.message, 'error');
    } finally {
        // Clear file input so it can be used again for same file if needed
        inputElement.value = '';
    }
}

// ==========================================
// CAROUSEL MANAGEMENT
// ==========================================
const carouselTableBody = document.getElementById('carousel-table-body');

async function loadCarouselAdmin() {
    if (!carouselTableBody) return;
    carouselTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>';

    const { data, error } = await supabaseClient
        .from('carousel_items')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) {
        console.error(error);
        carouselTableBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center; padding: 20px;">
            <i class="fas fa-exclamation-triangle"></i> Erro ao acessar banco de dados.<br>
            <small>${error.message}</small><br>
            <small style="display:block; margin-top:10px;">Verifique se criou a tabela 'carousel_items' no Supabase usando o arquivo 'carousel_setup.sql'.</small>
        </td></tr>`;
        return;
    }

    carouselTableBody.innerHTML = '';
    if (data.length === 0) {
        carouselTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">
            <p>Nenhum item encontrado.</p>
            <button class="btn btn-secondary" onclick="seedCarouselData()" style="font-size: 0.8rem; margin-top: 10px;">
                <i class="fas fa-magic"></i> Gerar Itens Iniciais Padrão
            </button>
        </td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${item.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
            </td>
            <td style="font-weight: 500;">${item.title || '-'}</td>
            <td>${item.subtitle || '-'}</td>
            <td>${item.display_order}</td>
            <td>
                <button class="btn btn-primary" onclick="editCarouselItem(${item.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger" onclick="deleteCarouselItem(${item.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        carouselTableBody.appendChild(tr);
    });
}

function showAddCarouselForm() {
    document.getElementById('carousel-form-container').style.display = 'block';
    document.getElementById('carousel-form').reset();
    document.getElementById('car-id').value = '';
    document.getElementById('car-preview').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideCarouselForm() {
    document.getElementById('carousel-form-container').style.display = 'none';
}

window.editCarouselItem = async (id) => {
    const { data, error } = await supabaseClient.from('carousel_items').select('*').eq('id', id).single();
    if (data) {
        showAddCarouselForm();
        document.getElementById('car-id').value = data.id;
        document.getElementById('car-title').value = data.title;
        document.getElementById('car-subtitle').value = data.subtitle;
        document.getElementById('car-order').value = data.display_order;
        document.getElementById('car-image').value = data.image_url;

        if (data.image_url) {
            document.getElementById('car-preview').src = data.image_url;
            document.getElementById('car-preview').style.display = 'block';
        }
    }
};

window.deleteCarouselItem = async (id) => {
    if (confirm('Tem certeza que deseja remover este item do carrossel?')) {
        const { error } = await supabaseClient.from('carousel_items').delete().eq('id', id);
        if (error) showToast('Erro: ' + error.message, 'error');
        else {
            showToast('Item removido!');
            loadCarouselAdmin();
        }
    }
};

// ==========================================
// NOSSOS TRABALHOS MANAGEMENT
// ==========================================
const trabalhosTableBody = document.getElementById('trabalhos-table-body');

async function loadTrabalhosAdmin() {
    if (!trabalhosTableBody) return;
    trabalhosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>';

    const { data, error } = await supabaseClient
        .from('nossos_trabalhos')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) {
        console.error("Erro ao carregar trabalhos:", error);
        trabalhosTableBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center; padding: 20px;">
            <i class="fas fa-exclamation-triangle"></i> Erro ao acessar banco de dados.<br>
            <small>${error.message}</small>
        </td></tr>`;
        return;
    }

    trabalhosTableBody.innerHTML = '';
    if (!data || data.length === 0) {
        trabalhosTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">
            <p>Nenhum trabalho encontrado.</p>
        </td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${item.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
            </td>
            <td style="font-weight: 500;">${item.title || '-'}</td>
            <td>${item.subtitle || '-'}</td>
            <td>${item.display_order}</td>
            <td>
                <button class="btn btn-primary" onclick="editTrabalho('${item.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger" onclick="deleteTrabalho('${item.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        trabalhosTableBody.appendChild(tr);
    });
}

function showAddTrabalhoForm() {
    document.getElementById('trabalho-form-container').style.display = 'block';
    const form = document.getElementById('trabalho-form');
    if (form) form.reset();
    document.getElementById('trab-id').value = '';
    const preview = document.getElementById('trab-preview');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideTrabalhoForm() {
    document.getElementById('trabalho-form-container').style.display = 'none';
}

window.editTrabalho = async (id) => {
    const { data, error } = await supabaseClient.from('nossos_trabalhos').select('*').eq('id', id).single();
    if (data) {
        showAddTrabalhoForm();
        document.getElementById('trab-id').value = data.id;
        document.getElementById('trab-title').value = data.title || '';
        document.getElementById('trab-subtitle').value = data.subtitle || '';
        document.getElementById('trab-order').value = data.display_order || 0;
        document.getElementById('trab-image').value = data.image_url || '';

        if (data.image_url) {
            const preview = document.getElementById('trab-preview');
            preview.src = data.image_url;
            preview.style.display = 'block';
        }
    }
};

window.deleteTrabalho = async (id) => {
    if (confirm('Tem certeza que deseja remover este trabalho?')) {
        const { error } = await supabaseClient.from('nossos_trabalhos').delete().eq('id', id);
        if (error) showToast('Erro: ' + error.message, 'error');
        else {
            showToast('Trabalho removido!');
            loadTrabalhosAdmin();
        }
    }
};

const trabalhoForm = document.getElementById('trabalho-form');
if (trabalhoForm) {
    trabalhoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('trab-id').value;

        const workData = {
            title: document.getElementById('trab-title').value,
            subtitle: document.getElementById('trab-subtitle').value,
            display_order: parseInt(document.getElementById('trab-order').value) || 0,
            image_url: document.getElementById('trab-image').value
        };

        let result;
        if (id) {
            result = await supabaseClient.from('nossos_trabalhos').update(workData).eq('id', id);
        } else {
            result = await supabaseClient.from('nossos_trabalhos').insert([workData]);
        }

        if (result.error) {
            showToast('Erro ao salvar: ' + result.error.message, 'error');
        } else {
            showToast('Trabalho atualizado!');
            hideTrabalhoForm();
            loadTrabalhosAdmin();
        }
    });
}

const carouselForm = document.getElementById('carousel-form');
if (carouselForm) {
    carouselForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('car-id').value;

        const carouselData = {
            title: document.getElementById('car-title').value,
            subtitle: document.getElementById('car-subtitle').value,
            display_order: parseInt(document.getElementById('car-order').value),
            image_url: document.getElementById('car-image').value
        };

        let result;
        if (id) {
            result = await supabaseClient.from('carousel_items').update(carouselData).eq('id', id);
        } else {
            result = await supabaseClient.from('carousel_items').insert([carouselData]);
        }

        if (result.error) {
            showToast('Erro ao salvar: ' + result.error.message, 'error');
        } else {
            showToast('Carrossel atualizado!');
            hideCarouselForm();
            loadCarouselAdmin();
        }
    });
}

// Migração automática/Seed data helper
async function seedCarouselData() {
    const defaultItems = [
        { title: 'Produto 1', subtitle: 'Mais vendido', display_order: 1, image_url: 'images/Exposição principal/exposição (1).jpg' },
        { title: 'Produto 2', subtitle: 'Tendência', display_order: 2, image_url: 'images/Exposição principal/exposição (2).jpg' },
        { title: 'Produto 3', subtitle: 'Novo no site', display_order: 3, image_url: 'images/Exposição principal/exposição (3).jpg' },
        { title: 'Produto 4', subtitle: 'Destaque', display_order: 4, image_url: 'images/Exposição principal/exposição (4).jpg' },
        { title: 'Produto 5', subtitle: 'Edição Limitada', display_order: 5, image_url: 'images/Exposição principal/exposição (5).jpg' }
    ];

    showToast('Iniciando migração de dados...', 'info');
    const { error } = await supabaseClient.from('carousel_items').insert(defaultItems);

    if (error) showToast('Erro na migração: ' + error.message, 'error');
    else {
        showToast('Dados iniciais criados!');
        loadCarouselAdmin();
    }
}

// ==========================================
// SECURITY & PROFILE HELPERS
// ==========================================

// 1. Inactivity Logout (1 hour)
function setupAutoLogout() {
    let timeout;
    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour

    function resetTimer() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            showToast('Logout por inatividade...', 'info');
            logout();
        }, INACTIVITY_LIMIT);
    }

    // Events to reset timer
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, resetTimer, true);
    });

    resetTimer(); // Start initially
}

// 2. Credentials Change (Email / Password)
async function handlePasswordChange(e) {
    e.preventDefault();
    const newEmail = document.getElementById('new-email') ? document.getElementById('new-email').value.trim() : '';
    const newPass = document.getElementById('new-password').value.trim();
    const confirmPass = document.getElementById('confirm-password').value.trim();

    if (newPass && newPass !== confirmPass) {
        showToast('As senhas não coincidem!', 'error');
        return;
    }

    if (!newEmail && !newPass) {
        showToast('Preencha o email ou a senha para alterar.', 'error');
        return;
    }

    showToast('Atualizando credenciais...', 'info');
    
    let updates = {};
    if (newEmail !== '') updates.email = newEmail;
    if (newPass !== '') updates.password = newPass;

    const { error } = await supabaseClient.auth.updateUser(updates);

    if (error) {
        showToast('Erro: ' + error.message, 'error');
    } else {
        showToast('Credenciais atualizadas com sucesso! (Se mudou o email, verifique a caixa de entrada)', 'success');
        document.getElementById('change-password-form').reset();
    }
}

// 3. 2FA Configuration
let pending2FASecret = '';

function generateBase32Secret(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < length; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

async function show2FASetup() {
    const setupArea = document.getElementById('2fa-setup-area');
    const qrContainer = document.getElementById('2fa-qrcode');
    const secretText = document.getElementById('2fa-secret-text');

    // Generate new secret
    pending2FASecret = generateBase32Secret();
    secretText.innerText = pending2FASecret.match(/.{1,4}/g).join(' '); // Format with spaces

    // Clear previous QR
    qrContainer.innerHTML = '';

    // Generate QR Code
    const label = 'Admin';
    const issuer = 'DivinosGraffic';
    const otpauth = `otpauth://totp/${issuer}:${label}?secret=${pending2FASecret}&issuer=${issuer}`;

    new QRCode(qrContainer, {
        text: otpauth,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    setupArea.style.display = 'block';
    setupArea.scrollIntoView({ behavior: 'smooth' });
}

function hide2FASetup() {
    document.getElementById('2fa-setup-area').style.display = 'none';
    pending2FASecret = '';
}

async function confirm2FASetup() {
    if (!pending2FASecret) return;

    showToast('Salvando configuração 2FA...', 'info');

    // 1. Save Secret
    const { error: err1 } = await supabaseClient.from('site_settings').upsert({
        key: 'admin_2fa_secret',
        value: pending2FASecret
    }, { onConflict: 'key' });

    // 2. Enable 2FA
    const { error: err2 } = await supabaseClient.from('site_settings').upsert({
        key: 'admin_2fa_enabled',
        value: 'true'
    }, { onConflict: 'key' });

    if (err1 || err2) {
        showToast('Erro ao salvar configuração 2FA', 'error');
    } else {
        showToast('2FA Configurado e Ativado!');
        hide2FASetup();
        loadSettingsToForms(); // Refresh UI to show "ATIVADO"
    }
}

async function toggle2FA() {
    const statusEl = document.getElementById('2fa-status');
    const isCurrentlyOn = statusEl.innerText === 'ATIVADO';

    if (!isCurrentlyOn) {
        // If turning ON, show setup instead of just toggling
        show2FASetup();
        return;
    }

    // If turning OFF
    if (!confirm('Deseja realmente desativar o Google Authenticator? Seu login ficará menos seguro.')) return;

    showToast('Desativando 2FA...', 'info');

    const { error } = await supabaseClient.from('site_settings').upsert({
        key: 'admin_2fa_enabled',
        value: 'false'
    }, { onConflict: 'key' });

    if (error) {
        showToast('Erro ao atualizar 2FA', 'error');
    } else {
        loadSettingsToForms();
        showToast('2FA Desativado!');
    }
}

// Global scope for inline events
window.switchTab = switchTab;
window.handleFileUpload = handleFileUpload;
window.logout = logout;
window.toggle2FA = toggle2FA;
window.deleteOrder = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este pedido permanentemente?')) return;
    
    try {
        const { error } = await supabaseClient.from('orders').delete().eq('id', id);
        if (error) throw error;
        
        showToast('Pedido excluído com sucesso!');
        allOrders = allOrders.filter(o => o.id !== id);
        updateOrderStats(allOrders);
        renderOrdersTable(allOrders);
    } catch (err) {
        console.error(err);
        showToast('Erro ao excluir pedido', 'error');
    }
};
window.resetAllOrders = async () => {
    if (!confirm('ATENÇÃO: Isso irá apagar TODO o histórico de pedidos e receita para sempre. Deseja continuar?')) return;
    const confirmation = prompt('Digite "RESETAR" para confirmar a exclusão total:');
    if (confirmation !== 'RESETAR') return;

    try {
        const { error } = await supabaseClient.from('orders').delete().neq('id', 0); // Delete all
        if (error) throw error;

        showToast('Histórico resetado com sucesso!');
        allOrders = [];
        updateOrderStats([]);
        renderOrdersTable([]);
        if (salesChart) renderSalesChart([]);
    } catch (err) {
        console.error(err);
        showToast('Erro ao resetar histórico', 'error');
    }
};
window.showAddProductForm = showAddProductForm;
window.hideProductForm = hideProductForm;
window.showAddCategoryForm = showAddCategoryForm;
window.hideCategoryForm = hideCategoryForm;
window.loadCategoriesAdmin = loadCategoriesAdmin;
window.showAddCarouselForm = showAddCarouselForm;
window.hideCarouselForm = hideCarouselForm;
window.loadCarouselAdmin = loadCarouselAdmin;
window.seedCarouselData = seedCarouselData;
window.toggleSidebar = toggleSidebar;
window.toggle2FA = toggle2FA;
window.navigateChart = navigateChart;
window.jumpToDate = jumpToDate;
window.show2FASetup = show2FASetup;
window.hide2FASetup = hide2FASetup;
window.confirm2FASetup = confirm2FASetup;

// New Content & Analytics Exports
window.fetchRecentVisits = fetchRecentVisits;
window.loadServicesAdmin = loadServicesAdmin;
window.showServiceModal = showServiceModal;
window.hideServiceModal = hideServiceModal;
window.deleteService = deleteService;
window.loadMomentosAdmin = loadMomentosAdmin;
window.showMomentoModal = showMomentoModal;
window.hideMomentoModal = hideMomentoModal;
window.deleteMomento = deleteMomento;

window.loadTrabalhosAdmin = loadTrabalhosAdmin;
window.showAddTrabalhoForm = showAddTrabalhoForm;
window.hideTrabalhoForm = hideTrabalhoForm;
window.deleteTrabalho = deleteTrabalho;
window.editTrabalho = editTrabalho;

// ==========================================
// REALTIME UPDATES (SHOPIFY/WHATSAPP STYLE)
// ==========================================
function setupRealtimeListeners() {
    if (!supabaseClient) return;

    // 1. Escutar Novos Pedidos e Mudanças de Status
    supabaseClient
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            console.log('Realtime Order Change:', payload);
            // Mostrar Toast se for um novo pedido
            if (payload.eventType === 'INSERT') {
                showToast('🚀 Novo pedido recebido!', 'success');
            }
            // Recarregar os dados se a aba de pedidos estiver ativa ou no dashboard
            if (document.getElementById('nav-orders').classList.contains('active')) {
                loadOrdersAdmin();
            } else if (document.getElementById('nav-dashboard').classList.contains('active')) {
                // Atualizar stats do dashboard (contagem de produtos/vendas) se necessário
            }
        })
        .subscribe();

    // 2. Escutar Visitas em Tempo Real
    supabaseClient
        .channel('public:page_visits')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_visits' }, (payload) => {
            console.log('Realtime Visit:', payload);
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardData();
            }
        })
        .subscribe();

    // 3. Escutar Mudanças em Produtos
    supabaseClient
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
            console.log('Realtime Product Change:', payload);
            if (document.getElementById('products').classList.contains('active')) {
                loadProductsAdmin();
            } else if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardData(); // Update products count
            }
        })
        .subscribe();

    // 4. Escutar Mudanças em Categorias
    supabaseClient
        .channel('public:categories')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
            console.log('Realtime Category Change:', payload);
            if (document.getElementById('categories').classList.contains('active')) {
                loadCategoriesAdmin();
            }
        })
        .subscribe();

    // 5. Escutar Mudanças em Outros Conteúdos (Carrossel, Serviços, Trabalhos)
    ['carousel_items', 'site_services', 'nossos_trabalhos', 'site_momentos'].forEach(table => {
        supabaseClient
            .channel(`public:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: table }, (payload) => {
                console.log(`Realtime ${table} Change:`, payload);
                // Recarregar aba ativa se o ID corresponder
                if (document.getElementById('carousel-editor').classList.contains('active') && table === 'carousel_items') loadCarouselAdmin();
                if (document.getElementById('content-mgmt').classList.contains('active')) {
                    if (table === 'site_services') loadServicesAdmin();
                    if (table === 'site_momentos') loadMomentosAdmin();
                }
                if (document.getElementById('trabalhos-editor').classList.contains('active') && table === 'nossos_trabalhos') loadTrabalhosAdmin();
            })
            .subscribe();
    });
    // 6. Escutar Mudanças em Configurações (site_settings)
    supabaseClient
        .channel('public:site_settings')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, (payload) => {
            console.log('Realtime Setting Change:', payload);
            loadSettingsToForms();
        })
        .subscribe();

    // 7. Monitoramento de Presença (Visitantes Online)
    const presenceChannel = supabaseClient.channel('online-visitors');
    
    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            
            // Filtrar apenas clientes (que não tem user: 'admin')
            const customers = Object.values(state)
                .flat()
                .filter(p => p.user !== 'admin');
            
            const onlineCount = customers.length;
            const el = document.getElementById('online-count');
            const dot = document.getElementById('status-dot');
            
            if (el) el.innerText = onlineCount;
            
            if (dot) {
                if (onlineCount > 0) {
                    dot.className = 'status-dot pulse-green';
                } else {
                    dot.className = 'status-dot pulse-red';
                }
            }
            console.log('Online customers sync:', onlineCount);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ online_at: new Date().toISOString(), user: 'admin' });
            }
        });
}

// ==========================================
// PAYMENT CONFIGURATION
// ==========================================
async function loadPaymentSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('payment_config')
            .select('*')
            .maybeSingle();

        if (data) {
            document.getElementById('payment-enabled-toggle').checked = data.is_enabled;
            document.getElementById('payment-provider').value = data.provider || 'generic';
            document.getElementById('payment-public-key').value = data.public_key || '';
            document.getElementById('payment-secret-key').value = data.secret_key || ''; // Placeholder, usually masked
            document.getElementById('payment-currency').value = data.currency || 'MZN';
        }
    } catch (e) {
        console.error('Erro ao carregar configs de pagamento:', e);
    }
}

document.getElementById('payment-config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const config = {
        is_enabled: document.getElementById('payment-enabled-toggle').checked,
        provider: document.getElementById('payment-provider').value,
        public_key: document.getElementById('payment-public-key').value,
        secret_key: document.getElementById('payment-secret-key').value,
        currency: document.getElementById('payment-currency').value,
        updated_at: new Date()
    };

    try {
        // Check if exists
        const { data: existing } = await supabaseClient.from('payment_config').select('id').maybeSingle();

        let result;
        if (existing) {
            result = await supabaseClient.from('payment_config').update(config).eq('id', existing.id);
        } else {
            result = await supabaseClient.from('payment_config').insert([config]);
        }

        if (result.error) throw result.error;

        showToast('Configurações de pagamento salvas com sucesso!', 'success');
    } catch (err) {
        console.error('Erro ao salvar pagamentos:', err);
        showToast('Erro ao salvar configurações.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// ==========================================
// ORDERS MANAGEMENT
// ==========================================

async function loadOrdersAdmin() {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';

    const { data, error } = await supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        tableBody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center;">Erro ao carregar dados</td></tr>';
        return;
    }

    allOrders = data;
    updateOrderStats(data);
    renderOrdersTable(data);
    renderSalesChart(data); // Render chart here
}

function updateOrderStats(orders) {
    const totalCount = orders.length;
    const pendingCount = orders.filter(o => o.status === 'pendente').length;
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    document.getElementById('orders-total-count').innerText = totalCount;
    document.getElementById('orders-pending-count').innerText = pendingCount;
    document.getElementById('orders-revenue').innerText = totalRevenue.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });
}

function renderOrdersTable(orders) {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        // Fix for NaN/0: ensure quantity is a number and handle missing items
        const itemsCount = Array.isArray(order.items) ? order.items.reduce((sum, i) => sum + (parseInt(i.quantity || i.qty) || 0), 0) : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">#${order.order_code}</td>
            <td>${date}</td>
            <td>${itemsCount} itens</td>
            <td style="font-weight: 500;">${parseFloat(order.total).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</td>
            <td><i class="fab fa-whatsapp" style="color:#25D366"></i> WhatsApp</td>
            <td>
                <select onchange="updateOrderStatus(${order.id}, this.value)" class="status-badge" style="background: ${getStatusColor(order.status)}; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">
                    <option value="pendente" ${order.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="confirmado" ${order.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                    <option value="concluido" ${order.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                    <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td>
                <div style="display: flex; gap: 5px; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick="downloadInvoice(${order.id})" title="Baixar Fatura PDF">
                        <i class="fas fa-file-invoice-dollar"></i> PDF
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteOrder(${order.id})" title="Excluir Pedido">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function getStatusColor(status) {
    switch (status) {
        case 'pendente': return '#f59e0b'; // Amber
        case 'confirmado': return '#0ea5e9'; // Sky Blue
        case 'concluido': return '#10b981'; // Emerald
        case 'cancelado': return '#ef4444'; // Red
        default: return '#64748b'; // Slate
    }
}

let salesChart = null;
let currentChartPeriod = 'daily';

// SEARCH ORDERS
function searchOrders() {
    const query = document.getElementById('order-search-input').value.toLowerCase();
    const activeFilter = document.querySelector('.order-filter-btn.active').dataset.status;

    let filtered = allOrders;

    // Apply Status Filter first
    if (activeFilter !== 'all') {
        filtered = filtered.filter(o => o.status === activeFilter);
    }

    // Apply Search Query
    if (query) {
        filtered = filtered.filter(o =>
            o.order_code.toLowerCase().includes(query) ||
            (o.client_id && o.client_id.toLowerCase().includes(query))
        );
    }

    renderOrdersTable(filtered);
}

// PERIOD SWITCHER
window.changeChartPeriod = (period, btn) => {
    currentChartPeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSalesChart(allOrders);
};

// MULTI-PERIOD SALES CHART
function renderSalesChart(orders, refDate = salesDate) {
    salesDate = new Date(refDate);
    const datePicker = document.getElementById('sales-date-picker');
    if (datePicker) datePicker.value = salesDate.toISOString().split('T')[0];

    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    if (salesChart) salesChart.destroy();

    const dataMap = new Map();
    const today = new Date(salesDate);
    today.setHours(0, 0, 0, 0);

    if (currentChartPeriod === 'daily') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dataMap.set(d.toLocaleDateString(), 0);
        }
        orders.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString();
            if (dataMap.has(date)) {
                dataMap.set(date, dataMap.get(date) + (parseFloat(o.total) || 0));
            }
        });
    } else if (currentChartPeriod === 'weekly') {
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - (i * 7));
            // Get start of week (Sunday)
            const startOfWeek = new Date(d);
            startOfWeek.setDate(d.getDate() - d.getDay());
            dataMap.set(`Semana ${startOfWeek.toLocaleDateString()}`, 0);
        }
        orders.forEach(o => {
            const d = new Date(o.created_at);
            const start = new Date(d);
            start.setDate(d.getDate() - d.getDay());
            const key = `Semana ${start.toLocaleDateString()}`;
            if (dataMap.has(key)) {
                dataMap.set(key, dataMap.get(key) + (parseFloat(o.total) || 0));
            }
        });
    } else if (currentChartPeriod === 'monthly') {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today);
            d.setMonth(today.getMonth() - i);
            const key = d.toLocaleString('pt-MZ', { month: 'short', year: 'numeric' });
            dataMap.set(key, 0);
        }
        orders.forEach(o => {
            const d = new Date(o.created_at);
            const key = d.toLocaleString('pt-MZ', { month: 'short', year: 'numeric' });
            if (dataMap.has(key)) {
                dataMap.set(key, dataMap.get(key) + (parseFloat(o.total) || 0));
            }
        });
    }

    const labels = Array.from(dataMap.keys());
    const values = Array.from(dataMap.values());

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Receita (MT)',
                data: values,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return 'Receita: ' + context.parsed.y.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function (value) {
                            return value.toLocaleString('pt-MZ') + ' MT';
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

window.filterOrders = (status, btn) => {
    // UI update
    document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Filter logic
    searchOrders(); // Re-trigger search which combines filters
};

window.updateOrderStatus = async (id, newStatus) => {
    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;

        showToast('Status atualizado!');
        // Update local data and UI
        const order = allOrders.find(o => o.id === id);
        if (order) order.status = newStatus;
        updateOrderStats(allOrders);

        // Refresh table colors (re-render current filter if needed, or just let select change stay)
    } catch (err) {
        console.error(err);
        showToast('Erro ao atualizar status', 'error');
    }
};

window.downloadInvoice = async (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Official Logo - Fixed Path
        const logoPath = '../assets/images/Logo Official 2019 E 2024Cor caregada.png';
        try {
            // Tentativa de adicionar o logo no canto superior esquerdo para organização
            doc.addImage(logoPath, 'PNG', 15, 10, 30, 30);
            // Posicionamento: X=15, Y=10, Largura=30, Altura=30
        } catch (logoErr) {
            console.warn('Logo could not be added to PDF:', logoErr);
            // Fallback: Título em texto se o logo falhar
            doc.setFontSize(22);
            doc.setTextColor(230, 57, 70);
            doc.text('DIVINOS GRAFFIC', 105, 30, { align: 'center' });
        }

        // Header (Ajustado se houver logo)
        const headerY = 55;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Maputo, Moçambique | Tel: +258 84 880 0311', 105, headerY, { align: 'center' });

        doc.setDrawColor(220);
        doc.line(20, 35, 190, 35);

        // Order Info
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`FATURA / RECIBO: #${order.order_code}`, 20, 45);

        doc.setFontSize(10);
        doc.text(`Data: ${new Date(order.created_at).toLocaleString()}`, 20, 52);
        doc.text(`Canal: WhatsApp`, 20, 57);
        doc.text(`Status: ${order.status.toUpperCase()}`, 20, 62);

        // Table of Items
        const tableData = [];
        if (Array.isArray(order.items)) {
            order.items.forEach(item => {
                const qty = parseInt(item.quantity) || 0;
                const priceNum = parseFloat(item.price) || 0;
                tableData.push([
                    item.title,
                    item.size || '-',
                    qty,
                    priceNum.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }),
                    (priceNum * qty).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })
                ]);
            });
        }

        doc.autoTable({
            startY: headerY + 40,
            head: [['Produto', 'Tamanho', 'Qtd', 'Preço Unit.', 'Subtotal']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            columnStyles: {
                2: { halign: 'center' },
                3: { halign: 'right' },
                4: { halign: 'right' }
            }
        });

        // Total
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL FINAL: ${parseFloat(order.total).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}`, 190, finalY, { align: 'right' });

        // Footer
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.text('Obrigado por escolher a Divinos Graffic!', 105, 280, { align: 'center' });

        // Save
        doc.save(`Fatura_Divinos_${order.order_code}.pdf`);
        showToast('Fatura gerada com sucesso!');

    } catch (err) {
        console.error('PDF Error:', err);
        showToast('Erro ao gerar PDF: ' + err.message, 'error');
    }
};

// Auto-fill sizes for "Quadros" category
window.handleCategoryChange = function(category) {
    const sizesInput = document.getElementById('prod-sizes');
    if (category && category.toLowerCase() === 'quadros') {
        // Se estiver vazio, auto preenche.
        if (sizesInput && !sizesInput.value.trim()) {
            sizesInput.value = 'A0, A1, A2, A3, A4, A5';
        }
    }
};
