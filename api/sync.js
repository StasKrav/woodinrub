const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: 'woodinrub_user',
    host: 'localhost',
    database: 'woodinrub',
    password: 'woodinrub_pass',
    port: 5432,
});

const MASTERS_DIR = path.join(__dirname, '../masters');

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
        type: 'individual',
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

async function sync() {
    console.log('🔄 Начинаю синхронизацию...');
    console.log('📁 Путь к мастерам:', MASTERS_DIR);
    
    if (!fs.existsSync(MASTERS_DIR)) {
        console.error('❌ Папка masters не найдена!');
        process.exit(1);
    }

    const masterFolders = fs.readdirSync(MASTERS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`📁 Найдено папок мастеров: ${masterFolders.length}`);

    for (const slug of masterFolders) {
        const masterPath = path.join(MASTERS_DIR, slug);
        const infoPath = path.join(masterPath, 'info.json');
        
        let masterInfo = readJsonFile(infoPath);
        if (!masterInfo) {
            console.log(`ℹ️ info.json не найден для ${slug}`);
            masterInfo = getDefaultMasterInfo(slug);
        }

        const masterType = masterInfo.type || 'individual';
        console.log(`🔍 ${slug}: type = "${masterType}"`);

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

        const masterRes = await pool.query('SELECT id FROM masters WHERE slug = $1', [slug]);
        
        let masterId;
        if (masterRes.rows.length === 0) {
            const productsPath = path.join(masterPath, 'products');
            if (!fs.existsSync(productsPath)) {
                fs.mkdirSync(productsPath, { recursive: true });
            }

            console.log(`✨ Добавляю мастера: ${slug} (${masterType})`);
            const result = await pool.query(`
                INSERT INTO masters (slug, name, short_name, title, bio, badge, rating, works_count, extra_data, type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)
                RETURNING id
            `, [
                slug,
                masterInfo.name || getDefaultMasterInfo(slug).name,
                masterInfo.short_name || getDefaultMasterInfo(slug).short_name,
                masterInfo.title || getDefaultMasterInfo(slug).title,
                masterInfo.bio || getDefaultMasterInfo(slug).bio,
                masterInfo.badge || getDefaultMasterInfo(slug).badge,
                masterInfo.rating || 0,
                JSON.stringify(extraData),
                masterType
            ]);
            masterId = result.rows[0].id;
            console.log(`✅ Мастер ${slug} добавлен с ID: ${masterId}`);
        } else {
            masterId = masterRes.rows[0].id;
            console.log(`🔄 Обновляю мастера: ${slug} (${masterType})`);
            await pool.query(`
                UPDATE masters SET
                    name = $1, short_name = $2, title = $3, bio = $4,
                    badge = $5, rating = $6, extra_data = $7, type = $8
                WHERE id = $9
            `, [
                masterInfo.name || getDefaultMasterInfo(slug).name,
                masterInfo.short_name || getDefaultMasterInfo(slug).short_name,
                masterInfo.title || getDefaultMasterInfo(slug).title,
                masterInfo.bio || getDefaultMasterInfo(slug).bio,
                masterInfo.badge || getDefaultMasterInfo(slug).badge,
                masterInfo.rating || 0,
                JSON.stringify(extraData),
                masterType,
                masterId
            ]);
            console.log(`✅ Мастер ${slug} обновлён`);
        }

        // --- СИНХРОНИЗАЦИЯ ТОВАРОВ ---
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
                
                let productInfo = readJsonFile(infoPath);
                if (!productInfo) {
                    productInfo = getDefaultProductInfo(productSlug);
                }

                const imageExists = fs.existsSync(imagePath);
                const imagePathForDb = imageExists ? `/masters/${slug}/products/${productSlug}/main.jpg` : null;

                // 👇 ПРОВЕРЯЕМ, ЕСТЬ ЛИ ТОВАР
                const existingProduct = await pool.query(
                    'SELECT id, master_id FROM products WHERE slug = $1',
                    [productSlug]
                );

                if (existingProduct.rows.length > 0) {
                    // --- ОБНОВЛЯЕМ СУЩЕСТВУЮЩИЙ ТОВАР ---
                    console.log(`🔄 Обновляю товар: ${productSlug}`);
                    await pool.query(`
                        UPDATE products SET
                            master_id = $1,
                            name = $2,
                            description = $3,
                            price = $4,
                            badge = $5,
                            rating = $6,
                            meta_data = $7::jsonb,
                            image = $8,
                            is_active = true,
                            updated_at = NOW()
                        WHERE slug = $9
                    `, [
                        masterId,
                        productInfo.name || getDefaultProductInfo(productSlug).name,
                        productInfo.description || getDefaultProductInfo(productSlug).description,
                        productInfo.price || getDefaultProductInfo(productSlug).price,
                        productInfo.badge || null,
                        productInfo.rating || getDefaultProductInfo(productSlug).rating,
                        JSON.stringify(productInfo.meta_data || []),
                        imagePathForDb,
                        productSlug
                    ]);
                    console.log(`✅ Товар ${productSlug} обновлён`);
                } else {
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
                }
            }
        }
    }

    console.log('📊 Обновляю количество работ...');
    await pool.query(`
        UPDATE masters 
        SET works_count = (SELECT COUNT(*) FROM products WHERE master_id = masters.id)
        WHERE is_active = true
    `);

    console.log('✅ Синхронизация завершена!');
    process.exit(0);
}

sync().catch(err => {
    console.error('❌ Ошибка синхронизации:', err);
    process.exit(1);
});
