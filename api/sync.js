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
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
function readJsonFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        }
        return null;
    } catch (err) {
        console.warn(`⚠️ Ошибка чтения ${filePath}:`, err.message);
        return null;
    }
}

function getDefaultMasterInfo(slug) {
    return {
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        short_name: slug.slice(0, 1).toUpperCase() + '.',
        title: 'Столяр-мастер',
        bio: 'Описание мастера (добавьте info.json в папку)',
        badge: '★ Мастер',
        rating: 0,
        extra_data: {
            city: null,
            experience: null,
            education: null,
            style: null,
            materials: [],
            sertificates: [],
            instagram: null,
            phone: null
        }
    };
}

function getDefaultProductInfo(slug) {
    return {
        name: slug.replace(/-/g, ' ').toUpperCase(),
        description: 'Описание товара (добавьте info.json в папку товара)',
        price: 10000,
        badge: null,
        rating: 4.0,
        meta_data: []
    };
}

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ
// ============================================================
async function sync() {
    console.log('🔄 Начинаю синхронизацию...');
    console.log('📁 Путь к мастерам:', MASTERS_DIR);
    
    // 1. Читаем папки мастеров
    if (!fs.existsSync(MASTERS_DIR)) {
        console.error('❌ Папка masters не найдена!');
        process.exit(1);
    }

    const masterFolders = fs.readdirSync(MASTERS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`📁 Найдено папок мастеров: ${masterFolders.length}`);

    if (masterFolders.length === 0) {
        console.log('⚠️ Нет мастеров для синхронизации');
        process.exit(0);
    }

    for (const slug of masterFolders) {
        const masterPath = path.join(MASTERS_DIR, slug);
        const infoPath = path.join(masterPath, 'info.json');
        
        // Читаем info.json мастера
        let masterInfo = readJsonFile(infoPath);
        if (!masterInfo) {
            console.log(`ℹ️ info.json не найден для ${slug}, использую значения по умолчанию`);
            masterInfo = getDefaultMasterInfo(slug);
        }

        // Собираем extra_data
        const extraData = {
            city: masterInfo.city || masterInfo.extra_data?.city || null,
            experience: masterInfo.experience || masterInfo.extra_data?.experience || null,
            education: masterInfo.education || masterInfo.extra_data?.education || null,
            style: masterInfo.style || masterInfo.extra_data?.style || null,
            materials: masterInfo.materials || masterInfo.extra_data?.materials || [],
            sertificates: masterInfo.sertificates || masterInfo.extra_data?.sertificates || [],
            instagram: masterInfo.instagram || masterInfo.extra_data?.instagram || null,
            phone: masterInfo.phone || masterInfo.extra_data?.phone || null
        };

        // Проверяем, есть ли мастер в БД
        const masterRes = await pool.query('SELECT id FROM masters WHERE slug = $1', [slug]);
        
        let masterId;
        if (masterRes.rows.length === 0) {
            // --- НОВЫЙ МАСТЕР ---
            const productsPath = path.join(masterPath, 'products');
            if (!fs.existsSync(productsPath)) {
                fs.mkdirSync(productsPath, { recursive: true });
                console.log(`📁 Создана папка products для ${slug}`);
            }

            console.log(`✨ Добавляю мастера: ${slug}`);
            const result = await pool.query(`
                INSERT INTO masters (
                    slug, name, short_name, title, bio, badge, 
                    rating, works_count, extra_data
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
                RETURNING id
            `, [
                slug,
                masterInfo.name || getDefaultMasterInfo(slug).name,
                masterInfo.short_name || getDefaultMasterInfo(slug).short_name,
                masterInfo.title || getDefaultMasterInfo(slug).title,
                masterInfo.bio || getDefaultMasterInfo(slug).bio,
                masterInfo.badge || getDefaultMasterInfo(slug).badge,
                masterInfo.rating || 0,
                JSON.stringify(extraData)
            ]);
            masterId = result.rows[0].id;
            console.log(`✅ Мастер ${slug} добавлен с ID: ${masterId}`);
        } else {
            masterId = masterRes.rows[0].id;
            
            // --- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕГО МАСТЕРА ---
            console.log(`🔄 Обновляю мастера: ${slug}`);
            await pool.query(`
                UPDATE masters SET
                    name = $1,
                    short_name = $2,
                    title = $3,
                    bio = $4,
                    badge = $5,
                    rating = $6,
                    extra_data = $7
                WHERE id = $8
            `, [
                masterInfo.name || getDefaultMasterInfo(slug).name,
                masterInfo.short_name || getDefaultMasterInfo(slug).short_name,
                masterInfo.title || getDefaultMasterInfo(slug).title,
                masterInfo.bio || getDefaultMasterInfo(slug).bio,
                masterInfo.badge || getDefaultMasterInfo(slug).badge,
                masterInfo.rating || 0,
                JSON.stringify(extraData),
                masterId
            ]);
            console.log(`✅ Мастер ${slug} обновлён`);
        }

        // --- 3. СИНХРОНИЗАЦИЯ ТОВАРОВ ---
        const productsPath = path.join(masterPath, 'products');
        if (fs.existsSync(productsPath)) {
            const productFolders = fs.readdirSync(productsPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`📦 Товаров в папке ${slug}: ${productFolders.length}`);

            for (const productSlug of productFolders) {
                const productPath = path.join(productsPath, productSlug);
                const infoPath = path.join(productPath, 'info.json');
                const imagePath = path.join(productPath, 'main.jpg');
                
                // Читаем info.json товара
                let productInfo = readJsonFile(infoPath);
                if (!productInfo) {
                    console.log(`ℹ️ info.json не найден для ${productSlug}, использую значения по умолчанию`);
                    productInfo = getDefaultProductInfo(productSlug);
                }

                // Проверяем, есть ли товар в БД
                const productRes = await pool.query(
                    'SELECT id FROM products WHERE slug = $1 AND master_id = $2',
                    [productSlug, masterId]
                );

                const imageExists = fs.existsSync(imagePath);
                const imagePathForDb = imageExists ? `/masters/${slug}/products/${productSlug}/main.jpg` : null;

                if (productRes.rows.length === 0) {
                    // --- НОВЫЙ ТОВАР ---
                    console.log(`🆕 Добавляю товар: ${productSlug}`);
                    await pool.query(`
                        INSERT INTO products (
                            slug, master_id, name, description, price, 
                            badge, rating, meta_data, image
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        productSlug,
                        masterId,
                        productInfo.name || getDefaultProductInfo(productSlug).name,
                        productInfo.description || getDefaultProductInfo(productSlug).description,
                        productInfo.price || getDefaultProductInfo(productSlug).price,
                        productInfo.badge || null,
                        productInfo.rating || getDefaultProductInfo(productSlug).rating,
                        JSON.stringify(productInfo.meta_data || []),
                        imagePathForDb
                    ]);
                    console.log(`✅ Товар ${productSlug} добавлен`);
                } else {
                    // --- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕГО ТОВАРА ---
                    console.log(`🔄 Обновляю товар: ${productSlug}`);
                    await pool.query(`
                        UPDATE products SET
                            name = $1,
                            description = $2,
                            price = $3,
                            badge = $4,
                            rating = $5,
                            meta_data = $6::jsonb,
                            image = $7
                        WHERE slug = $8 AND master_id = $9
                    `, [
                        productInfo.name || getDefaultProductInfo(productSlug).name,
                        productInfo.description || getDefaultProductInfo(productSlug).description,
                        productInfo.price || getDefaultProductInfo(productSlug).price,
                        productInfo.badge || null,
                        productInfo.rating || getDefaultProductInfo(productSlug).rating,
                        JSON.stringify(productInfo.meta_data || []),
                        imagePathForDb,
                        productSlug,
                        masterId
                    ]);
                    console.log(`✅ Товар ${productSlug} обновлён`);
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
