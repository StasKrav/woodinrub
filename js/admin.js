// ============================================================
// АДМИН-ПАНЕЛЬ
// ============================================================

// const API_URL = 'http://localhost:3000/api';

// ============================================================
// УВЕДОМЛЕНИЯ
// ============================================================
function showNotification(message, type = 'success') {
    const notification = document.getElementById('adminNotification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = 'admin-notification show ' + type;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ============================================================
// ТАБЫ
// ============================================================
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.dataset.tab;
        
        // Активный таб
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Активная панель
        document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + tabName).classList.add('active');
        
        // Загружаем данные
        if (tabName === 'masters') loadMasters();
        if (tabName === 'products') loadProducts();
        if (tabName === 'orders') loadOrders();
    });
});

// ============================================================
// ЗАГРУЗКА МАСТЕРОВ
// ============================================================
async function loadMasters() {
    const container = document.getElementById('mastersList');
    if (!container) return;
    
    container.innerHTML = '<p style="color: var(--text-gray);">Загрузка...</p>';
    
    try {
        const response = await fetch(`${API_URL}/masters`);
        const masters = await response.json();
        
        if (masters.length === 0) {
            container.innerHTML = `
                <div class="admin-empty">
                    <h3>Нет мастеров</h3>
                    <p>Добавьте первого мастера через sync.js</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = masters.map(master => `
            <div class="admin-master-card" onclick="editMaster('${master.slug}')">
                <div class="name">${master.name || master.slug}</div>
                <div class="slug">${master.slug}</div>
                <span class="type">${master.type === 'studio' ? 'Студия' : 'Мастер'}</span>
                <div class="stats">
                    <span>Работ: <strong>${master.works_count || 0}</strong></span>
                    <span>Рейтинг: <strong>${master.rating || '0.0'}</strong></span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
        container.innerHTML = '<p style="color: #ff4444;">Ошибка загрузки мастеров</p>';
    }
}

// ============================================================
// РЕДАКТИРОВАНИЕ МАСТЕРА
// ============================================================
async function editMaster(slug) {
    try {
        const response = await fetch(`${API_URL}/masters/${slug}`);
        const data = await response.json();
        const master = data.master;
        
        // Скрываем список, показываем форму
        document.getElementById('mastersList').style.display = 'none';
        const formContainer = document.getElementById('masterFormContainer');
        formContainer.style.display = 'block';
        
        const extra = master.extra_data || {};
        
        formContainer.innerHTML = `
            <div class="admin-form">
                <h2>Редактирование: ${master.name || slug}</h2>
                <form id="editMasterForm">
                    <input type="hidden" id="editMasterSlug" value="${master.slug}" />
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Имя / Название</label>
                            <input type="text" id="editName" value="${master.name || ''}" required />
                        </div>
                        <div class="form-group">
                            <label>Короткое имя</label>
                            <input type="text" id="editShortName" value="${master.short_name || ''}" />
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Тип</label>
                            <select id="editType">
                                <option value="individual" ${master.type === 'individual' ? 'selected' : ''}>Частный мастер</option>
                                <option value="studio" ${master.type === 'studio' ? 'selected' : ''}>Студия / Артель</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Бейдж</label>
                            <input type="text" id="editBadge" value="${master.badge || ''}" placeholder="★ Топ-мастер" />
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Специализация</label>
                        <input type="text" id="editTitle" value="${master.title || ''}" placeholder="Краснодеревщик, столяр-дизайнер" />
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Биография</label>
                        <textarea id="editBio" rows="4">${master.bio || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Город</label>
                            <input type="text" id="editCity" value="${extra.city || ''}" />
                        </div>
                        <div class="form-group">
                            <label>Опыт (лет)</label>
                            <input type="number" id="editExperience" value="${extra.experience || ''}" />
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Образование</label>
                        <input type="text" id="editEducation" value="${extra.education || ''}" />
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Стиль</label>
                        <input type="text" id="editStyle" value="${extra.style || ''}" />
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Материалы (через запятую)</label>
                        <input type="text" id="editMaterials" value="${(extra.materials || []).join(', ')}" />
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Instagram</label>
                            <input type="text" id="editInstagram" value="${extra.instagram || ''}" />
                        </div>
                        <div class="form-group">
                            <label>Телефон</label>
                            <input type="text" id="editPhone" value="${extra.phone || ''}" />
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                        <button type="button" class="btn btn-outline" onclick="cancelMasterEdit()">Отмена</button>
                    </div>
                </form>
            </div>
        `;
        
        // Обработчик формы
        document.getElementById('editMasterForm').addEventListener('submit', saveMaster);
        
    } catch (error) {
        console.error('Ошибка загрузки мастера:', error);
        showNotification('Ошибка загрузки мастера', 'error');
    }
}

// ============================================================
// СОХРАНЕНИЕ МАСТЕРА
// ============================================================
async function saveMaster(event) {
    event.preventDefault();
    
    const slug = document.getElementById('editMasterSlug').value;
    const materials = document.getElementById('editMaterials').value
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);
    
    const data = {
        name: document.getElementById('editName').value.trim(),
        short_name: document.getElementById('editShortName').value.trim(),
        type: document.getElementById('editType').value,
        badge: document.getElementById('editBadge').value.trim(),
        title: document.getElementById('editTitle').value.trim(),
        bio: document.getElementById('editBio').value.trim(),
        city: document.getElementById('editCity').value.trim(),
        experience: document.getElementById('editExperience').value,
        education: document.getElementById('editEducation').value.trim(),
        style: document.getElementById('editStyle').value.trim(),
        materials: materials,
        instagram: document.getElementById('editInstagram').value.trim(),
        phone: document.getElementById('editPhone').value.trim()
    };
    
    try {
        const response = await fetch(`${API_URL}/masters/${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Ошибка сохранения');
        
        showNotification('Мастер сохранён!');
        cancelMasterEdit();
        loadMasters();
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка сохранения', 'error');
    }
}

// ============================================================
// ОТМЕНА РЕДАКТИРОВАНИЯ МАСТЕРА
// ============================================================
function cancelMasterEdit() {
    document.getElementById('masterFormContainer').style.display = 'none';
    document.getElementById('mastersList').style.display = 'grid';
}

// ============================================================
// ЗАГРУЗКА ТОВАРОВ
// ============================================================
async function loadProducts() {
    const container = document.getElementById('productsList');
    if (!container) return;
    
    container.innerHTML = '<p style="color: var(--text-gray);">Загрузка...</p>';
    
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="admin-empty">
                    <h3>Нет товаров</h3>
                    <p>Добавьте товары через info.json + sync.js</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => {
            const imageUrl = product.image ? `http://localhost:3000${product.image}` : '';
            return `
                <div class="admin-product-card" onclick="editProduct('${product.slug}')">
                    <div class="image">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${product.name}" loading="lazy" />` : 'Нет фото'}
                    </div>
                    <div class="info">
                        <div class="name">${product.name}</div>
                        <div class="price">${(product.price || 0).toLocaleString('ru-RU')} ₽</div>
                        <div class="master">Мастер: ${product.master_name || '—'}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        container.innerHTML = '<p style="color: #ff4444;">Ошибка загрузки товаров</p>';
    }
}

// ============================================================
// РЕДАКТИРОВАНИЕ ТОВАРА
// ============================================================
async function editProduct(slug) {
    try {
        const response = await fetch(`${API_URL}/products/${slug}`);
        const product = await response.json();
        
        document.getElementById('productsList').style.display = 'none';
        const formContainer = document.getElementById('productFormContainer');
        formContainer.style.display = 'block';
        
        const metaData = Array.isArray(product.meta_data) ? product.meta_data.join(', ') : '';
        const imageUrl = product.image ? `http://localhost:3000${product.image}` : '';
        
        formContainer.innerHTML = `
            <div class="admin-form">
                <h2>Редактирование: ${product.name}</h2>
                <form id="editProductForm">
                    <input type="hidden" id="editProductSlug" value="${product.slug}" />
                    
                    ${imageUrl ? `
                        <div style="margin-bottom: 20px;">
                            <img src="${imageUrl}" alt="${product.name}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" />
                        </div>
                    ` : ''}
                    
                    <div class="form-group full-width">
                        <label>Название</label>
                        <input type="text" id="editProductName" value="${product.name || ''}" required />
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Описание</label>
                        <textarea id="editProductDesc" rows="3">${product.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Цена (₽)</label>
                            <input type="number" id="editProductPrice" value="${product.price || 0}" required />
                        </div>
                        <div class="form-group">
                            <label>Бейдж</label>
                            <input type="text" id="editProductBadge" value="${product.badge || ''}" placeholder="хит" />
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Рейтинг</label>
                            <input type="number" step="0.1" min="0" max="5" id="editProductRating" value="${product.rating || 0}" />
                        </div>
                        <div class="form-group">
                            <label>Характеристики (через запятую)</label>
                            <input type="text" id="editProductMeta" value="${metaData}" placeholder="85×45 см, 14 дней" />
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                        <button type="button" class="btn btn-outline" onclick="cancelProductEdit()">Отмена</button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('editProductForm').addEventListener('submit', saveProduct);
        
    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        showNotification('Ошибка загрузки товара', 'error');
    }
}

// ============================================================
// СОХРАНЕНИЕ ТОВАРА
// ============================================================
async function saveProduct(event) {
    event.preventDefault();
    
    const slug = document.getElementById('editProductSlug').value;
    const metaData = document.getElementById('editProductMeta').value
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);
    
    const data = {
        name: document.getElementById('editProductName').value.trim(),
        description: document.getElementById('editProductDesc').value.trim(),
        price: Number(document.getElementById('editProductPrice').value),
        badge: document.getElementById('editProductBadge').value.trim(),
        rating: Number(document.getElementById('editProductRating').value),
        meta_data: metaData
    };
    
    try {
        const response = await fetch(`${API_URL}/products/${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Ошибка сохранения');
        
        showNotification('Товар сохранён!');
        cancelProductEdit();
        loadProducts();
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка сохранения', 'error');
    }
}

// ============================================================
// ОТМЕНА РЕДАКТИРОВАНИЯ ТОВАРА
// ============================================================
function cancelProductEdit() {
    document.getElementById('productFormContainer').style.display = 'none';
    document.getElementById('productsList').style.display = 'grid';
}

// ============================================================
// ЗАГРУЗКА ЗАКАЗОВ
// ============================================================
async function loadOrders() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    container.innerHTML = '<p style="color: var(--text-gray);">Загрузка...</p>';
    
    try {
        const response = await fetch(`${API_URL}/orders`);
        const orders = await response.json();
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="admin-empty">
                    <h3>Заказов пока нет</h3>
                    <p>Они появятся здесь после оформления</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="admin-master-card" style="cursor: default;">
                <div class="name">Заказ №${order.order_number}</div>
                <div class="slug">${new Date(order.created_at).toLocaleString('ru-RU')}</div>
                <div class="stats">
                    <span>${order.customer_name}</span>
                    <span>${order.customer_phone}</span>
                </div>
                <div class="stats" style="margin-top: 8px;">
                    <span>Сумма: <strong>${Number(order.total_amount).toLocaleString('ru-RU')} ₽</strong></span>
                    <span>Статус: <strong>${order.status || 'new'}</strong></span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        container.innerHTML = '<p style="color: var(--text-gray);">Заказы пока недоступны</p>';
    }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    loadMasters();
});
