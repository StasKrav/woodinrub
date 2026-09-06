// ============================================================
// API — ВСЕ ЗАПРОСЫ К СЕРВЕРУ
// ============================================================

const API_URL = 'http://localhost:3000/api';

// ============================================================
// ПОЛУЧИТЬ ВСЕ ТОВАРЫ
// ============================================================
async function getProducts() {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) throw new Error('Ошибка загрузки товаров');
    return response.json();
}

// ============================================================
// ПОЛУЧИТЬ ТОВАР ПО SLUG
// ============================================================
async function getProduct(slug) {
    const response = await fetch(`${API_URL}/products/${slug}`);
    if (!response.ok) throw new Error('Товар не найден');
    return response.json();
}

// ============================================================
// ПОЛУЧИТЬ ВСЕХ МАСТЕРОВ
// ============================================================
async function getMasters() {
    const response = await fetch(`${API_URL}/masters`);
    if (!response.ok) throw new Error('Ошибка загрузки мастеров');
    return response.json();
}

// ============================================================
// ПОЛУЧИТЬ МАСТЕРА ПО SLUG С ЕГО ТОВАРАМИ
// ============================================================
async function getMaster(slug) {
    const response = await fetch(`${API_URL}/masters/${slug}`);
    if (!response.ok) throw new Error('Мастер не найден');
    return response.json();
}

// ============================================================
// ПОЛУЧИТЬ ТОВАРЫ МАСТЕРА
// ============================================================
async function getMasterProducts(slug) {
    const response = await fetch(`${API_URL}/masters/${slug}/products`);
    if (!response.ok) throw new Error('Ошибка загрузки товаров мастера');
    return response.json();
}
