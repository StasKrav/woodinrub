// ============================================================
// РЕНДЕРИНГ КАРТОЧЕК МАСТЕРОВ
// ============================================================

function createMasterCard(master) {
    const avatarUrl = `http://localhost:3000${master.avatar}`;
    
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

async function renderMasters() {
    const container = document.getElementById('mastersContainer');
    if (!container) return;

    try {
        const response = await fetch('http://localhost:3000/api/masters');
        const masters = await response.json();
        container.innerHTML = masters.map(createMasterCard).join('');
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
        container.innerHTML = '<p style="color: var(--text-gray);">Не удалось загрузить мастеров</p>';
    }
}

document.addEventListener('DOMContentLoaded', renderMasters);
