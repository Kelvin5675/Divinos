/**
 * PRODUCT DETAIL PAGE FUNCTIONALITY
 * Carrega e renderiza dados de um produto específico
 */
const h = window.location.hostname;
const API_BASE_URL = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.') || h.startsWith('10.')
    ? `http://${h}:8000/api/v1`
    : 'https://divinos-backend.onrender.com/api/v1';

let productId = null; // Global scope for access in functions
let selectedSize = null; // Selected size for products with size options
let currentProduct = null; // Current product being displayed

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    // Obter ID do produto via hash (ex: product-detail.html#5)
    // Using hash because 'npx serve' strips query parameters with clean URLs
    productId = window.location.hash.substring(1); // Remove the # character

    if (!productId) {
        console.error('ID do produto não encontrado na URL.');
        alert('Produto não especificado! Retornando para a lista.');
        window.location.href = 'products.html'; // Relative path since we're in /pages/
        return;
    }

    // Wait for Supabase to be ready if needed, though usually it's ready by now if loaded in head
    if (!window.supabaseClient) {
        console.error('Supabase client não disponível');
        return;
    }

    await loadProductDetails();
    initializeEventListeners();
});

/**
 * Carregar detalhes do produto
 */
async function loadProductDetails() {
    try {
        if (!productId) return;

        // Buscar produto pelo ID na API Node.js
        console.log("DEBUG: Buscando detalhes do produto...", productId);
        console.log("DEBUG: Buscando detalhes do produto no Supabase...", productId);
        const { data: product, error: prodError } = await window.supabaseClient.from('products').select('*').eq('id', productId).single();

        if (prodError || !product) {
            console.error('Erro na requisição do Supabase:', prodError);
            alert('Produto não encontrado ou erro no servidor.');
            window.location.href = '../products.html';
            return;
        }

        currentProduct = product;
        renderProductDetails(product);
        await loadRelatedProducts(product.category);

    } catch (e) {
        console.error('Exceção ao carregar produto:', e);
    }
}

/**
 * Renderizar detalhes do produto na página
 */
function renderProductDetails(product) {
    // Título e breadcrumb
    document.getElementById('product-title').textContent = product.title;
    document.getElementById('breadcrumb-product').textContent = product.title;
    document.title = `${product.title} - Divinos Graffic`;

    // Badge (se existir)
    if (product.badge) {
        const badgeEl = document.getElementById('product-badge');
        badgeEl.textContent = product.badge;
        badgeEl.style.display = 'inline-block';
    }

    // Avaliação
    const rating = product.rating || 0;
    const reviewCount = product.review_count || 0;
    renderStars('product-stars', rating);
    document.getElementById('review-count').textContent = `(${reviewCount} ${reviewCount === 1 ? 'Avaliação' : 'Avaliações'})`;

    // Preço
    const price = parseFloat(product.price) || 0;
    const discount = product.discount_percentage || 0;

    document.getElementById('current-price').textContent = `${price} MT`;

    if (discount > 0) {
        const oldPrice = (price / (1 - discount / 100)).toFixed(2);
        const oldPriceEl = document.getElementById('old-price');
        oldPriceEl.textContent = `${oldPrice} MT`;
        oldPriceEl.style.display = 'inline';

        const discountBadge = document.getElementById('discount-percentage');
        discountBadge.textContent = `-${discount}%`;
        discountBadge.style.display = 'inline-block';
    }

    // Descrição curta
    // Descrição curta (Renderizar HTML)
    document.getElementById('product-short-desc').innerHTML = product.description || 'Sem descrição disponível.';

    // Galeria de imagens
    renderGallery(product);

    // Tamanhos (se existir)
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        renderSizes(product.sizes);
    }

    // Meta informações
    document.querySelector('#product-sku span').textContent = product.sku || `PRD${String(product.id).padStart(6, '0')}`;
    document.querySelector('#product-category span').textContent = product.category || 'Sem categoria';

    if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
        const tagsEl = document.getElementById('product-tags');
        tagsEl.querySelector('span').textContent = product.tags.join(', ');
        tagsEl.style.display = 'block';
    }

    // Descrição longa (tab)
    const longDesc = product.long_description || product.description || 'Sem descrição detalhada.';
    document.getElementById('product-long-description').innerHTML = `<p>${longDesc.replace(/\n/g, '<br>')}</p>`;

    // Informações adicionais (tab)
    renderAdditionalInfo(product);

    // Reviews (tab)
    renderReviews(product);

    // WhatsApp button
    const whatsappBtn = document.getElementById('btn-whatsapp');
    if (whatsappBtn) {
        whatsappBtn.onclick = (e) => {
            e.preventDefault();
            const message = `Olá, gostaria de comprar: ${product.title}`;
            window.location.href = `https://wa.me/258828800311?text=${encodeURIComponent(message)}`;
        };
    }

    // Botão Pagar Agora (Feature Flag)
    const buyNowBtn = document.getElementById('buy-now-btn');
    if (buyNowBtn) {
        // Verificar configuração global (carregada em data-loader.js)
        const paymentSettings = window.siteSettings?.payment;
        if (paymentSettings && paymentSettings.is_enabled) {
            buyNowBtn.style.display = 'flex'; // Exibir se ativo
            buyNowBtn.onclick = (e) => {
                e.preventDefault();
                
                // Pegar quantidade e tamanho selecionado
                const qtyInput = document.getElementById('product-quantity');
                const quantity = parseInt(qtyInput ? qtyInput.value : 1) || 1;
                
                const cartItem = {
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    image_url: product.image_url,
                    qty: quantity,
                    size: typeof selectedSize !== 'undefined' ? (selectedSize || null) : null
                };

                // Adicionar ao carrinho local storage antes de redirecionar
                const saved = localStorage.getItem('divinos_cart');
                let currentCart = saved ? JSON.parse(saved) : [];
                
                const existsId = currentCart.findIndex(item => item.id == product.id && item.size == cartItem.size);
                if (existsId >= 0) {
                    currentCart[existsId].qty = (currentCart[existsId].qty || currentCart[existsId].quantity || 1) + quantity;
                } else {
                    currentCart.push(cartItem);
                }
                
                localStorage.setItem('divinos_cart', JSON.stringify(currentCart));

                // Redirecionar para Checkout
                window.location.href = '../pages/checkout.html';
            };
        } else {
            buyNowBtn.style.display = 'none'; // Ocultar se inativo
        }
    }

    // Social share
    setupSocialShare(product);

    // Carregar dados dinâmicos
    checkFavoriteStatus(product.id);
    loadProductReviews(product.id);
}

/**
 * Renderizar estrelas de avaliação
 */
function renderStars(elementId, rating) {
    const container = document.getElementById(elementId);
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let html = '';

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            html += '<i class="fas fa-star"></i>';
        } else if (i === fullStars && hasHalfStar) {
            html += '<i class="fas fa-star-half-alt"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }

    container.innerHTML = html;
}

/**
 * Renderizar galeria de imagens como CAROUSEL
 */
let galleryImages = [];
let galleryIndex = 0;
let galleryAutoplay = null;

function renderGallery(product) {
    const mainImage = document.getElementById('main-product-image');
    const mainContainer = mainImage.parentElement;
    const dotsContainer = document.getElementById('gallery-dots');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');

    // Processar gallery
    galleryImages = [];
    if (product.image_url) {
        galleryImages.push(product.image_url);
    }

    if (product.gallery) {
        if (Array.isArray(product.gallery)) {
            galleryImages = galleryImages.concat(product.gallery);
        } else if (typeof product.gallery === 'string') {
            try {
                const parsed = JSON.parse(product.gallery);
                if (Array.isArray(parsed)) {
                    galleryImages = galleryImages.concat(parsed);
                }
            } catch (e) {
                console.warn('Erro ao parsear gallery:', e);
            }
        }
    }

    // Se não houver imagens, usar placeholder
    if (galleryImages.length === 0) {
        galleryImages = ['../images/placeholder.jpg'];
    }

    // Show loading on main image
    mainContainer.classList.add('loading');
    mainImage.style.opacity = '0';

    // Set initial image
    galleryIndex = 0;
    loadGalleryImage(galleryIndex);

    // Render dots
    dotsContainer.innerHTML = '';
    if (galleryImages.length > 1) {
        galleryImages.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
            dot.onclick = () => {
                galleryIndex = i;
                loadGalleryImage(galleryIndex);
                resetGalleryAutoplay();
            };
            dotsContainer.appendChild(dot);
        });

        // Show arrows
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';

        // Arrow click handlers
        prevBtn.onclick = () => {
            galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
            loadGalleryImage(galleryIndex);
            resetGalleryAutoplay();
        };
        nextBtn.onclick = () => {
            galleryIndex = (galleryIndex + 1) % galleryImages.length;
            loadGalleryImage(galleryIndex);
            resetGalleryAutoplay();
        };

        // Autoplay every 5 seconds
        startGalleryAutoplay();
    } else {
        // Hide arrows and dots for single image
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

function loadGalleryImage(index) {
    const mainImage = document.getElementById('main-product-image');
    const mainContainer = mainImage.parentElement;

    mainContainer.classList.add('loading');
    mainImage.style.opacity = '0';

    const img = new Image();
    img.onload = function () {
        mainImage.src = this.src;
        mainImage.style.opacity = '1';
        mainContainer.classList.remove('loading');
    };
    img.onerror = function () {
        mainImage.src = '../images/placeholder.jpg';
        mainImage.style.opacity = '1';
        mainContainer.classList.remove('loading');
    };
    img.src = galleryImages[index];

    // Update dots
    const dots = document.querySelectorAll('.gallery-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function startGalleryAutoplay() {
    stopGalleryAutoplay();
    galleryAutoplay = setInterval(() => {
        galleryIndex = (galleryIndex + 1) % galleryImages.length;
        loadGalleryImage(galleryIndex);
    }, 5000);
}

function stopGalleryAutoplay() {
    if (galleryAutoplay) {
        clearInterval(galleryAutoplay);
        galleryAutoplay = null;
    }
}

function resetGalleryAutoplay() {
    stopGalleryAutoplay();
    startGalleryAutoplay();
}

/**
 * Renderizar seletor de tamanhos
 */
function renderSizes(sizes) {
    const sizeSection = document.getElementById('size-selector-section');
    const sizeButtons = document.getElementById('size-buttons');

    sizeButtons.innerHTML = '';
    sizes.forEach((size, index) => {
        const btn = document.createElement('button');
        btn.className = 'size-btn';
        btn.textContent = size;
        btn.onclick = () => {
            sizeButtons.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSize = size;
        };

        // Selecionar primeiro tamanho por padrão
        if (index === 0) {
            btn.classList.add('active');
            selectedSize = size;
        }

        sizeButtons.appendChild(btn);
    });

    sizeSection.style.display = 'block';
}

/**
 * Renderizar informações adicionais
 */
function renderAdditionalInfo(product) {
    const table = document.querySelector('#additional-info-table tbody');
    table.innerHTML = '';

    // Se tiver additional_info em JSON
    if (product.additional_info && typeof product.additional_info === 'object') {
        Object.entries(product.additional_info).forEach(([key, value]) => {
            const row = table.insertRow();
            row.innerHTML = `<td><strong>${key}</strong></td><td>${value}</td>`;
        });
    } else {
        // Info padrão
        const defaultInfo = {
            'SKU': product.sku || `PRD${String(product.id).padStart(6, '0')}`,
            'Categoria': product.category || 'Sem categoria',
            'Disponibilidade': 'Em estoque'
        };

        if (product.sizes && product.sizes.length > 0) {
            defaultInfo['Tamanhos'] = product.sizes.join(', ');
        }

        Object.entries(defaultInfo).forEach(([key, value]) => {
            const row = table.insertRow();
            row.innerHTML = `<td><strong>${key}</strong></td><td>${value}</td>`;
        });
    }
}

/**
 * Renderizar seção de avaliações
 */
/**
 * Renderizar seção de avaliações (Resumo inicial)
 */
function renderReviews(product) {
    const rating = product.rating || 0;
    const reviewCount = product.review_count || 0;

    // Atualiza o resumo no topo da página (se existir)
    const avgRatingEl = document.getElementById('avg-rating'); // Verifica se este elemento ainda existe ou se foi o removido
    if (avgRatingEl) avgRatingEl.textContent = rating.toFixed(1);

    // Atualiza novos elementos da aba de reviews se já existirem (caso contrário loadProductReviews fará isso)
    const displayRating = document.getElementById('avg-rating-display');
    if (displayRating) displayRating.textContent = rating.toFixed(1);

    const displayCount = document.getElementById('total-reviews-display');
    if (displayCount) displayCount.textContent = `(${reviewCount} avaliações)`;

    renderStars('avg-stars-display', rating);
}

/**
 * Carregar produtos relacionados (mesma categoria)
 */
async function loadRelatedProducts(category) {
    try {
        // We use query params in the new API
        // Currently the API only has featured and limit params, let's fetch all products
        // and filter in the client for now to avoid extending the API prematurely
        const { data: allProducts, error: prodError } = await window.supabaseClient.from('products').select('*').limit(50);
        if (prodError) throw new Error('Falha ao carregar produtos do Supabase: ' + prodError.message);

        const relatedProducts = allProducts.filter(p =>
            p.category === category && p.id.toString() !== productId.toString()
        ).slice(0, 4);

        if (relatedProducts.length === 0) {
            const section = document.querySelector('.related-products-section');
            if (section) section.style.display = 'none';
            return;
        }

        const grid = document.getElementById('related-products-grid');
        grid.innerHTML = '';

        relatedProducts.forEach(p => {
            grid.appendChild(createProductCard(p));
        });

    } catch (e) {
        console.error('Erro ao carregar produtos relacionados:', e);
    }
}

/**
 * Criar card de produto (estilo atualizado)
 */
function createProductCard(product) {
    const div = document.createElement('div');
    div.className = 'product-card new-style fade-in';
    div.setAttribute('data-category', product.category || 'Outros');

    const imgUrl = product.image_url || '../images/placeholder.jpg';
    const price = parseFloat(product.price) || 0;
    const discount = product.discount_percentage || 0;
    const rating = product.rating || 0;

    let priceHTML = `<span class="current-price">${price} MT</span>`;
    let discountBadge = '';

    if (discount > 0) {
        const oldPrice = (price / (1 - discount / 100)).toFixed(2);
        priceHTML = `
            <span class="current-price">${price} MT</span>
            <span class="old-price">${oldPrice} MT</span>
        `;
        discountBadge = `<span class="discount-badge">${discount}% off</span>`;
    }

    div.innerHTML = `
        <div class="product-image-wrapper">
            ${discountBadge}
            <img src="${imgUrl}" alt="${product.title}">
            <div class="product-quick-actions">
                <button class="action-icon wishlist" title="Adicionar aos favoritos">
                    <i class="far fa-heart"></i>
                </button>
                <button class="action-icon quick-view" title="Visualização rápida" onclick="window.location.href='product-detail.html?id=${product.id}'">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
        <div class="product-card-info">
            <a href="product-detail.html?id=${product.id}" class="product-name">${product.title}</a>
            <div class="product-rating-compact">
                <span class="stars-compact">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5 - Math.floor(rating))}</span>
                <span class="rating-value">${rating.toFixed(1)}</span>
            </div>
            <div class="product-price-compact">
                ${priceHTML}
            </div>
        </div>
    `;

    return div;
}

/**
 * Configurar compartilhamento social
 */
function setupSocialShare(product) {
    const url = window.location.href;
    const text = `Confira este produto: ${product.title}`;

    document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    document.getElementById('share-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
}

/**
 * Inicializar event listeners
 */
function initializeEventListeners() {
    // Controle de quantidade
    const qtyInput = document.getElementById('product-quantity');
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');

    qtyMinus.onclick = () => {
        const current = parseInt(qtyInput.value) || 1;
        if (current > 1) {
            qtyInput.value = current - 1;
        }
    };

    qtyPlus.onclick = () => {
        const current = parseInt(qtyInput.value) || 1;
        qtyInput.value = current + 1;
    };

    // Comprar via WhatsApp (Buy Now)
    const btnWhatsapp = document.getElementById('btn-whatsapp');
    if (btnWhatsapp) {
        btnWhatsapp.onclick = (e) => {
            e.preventDefault();
            buyNowWhatsApp();
        };
    }

    // Adicionar ao carrinho
    document.getElementById('btn-add-cart').onclick = () => {
        if (!currentProduct) return;

        const quantity = parseInt(qtyInput.value) || 1;
        const cartItem = {
            id: currentProduct.id,
            title: currentProduct.title,
            price: currentProduct.price,
            image_url: currentProduct.image_url,
            quantity: quantity,
            size: selectedSize
        };

        // Usar função addToCart existente do cart.js
        if (typeof addToCart === 'function') {
            addToCart(cartItem, document.getElementById('btn-add-cart'));
        }
    };

    // Wishlist
    const wishlistBtn = document.getElementById('btn-wishlist');
    wishlistBtn.onclick = () => {
        toggleFavorite();
    };

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const targetTab = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        };
    });

    // Review Form Submit
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', submitReviewForm);
    }
}

// ==========================================
// CLIENT IDENTITY (UUID)
// ==========================================
function getOrCreateClientId() {
    let clientId = localStorage.getItem('divinos_client_id');
    if (!clientId) {
        // Simple UUID generator
        clientId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('divinos_client_id', clientId);
    }
    return clientId;
}

// ==========================================
// FAVORITES SYSTEM
// ==========================================
async function checkFavoriteStatus(prodId) {
    if (!prodId) return;
    const clientId = getOrCreateClientId();
    const btn = document.getElementById('btn-wishlist');

    try {
        const { data, error } = await window.supabaseClient
            .from('product_favorites')
            .select('id')
            .eq('product_id', prodId)
            .eq('client_id', clientId)
            .maybeSingle();

        if (data) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i>'; // Solid heart
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="far fa-heart"></i>'; // Outline heart
        }
    } catch (e) {
        console.error('Erro ao verificar favoritos:', e);
    }
}

async function toggleFavorite() {
    if (!currentProduct) return;
    const clientId = getOrCreateClientId();
    const btn = document.getElementById('btn-wishlist');
    const isActive = btn.classList.contains('active');

    // Optimistic UI update
    btn.classList.toggle('active');
    btn.innerHTML = isActive ? '<i class="far fa-heart"></i>' : '<i class="fas fa-heart"></i>';

    try {
        if (isActive) {
            // Remove
            await window.supabaseClient
                .from('product_favorites')
                .delete()
                .eq('product_id', currentProduct.id)
                .eq('client_id', clientId);
        } else {
            // Add
            await window.supabaseClient
                .from('product_favorites')
                .insert([{
                    product_id: currentProduct.id,
                    client_id: clientId
                }]);
        }
    } catch (e) {
        console.error('Erro ao alterar favoritos:', e);
        // Revert UI on error
        btn.classList.toggle('active');
        btn.innerHTML = isActive ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        alert('Erro ao atualizar favoritos. Tente novamente.');
    }
}

// ==========================================
// REVIEWS SYSTEM
// ==========================================
let reviewPhotos = [];

function toggleReviewForm() {
    const container = document.getElementById('review-form-container');
    container.classList.toggle('active');
    // Scroll to form if opening
    if (container.classList.contains('active')) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function handleReviewPhotos(input) {
    const files = Array.from(input.files);
    const previewContainer = document.getElementById('review-photos-preview');

    // Limit to 5 photos
    if (files.length + reviewPhotos.length > 5) {
        alert('Máximo de 5 fotos permitidas.');
        return;
    }

    files.forEach(file => {
        reviewPhotos.push(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-photo-item';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

async function uploadReviewImages() {
    if (reviewPhotos.length === 0) return [];

    const uploadedUrls = [];
    for (const file of reviewPhotos) {
        // Sanitize filename
        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${safeName}.${fileExt}`;

        try {
            console.log('Uploading image:', fileName);
            const { data, error } = await window.supabaseClient.storage
                .from('reviews-images')
                .upload(fileName, file);

            if (error) {
                console.error('Supabase Storage Error:', error);
                throw error;
            }

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('reviews-images')
                .getPublicUrl(fileName);

            console.log('Image uploaded successfully:', publicUrl);
            uploadedUrls.push(publicUrl);
        } catch (e) {
            console.error('Erro detalhado upload imagem:', e);
        }
    }
    return uploadedUrls;
}

async function submitReviewForm(e) {
    e.preventDefault();

    if (!currentProduct) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    // Get Form Data
    const userName = document.getElementById('review-name').value;
    const comment = document.getElementById('review-comment').value;
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const rating = ratingInput ? parseInt(ratingInput.value) : 5;

    try {
        // Upload images first
        const photoUrls = await uploadReviewImages();

        // Save to Supabase
        const { error } = await window.supabaseClient
            .from('product_reviews')
            .insert([{
                product_id: currentProduct.id,
                user_name: userName,
                rating: rating,
                comment: comment,
                photos: photoUrls,
                verified: false
            }]);

        if (error) throw error;

        // Reset form and reload
        alert('Obrigado pela sua avaliação!');
        document.getElementById('review-form').reset();
        document.getElementById('review-photos-preview').innerHTML = '';
        reviewPhotos = [];
        toggleReviewForm();

        // Reload reviews
        loadProductReviews(currentProduct.id);

    } catch (err) {
        console.error('Erro ao enviar avaliação:', err);
        alert('Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function loadProductReviews(prodId) {
    const listContainer = document.getElementById('reviews-list');
    if (!listContainer) return; // Segurança

    try {
        const { data: reviews, error } = await window.supabaseClient
            .from('product_reviews')
            .select('*')
            .eq('product_id', prodId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calcular estatísticas reais baseadas nas reviews
        let avg = 0;
        let total = 0;

        if (reviews && reviews.length > 0) {
            total = reviews.length;
            avg = reviews.reduce((acc, curr) => acc + curr.rating, 0) / total;
        }

        // Atualizar UI da Aba de Reviews
        const avgDisplay = document.getElementById('avg-rating-display');
        const countDisplay = document.getElementById('total-reviews-display');

        if (avgDisplay) avgDisplay.textContent = avg.toFixed(1);
        if (countDisplay) countDisplay.textContent = `(${total} avaliações)`;
        renderStars('avg-stars-display', avg);

        // Atualizar UI do Topo da Página (Header do Produto)
        // Isso garante que o usuário veja a média atualizada imediatamente
        const headerStars = document.getElementById('product-stars');
        const headerCount = document.getElementById('review-count');

        if (headerStars) renderStars('product-stars', avg);
        if (headerCount) headerCount.textContent = `(${total} ${total === 1 ? 'Avaliação' : 'Avaliações'})`;

        // Renderizar Lista
        if (reviews && reviews.length > 0) {
            renderReviewsListHTML(listContainer, reviews);
        } else {
            listContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>';
        }

    } catch (e) {
        console.error('Erro ao carregar avaliações:', e);
        listContainer.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar avaliações.</p>';
    }
}

function renderReviewsListHTML(container, reviews) {
    container.innerHTML = '';

    reviews.forEach(review => {
        const date = new Date(review.created_at).toLocaleDateString('pt-BR');
        const initial = review.user_name.charAt(0).toUpperCase();

        let photosHtml = '';
        let photosArray = [];

        // Tratar formats diferentes (array PG vs string JSON)
        if (Array.isArray(review.photos)) {
            photosArray = review.photos;
        } else if (typeof review.photos === 'string') {
            try {
                // Tenta limpar formato Postgres {url,url} se vier como string crua
                const cleanStr = review.photos.replace(/^\{|\}$/g, '').replace(/\"/g, '');
                if (cleanStr) photosArray = cleanStr.split(',');
            } catch (e) {
                console.warn('Erro ao processar fotos da review:', review.photos);
            }
        }

        if (photosArray.length > 0) {
            photosHtml = '<div class="review-photos">';
            photosArray.forEach(url => {
                if (url && url.trim() !== '') {
                    photosHtml += `<img src="${url}" class="review-photo" onclick="window.open('${url}', '_blank')" onerror="this.style.display='none'">`;
                }
            });
            photosHtml += '</div>';
        }

        const div = document.createElement('div');
        div.className = 'review-item';
        div.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">${initial}</div>
                    <div>
                        <div class="reviewer-name">${review.user_name}</div>
                        <div class="review-date">${date}</div>
                    </div>
                </div>
                <div class="review-stars">
                    ${renderStarsHTML(review.rating)}
                </div>
            </div>
            <div class="review-content">
                ${review.comment}
            </div>
            ${photosHtml}
        `;
        container.appendChild(div);
    });
}

function renderStarsHTML(rating) {
    let html = '';
    for (let i = 0; i < 5; i++) {
        if (i < rating) {
            html += '<i class="fas fa-star"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }
    return html;
}

// ==========================================
// BUY NOW VIA WHATSAPP (RECORD ORDER)
// ==========================================
async function buyNowWhatsApp() {
    if (!currentProduct) return;

    const qtyInput = document.getElementById('product-quantity');
    const quantity = parseInt(qtyInput.value) || 1;

    // Generate Order Code
    const orderCode = 'DVN' + new Date().getFullYear() + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    // Build Message
    let msg = `*Olá, Divinos Graffic! Gostaria de comprar este produto agora:*\n\n`;
    msg += `📋 *Pedido: ${orderCode}*\n\n`;

    const priceNum = parseFloat(String(currentProduct.price).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const total = priceNum * quantity;

    msg += `📦 *${quantity}x ${currentProduct.title}*\n`;
    msg += `   Preço: ${currentProduct.price} (Total: ${total.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })})\n`;
    if (selectedSize) msg += `   Tamanho: ${selectedSize}\n`;
    msg += `\n`;

    msg += `---------------------------------\n`;
    msg += `💰 *TOTAL ESTIMADO: ${total.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}*\n`;
    msg += `\n📝 *Aguardo confirmação e dados para pagamento.*`;

    const orderItem = {
        product_id: currentProduct.id,
        title: currentProduct.title,
        price: priceNum,
        quantity: quantity,
        size: selectedSize || null,
        image_url: currentProduct.image_url || null
    };

    // Save order to Supabase
    try {
        console.log('Tentando salvar pedido "Comprar Agora":', orderCode);
        if (window.supabaseClient) {
            const { data, error } = await window.supabaseClient.from('orders').insert({
                order_code: orderCode,
                items: [orderItem],
                total: total,
                channel: 'whatsapp (direto)',
                status: 'pendente',
                client_id: localStorage.getItem('divinos_client_id') || null
            });

            if (error) {
                console.error('Erro ao salvar no Supabase:', error);
                alert('Aviso: O pedido será enviado via WhatsApp, mas não pôde ser registrado no sistema. (Erro: ' + error.message + '). Verifique se a tabela "orders" foi criada no Supabase.');
                throw error;
            }
            console.log('Pedido "Comprar Agora" salvo com sucesso:', orderCode);
        } else {
            console.warn('supabaseClient não encontrado para salvar pedido');
        }
    } catch (e) {
        console.warn('Erro ao salvar pedido (mantendo redirecionamento):', e);
    }

    // Send via WhatsApp
    const phone = "258848800311";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

// Attach to window for onClick events if needed
window.toggleReviewForm = toggleReviewForm;
window.handleReviewPhotos = handleReviewPhotos;
window.buyNowWhatsApp = buyNowWhatsApp;
