// ============================================================
// КОРЗИНА — РАБОТА С LOCALSTORAGE
// ============================================================

const CART_KEY = 'woodinrub_cart';

// ============================================================
// ПОЛУЧИТЬ КОРЗИНУ
// ============================================================
function getCart() {
    try {
        const data = localStorage.getItem(CART_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// ============================================================
// СОХРАНИТЬ КОРЗИНУ
// ============================================================
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

// ============================================================
// ДОБАВИТЬ ТОВАР
// ============================================================
function addToCart(productId, name, price, image, master) {
    const cart = getCart();
    
    // Проверяем, есть ли уже такой товар
    const existing = cart.find(item => item.id === productId);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: price,
            image: image,
            master: master,
            quantity: 1
        });
    }
    
    saveCart(cart);
    showNotification(`✅ ${name} добавлен в корзину`);
}

// ============================================================
// УДАЛИТЬ ТОВАР
// ============================================================
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCart(); // если на странице корзины
}

// ============================================================
// ИЗМЕНИТЬ КОЛИЧЕСТВО
// ============================================================
function updateQuantity(productId, quantity) {
    if (quantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = quantity;
        saveCart(cart);
        renderCart();
    }
}

// ============================================================
// ПОЛНАЯ ОЧИСТКА КОРЗИНЫ
// ============================================================
function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
    renderCart();
}

// ============================================================
// ОБНОВИТЬ СЧЁТЧИК В ШАПКЕ
// ============================================================
function updateCartBadge() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
        badge.textContent = totalItems;
    });
}

// ============================================================
// ПОКАЗАТЬ УВЕДОМЛЕНИЕ
// ============================================================
function showNotification(message) {
    // Проверяем, есть ли уже уведомление
    let notification = document.querySelector('.cart-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'cart-notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2500);
}

// ============================================================
// ПОЛУЧИТЬ ОБЩУЮ СУММУ
// ============================================================
function getTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ============================================================
// РЕНДЕРИНГ СТРАНИЦЫ КОРЗИНЫ
// ============================================================
function renderCart() {
    const container = document.getElementById('cartContainer');
    if (!container) return;
    
    const cart = getCart();
    
    // 👇 Проверяем, есть ли элемент cartTotal на странице
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <h2>Корзина пуста</h2>
                <p>Перейдите в <a href="/catalog/">каталог</a> и выберите товары</p>
            </div>
        `;
        if (cartTotal) cartTotal.style.display = 'none';
        return;
    }
    
    let html = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <div class="cart-item-image">
                        <img src="${item.image || '/images/placeholder.jpg'}" alt="${item.name}" loading="lazy" />
                    </div>
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p class="cart-item-master">Мастер: ${item.master || 'Не указан'}</p>
                        <div class="cart-item-controls">
                            <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price">
                        ${(item.price * item.quantity).toLocaleString()} ₽
                        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕</button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="cart-summary">
            <div class="cart-total">
                <span>Итого:</span>
                <strong>${getTotal().toLocaleString()} ₽</strong>
            </div>
            <button class="btn btn-primary" onclick="checkout()">Оформить заказ</button>
            <button class="btn btn-outline" onclick="clearCart()">Очистить корзину</button>
        </div>
    `;
    
    container.innerHTML = html;
    updateCartBadge();
}

// ============================================================
// ОФОРМЛЕНИЕ ЗАКАЗА
// ============================================================
async function checkout() {
    const cart = getCart();
    
    if (cart.length === 0) {
        showNotification('Корзина пуста');
        return;
    }
    
    // Показываем форму оформления заказа
    const container = document.getElementById('cartContainer');
    container.innerHTML = `
        <div class="checkout-form">
            <h2>Оформление заказа</h2>
            <form id="orderForm">
                <div class="form-group">
                    <label>Ваше имя *</label>
                    <input type="text" id="customerName" required placeholder="Иван Иванов" />
                </div>
                <div class="form-group">
                    <label>Телефон *</label>
                    <input type="tel" id="customerPhone" required placeholder="+7 (900) 123-45-67" />
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="customerEmail" placeholder="ivan@mail.ru" />
                </div>
                <div class="form-group">
                    <label>Адрес доставки</label>
                    <textarea id="deliveryAddress" rows="3" placeholder="Город, улица, дом, квартира"></textarea>
                </div>
                <div class="form-group">
                    <label>Комментарий к заказу</label>
                    <textarea id="orderComment" rows="2" placeholder="Дополнительные пожелания"></textarea>
                </div>
                <div class="checkout-summary">
                    <span>Товаров: <strong>${cart.reduce((s, i) => s + i.quantity, 0)}</strong></span>
                    <span>Сумма: <strong>${getTotal().toLocaleString()} ₽</strong></span>
                </div>
                <button type="submit" class="btn btn-primary">Отправить заказ</button>
                <button type="button" class="btn btn-outline" onclick="renderCart()">← Вернуться в корзину</button>
            </form>
        </div>
    `;
    
    document.getElementById('orderForm').addEventListener('submit', submitOrder);
}

// ============================================================
// ОТПРАВКА ЗАКАЗА НА СЕРВЕР
// ============================================================
async function submitOrder(event) {
    event.preventDefault();
    
    const cart = getCart();
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
    const comment = document.getElementById('orderComment').value.trim();
    
    if (!customerName || !customerPhone) {
        showNotification('Пожалуйста, заполните обязательные поля (Имя и Телефон)');
        return;
    }
    
    const orderData = {
        items: cart,
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        comment,
        total: getTotal()
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) throw new Error('Ошибка при отправке заказа');
        
        const result = await response.json();
        showNotification(`✅ Заказ №${result.orderNumber} оформлен!`);
        clearCart();
        renderCart();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Не удалось оформить заказ. Попробуйте позже.');
    }
}

// ============================================================
// АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ПРИ ЗАГРУЗКЕ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    updateCartBadge();
    
    // Если мы на странице корзины — рендерим её
    if (document.getElementById('cartContainer')) {
        renderCart();
    }
});

// ============================================================
// НАВЕШИВАЕМ ОБРАБОТЧИКИ НА КНОПКИ "В КОРЗИНУ"
// ============================================================
document.addEventListener('click', function(event) {
    const btn = event.target.closest('.btn-add');
    if (!btn) return;
    
    const card = btn.closest('.product-card');
    if (!card) return;
    
    const productId = card.dataset.productId || btn.dataset.productId;
    const productName = card.querySelector('.product-name')?.textContent || 'Товар';
    const productPrice = parseInt(card.querySelector('.product-price')?.textContent?.replace(/\s/g, '').replace('₽', '') || 0);
    const productImage = card.querySelector('.product-image img')?.getAttribute('src') || '';
    const masterName = card.querySelector('.master-tag strong')?.textContent || '';
    
    addToCart(productId, productName, productPrice, productImage, masterName);
});
