// ============================================================
// МОДАЛКА ТОВАРА
// ============================================================

let modalOverlay = null;
let modalBody = null;
let closeBtn = null;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ МОДАЛКИ (вызывается после загрузки шапки)
// ============================================================
function initModal() {
    modalOverlay = document.getElementById('productModal');
    modalBody = document.getElementById('modalBody');
    closeBtn = document.getElementById('closeModal');
    
    if (!modalOverlay || !modalBody) {
        console.log('ℹ️ Модалка не найдена на этой странице');
        return false;
    }
    
    // Навешиваем обработчики (только один раз)
    if (!modalOverlay._initialized) {
        // Закрытие по клику на затемнение
        modalOverlay.addEventListener('click', function(event) {
            if (event.target === modalOverlay) {
                closeModal();
            }
        });
        
        // Закрытие по кнопке
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        modalOverlay._initialized = true;
        console.log('✅ Модалка инициализирована');
    }
    
    return true;
}

// ============================================================
// ОТКРЫТЬ МОДАЛКУ
// ============================================================
function openModal(product) {
    // Проверяем, что модалка инициализирована
    if (!modalOverlay || !modalBody) {
        const initialized = initModal();
        if (!initialized) return;
    }
    
    const imageUrl = product.image ? `http://localhost:3000${product.image}` : '/images/placeholder.jpg';
    const metaData = product.meta_data || [];

    modalBody.innerHTML = `
        <img src="${imageUrl}" alt="${product.name}" class="modal-image" loading="lazy" />
        <h2 class="modal-title">${product.name}</h2>
        <p class="modal-master">✧ Мастер: <a href="/masters/${product.master_slug}/">${product.master_name}</a></p>
        <p class="modal-desc">${product.description || 'Описание товара скоро появится.'}</p>
        ${metaData.length ? `
            <div class="modal-meta">
                ${metaData.map(m => `<span>${m}</span>`).join('')}
            </div>
        ` : ''}
        <div class="modal-price">${(product.price || 0).toLocaleString()} ₽</div>
        <div class="modal-actions">
            <button class="btn btn-primary" onclick="addToCartFromModal('${product.id}', '${product.name}', ${product.price}, '${imageUrl}', '${product.master_name}')">В корзину</button>
            <button class="btn btn-outline" onclick="closeModal()">Закрыть</button>
        </div>
    `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ============================================================
// ЗАКРЫТЬ МОДАЛКУ
// ============================================================
function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================================
// ЗАКРЫТЬ ПО ESC
// ============================================================
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});

// ============================================================
// ДОБАВИТЬ ТОВАР В КОРЗИНУ ИЗ МОДАЛКИ
// ============================================================
function addToCartFromModal(id, name, price, image, master) {
    if (typeof addToCart === 'function') {
        addToCart(id, name, price, image, master);
    } else {
        console.warn('⚠️ addToCart не найдена');
        if (typeof showNotification === 'function') {
            showNotification('❌ Ошибка добавления в корзину');
        }
    }
}

// ============================================================
// КЛИК ПО КАРТОЧКЕ ТОВАРА — ОТКРЫВАЕМ МОДАЛКУ
// ============================================================
document.addEventListener('click', function(event) {
    const card = event.target.closest('.product-card');
    if (!card) return;
    
    // Если кликнули по кнопке "В корзину" — не открываем модалку
    if (event.target.closest('.btn-add')) return;
    
    // Берём slug из data-атрибута
    const productSlug = card.dataset.productSlug;
    if (!productSlug) {
        console.warn('⚠️ У карточки нет data-product-slug');
        return;
    }
    
    // Загружаем данные по SLUG
    fetch(`http://localhost:3000/api/products/${productSlug}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Товар ${productSlug} не найден`);
            }
            return response.json();
        })
        .then(product => {
            // Перед открытием модалки — инициализируем её
            initModal();
            openModal(product);
        })
        .catch(err => {
            console.warn('⚠️', err.message);
            if (typeof showNotification === 'function') {
                showNotification('❌ Товар временно недоступен');
            }
        });
});

// ============================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Пробуем инициализировать модалку (если она уже есть в DOM)
    initModal();
});
