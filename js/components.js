// ============================================================
// ЗАГРУЗКА HTML-КОМПОНЕНТОВ
// ============================================================

async function loadComponent(selector, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка загрузки ${url}`);
        const html = await response.text();
        document.querySelector(selector).innerHTML = html;
        
        // 👇 После загрузки шапки
        if (selector === '#header-placeholder') {
            // Обновляем счётчик корзины
            if (typeof updateCartBadge === 'function') {
                setTimeout(updateCartBadge, 50);
            }
            // Инициализируем модалку
            if (typeof initModal === 'function') {
                setTimeout(initModal, 50);
            }
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки компонента ${url}:`, error);
    }
}

// ============================================================
// ЗАГРУЖАЕМ ВСЕ КОМПОНЕНТЫ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Шапка
    if (document.querySelector('#header-placeholder')) {
        loadComponent('#header-placeholder', '/components/header.html');
    }
    
    // Футер
    if (document.querySelector('#footer-placeholder')) {
        loadComponent('#footer-placeholder', '/components/footer.html');
    }
});
