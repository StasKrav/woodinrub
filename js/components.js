// ============================================================
// ЗАГРУЗКА HTML-КОМПОНЕНТОВ
// ============================================================

async function loadComponent(selector, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка загрузки ${url}`);
        const html = await response.text();
        document.querySelector(selector).innerHTML = html;
    } catch (error) {
        console.error(`❌ Ошибка загрузки компонента ${url}:`, error);
    }
}

// ============================================================
// ЗАГРУЖАЕМ ВСЕ КОМПОНЕНТЫ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Футер
    if (document.querySelector('#footer-placeholder')) {
        loadComponent('#footer-placeholder', '/components/footer.html');
    }
    
    // Шапка (если будем делать отдельно)
    if (document.querySelector('#header-placeholder')) {
        loadComponent('#header-placeholder', '/components/header.html');
    }
});
