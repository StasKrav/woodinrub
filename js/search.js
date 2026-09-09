// ============================================================
// ПОИСК МАСТЕРОВ
// ============================================================

// Элементы с проверкой на существование
const searchModal = document.getElementById('searchModal');
const closeSearchBtn = document.getElementById('closeSearchModal');
const searchForm = document.getElementById('searchForm');
const searchResults = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const searchNoResults = document.getElementById('searchNoResults');

// ============================================================
// ОТКРЫТЬ / ЗАКРЫТЬ МОДАЛКУ
// ============================================================
function openSearchModal() {
    if (!searchModal) {
        console.warn('⚠️ Модалка поиска не найдена на этой странице');
        return;
    }
    searchModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (searchResults) searchResults.style.display = 'none';
    if (searchNoResults) searchNoResults.style.display = 'none';
}

function closeSearchModal() {
    if (!searchModal) return;
    searchModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================================
// ЗАКРЫТЬ ПО КЛИКУ НА ЗАТЕМНЕНИИ
// ============================================================
if (searchModal) {
    searchModal.addEventListener('click', function(event) {
        if (event.target === searchModal) {
            closeSearchModal();
        }
    });
}

// ============================================================
// ЗАКРЫТЬ ПО КНОПКЕ
// ============================================================
if (closeSearchBtn) {
    closeSearchBtn.addEventListener('click', closeSearchModal);
}

// ============================================================
// ЗАКРЫТЬ ПО ESC
// ============================================================
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
        closeSearchModal();
    }
});

// ============================================================
// ПОИСК
// ============================================================
async function performSearch(event) {
    event.preventDefault();

    const name = document.getElementById('searchName')?.value?.toLowerCase().trim() || '';
    const activity = document.getElementById('searchActivity')?.value?.toLowerCase() || '';
    const city = document.getElementById('searchCity')?.value?.toLowerCase().trim() || '';
    const type = document.getElementById('searchType')?.value || '';

    try {
        const response = await fetch('http://localhost:3000/api/masters');
        const masters = await response.json();

        const results = masters.filter(master => {
            let match = true;

            if (name) {
                const fullName = (master.name || '').toLowerCase();
                if (!fullName.includes(name)) match = false;
            }

            if (match && activity) {
                const title = (master.title || '').toLowerCase();
                const bio = (master.bio || '').toLowerCase();
                if (!title.includes(activity) && !bio.includes(activity)) match = false;
            }

            if (match && city) {
                const masterCity = (master.extra_data?.city || '').toLowerCase();
                if (!masterCity.includes(city)) match = false;
            }

            if (match && type) {
                if (master.type !== type) match = false;
            }

            return match;
        });

        showResults(results);

    } catch (error) {
        console.error('Ошибка поиска:', error);
        if (searchResultsList) {
            searchResultsList.innerHTML = '<p style="color: var(--text-gray);">Ошибка загрузки данных. Попробуйте позже.</p>';
        }
        if (searchResults) searchResults.style.display = 'block';
        if (searchNoResults) searchNoResults.style.display = 'none';
    }
}

// ============================================================
// ПОКАЗАТЬ РЕЗУЛЬТАТЫ
// ============================================================
function showResults(results) {
    if (!searchResults || !searchResultsList || !searchNoResults) return;
    
    searchResults.style.display = 'block';

    if (results.length === 0) {
        searchNoResults.style.display = 'block';
        searchResultsList.innerHTML = '';
        return;
    }

    searchNoResults.style.display = 'none';

    searchResultsList.innerHTML = results.map(master => {
        const avatarUrl = `http://localhost:3000${master.avatar || '/images/placeholder.jpg'}`;
        const typeLabel = master.type === 'studio' ? 'Студия' : 'Частный мастер';
        
        return `
            <a href="/masters/${master.slug}/" class="search-result-item" onclick="closeSearchModal()">
                <div class="avatar-small">
                    <img src="${avatarUrl}" alt="${master.name}" loading="lazy" />
                </div>
                <div class="info">
                    <div class="name">${master.name}</div>
                    <div class="detail">${master.title || ''} · ${master.extra_data?.city || 'Город не указан'}</div>
                </div>
                <span class="badge-small">${typeLabel}</span>
            </a>
        `;
    }).join('');
}

// ============================================================
// ОЧИСТИТЬ ФОРМУ
// ============================================================
function clearSearchForm() {
    const name = document.getElementById('searchName');
    const activity = document.getElementById('searchActivity');
    const city = document.getElementById('searchCity');
    const type = document.getElementById('searchType');
    
    if (name) name.value = '';
    if (activity) activity.value = '';
    if (city) city.value = '';
    if (type) type.value = '';
    
    if (searchResults) searchResults.style.display = 'none';
    if (searchNoResults) searchNoResults.style.display = 'none';
}

// ============================================================
// ОБРАБОТЧИК ФОРМЫ
// ============================================================
if (searchForm) {
    searchForm.addEventListener('submit', performSearch);
}

// ============================================================
// КНОПКА "НАЙТИ МАСТЕРА" ОТКРЫВАЕТ МОДАЛКУ
// ============================================================
document.addEventListener('click', function(event) {
    const btn = event.target.closest('.btn-find-master');
    if (btn) {
        event.preventDefault();
        openSearchModal();
    }
});
