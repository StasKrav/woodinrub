// ============================================================
// КАРТОЧКИ СТУДИЙ (для главной страницы)
// ============================================================

function createStudioCard(master) {
    const avatarUrl = `http://localhost:3000${master.avatar || '/images/placeholder.jpg'}`;
    
    return `
        <a href="/masters/${master.slug}/" class="master-card">
            <div class="master-avatar">
                <img src="${avatarUrl}" alt="${master.name}" loading="lazy" />
            </div>
            <div class="master-name">${master.name}</div>
            <span class="master-badge">${master.badge || ''}</span>
            <div class="master-stat">Работ: <span>${master.works_count || 0}</span></div>
        </a>
    `;
}

async function renderStudios() {
    const container = document.getElementById('studiosContainer');
    if (!container) return;

    try {
        const response = await fetch('http://localhost:3000/api/masters?type=studio');
        const studios = await response.json();
        
        if (studios.length === 0) {
            container.innerHTML = '<p style="color: var(--text-gray);">Пока нет студий. Приходите позже!</p>';
            return;
        }
        
        container.innerHTML = studios.map(createStudioCard).join('');
    } catch (error) {
        console.error('Ошибка загрузки студий:', error);
        container.innerHTML = '<p style="color: var(--text-gray);">Не удалось загрузить студии</p>';
    }
}

document.addEventListener('DOMContentLoaded', renderStudios);
