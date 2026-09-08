// ============================================================
// ФУНКЦИЯ ДЛЯ СОЗДАНИЯ КАРТОЧКИ ТОВАРА
// ============================================================
function createProductCard(product) {
    // 👇 Защита от NULL и не-массивов
    const metaData = Array.isArray(product.meta_data) ? product.meta_data : [];
    const masterShort = product.master_name || 'Мастер';
    const imageUrl = `http://localhost:3000${product.image}`;

    return `
            <div class="product-card" data-product-id="${product.id}" data-product-slug="${product.slug}">
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" loading="lazy" />
                ${product.badge ? `<div class="badge">${product.badge}</div>` : ''}
                <div class="master-tag">
                    <strong>${masterShort}</strong>
                </div>
            </div>
            <div class="product-info">
                <div class="product-top">
                    <h3 class="product-name">${product.name}</h3>
                    <span class="product-rating">★ ${product.rating || '0.0'}</span>
                </div>
                <p class="product-desc">${product.description || ''}</p>
                <div class="product-meta">
                    ${metaData.map(m => `<span>${m}</span>`).join('')}
                </div>
                <div class="product-footer">
                    <span class="product-price">${(product.price || 0).toLocaleString()} ₽</span>
                    <button class="btn-add" data-product-id="${product.id}">В корзину</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// ФУНКЦИЯ ДЛЯ ПЕРЕМЕШИВАНИЯ МАССИВА (рандом)
// ============================================================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================================
// РЕНДЕРИНГ НА ГЛАВНОЙ СТРАНИЦЕ (16 случайных товаров)
// ============================================================
async function renderMainPage() {
    const container = document.querySelector('.products-grid');
    if (!container) return;

    try {
        const products = await getProducts();
        const shuffled = shuffleArray([...products]);
        const selected = shuffled.slice(0, 16);
        container.innerHTML = selected.map(createProductCard).join('');
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        container.innerHTML = '<p style="color: var(--text-gray);">Не удалось загрузить товары</p>';
    }
}

// ============================================================
// РЕНДЕРИНГ НА СТРАНИЦЕ МАСТЕРА (все товары мастера)
// ============================================================
async function renderMasterPage() {
    const container = document.querySelector('.works-grid');
    if (!container) return;

    // Определяем slug мастера из URL
    const path = window.location.pathname;
    const match = path.match(/\/masters\/([^\/]+)\//);
    if (!match) {
        container.innerHTML = '<p style="color: var(--text-gray);">Мастер не найден</p>';
        return;
    }

    const slug = match[1];

    try {
        const products = await getMasterProducts(slug);
        const shuffled = shuffleArray([...products]);
        container.innerHTML = shuffled.map(createProductCard).join('');
    } catch (error) {
        console.error('Ошибка загрузки товаров мастера:', error);
        container.innerHTML = '<p style="color: var(--text-gray);">Не удалось загрузить товары мастера</p>';
    }
}

// ============================================================
// АВТОМАТИЧЕСКИЙ ЗАПУСК
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Если есть .products-grid — рендерим главную
    if (document.querySelector('.products-grid')) {
        renderMainPage();
    }
    
    // Если есть .works-grid — рендерим страницу мастера
    if (document.querySelector('.works-grid')) {
        renderMasterPage();
    }
});

