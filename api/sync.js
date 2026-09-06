const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ============================================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ
// ============================================================
const pool = new Pool({
    user: 'woodinrub_user',
    host: 'localhost',
    database: 'woodinrub',
    password: 'woodinrub_pass',
    port: 5432,
});

// ============================================================
// ПУТЬ К ПАПКЕ С МАСТЕРАМИ
// ============================================================
const MASTERS_DIR = path.join(__dirname, '../masters');

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ
// ============================================================
async function sync() {
    console.log('🔄 Начинаю синхронизацию...');
    
    // 1. Читаем папки мастеров (только папки)
    const masterFolders = fs.readdirSync(MASTERS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`📁 Найдено папок мастеров: ${masterFolders.length}`);

    for (const slug of masterFolders) {
        const masterPath = path.join(MASTERS_DIR, slug);
        
        // Проверяем, есть ли мастер в БД
        const masterRes = await pool.query('SELECT id FROM masters WHERE slug = $1', [slug]);
        
        let masterId;
        if (masterRes.rows.length === 0) {
            // --- ЕСЛИ МАСТЕРА НЕТ В БД ---
            // Создаём папку products, если её нет
            const productsPath = path.join(masterPath, 'products');
            if (!fs.existsSync(productsPath)) {
                fs.mkdirSync(productsPath, { recursive: true });
                console.log(`📁 Создана папка products для ${slug}`);
            }

            // Проверяем аватарку
            const avatarPath = path.join(masterPath, 'avatar.jpg');
            const avatarExists = fs.existsSync(avatarPath);

            console.log(`✨ Добавляю нового мастера: ${slug}`);
            const result = await pool.query(`
                INSERT INTO masters (slug, name, short_name, title, bio, badge, works_count, rating)
                VALUES ($1, $2, $3, $4, $5, $6, 0, 0.0)
                RETURNING id
            `, [
                slug,
                slug.charAt(0).toUpperCase() + slug.slice(1), // Имя из slug (заглушка)
                slug.slice(0, 1).toUpperCase() + '.',         // Краткое имя
                'Столяр-мастер',
                'Описание мастера (обновите вручную)',
                '★ Мастер'
            ]);
            masterId = result.rows[0].id;
            console.log(`✅ Мастер ${slug} добавлен с ID: ${masterId}`);
        } else {
            masterId = masterRes.rows[0].id;
            console.log(`👤 Мастер ${slug} уже есть (ID: ${masterId})`);
        }

        // --- 3. СИНХРОНИЗАЦИЯ ТОВАРОВ ---
        const productsPath = path.join(masterPath, 'products');
        if (fs.existsSync(productsPath)) {
            const productFolders = fs.readdirSync(productsPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`📦 Товаров в папке: ${productFolders.length}`);

            for (const productSlug of productFolders) {
                const productPath = path.join(productsPath, productSlug);
                const imagePath = path.join(productPath, 'main.jpg');
                
                // Проверяем, есть ли товар в БД
                const productRes = await pool.query(
                    'SELECT id FROM products WHERE slug = $1 AND master_id = $2',
                    [productSlug, masterId]
                );

                if (productRes.rows.length === 0) {
                    // --- ЕСЛИ ТОВАРА НЕТ В БД ---
                    const imageExists = fs.existsSync(imagePath);
                    
                    console.log(`🆕 Добавляю товар: ${productSlug}`);
                    await pool.query(`
                        INSERT INTO products (slug, master_id, name, description, price, badge, rating, meta_data)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        productSlug,
                        masterId,
                        productSlug.replace(/-/g, ' ').toUpperCase(), // Название из папки
                        'Описание товара (обновите вручную)',
                        10000, // Цена по умолчанию
                        null,
                        4.0,
                        [] // Пустой массив характеристик
                    ]);
                    console.log(`✅ Товар ${productSlug} добавлен`);
                } else {
                    console.log(`⏩ Товар ${productSlug} уже есть`);
                }
            }
        }
    }

    // --- 4. ОБНОВЛЯЕМ works_count ДЛЯ ВСЕХ МАСТЕРОВ ---
    console.log('📊 Обновляю количество работ...');
    await pool.query(`
        UPDATE masters 
        SET works_count = (SELECT COUNT(*) FROM products WHERE master_id = masters.id)
        WHERE is_active = true
    `);

    console.log('✅ Синхронизация завершена!');
    process.exit(0);
}

// ============================================================
// ЗАПУСК
// ============================================================
sync().catch(err => {
    console.error('❌ Ошибка синхронизации:', err);
    process.exit(1);
});
