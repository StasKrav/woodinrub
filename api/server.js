const multer = require('multer');

require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sendOrderEmail } = require('./mailer');

const app = express();
const port = process.env.PORT || 3000;

// ============================================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ (из .env)
// ============================================================
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());

// Раздаём статику
app.use('/masters', express.static(path.join(__dirname, '../masters')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/components', express.static(path.join(__dirname, '../components')));
app.use(express.static(path.join(__dirname, '..')));

// ============================================================
// СТРАНИЦЫ
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/masters', (req, res) => {
    res.sendFile(path.join(__dirname, '../masters/index.html'));
});

app.get('/catalog', (req, res) => {
    res.sendFile(path.join(__dirname, '../catalog/index.html'));
});

app.get('/studios', (req, res) => {
    res.sendFile(path.join(__dirname, '../studios/index.html'));
});

app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, '../blog/index.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, '../cart/index.html'));
});

// ============================================================
// API: ПОЛУЧИТЬ ВСЕ ТОВАРЫ
// ============================================================
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.slug,
                p.name,
                p.description,
                p.price,
                p.badge,
                p.rating,
                p.meta_data,
                m.slug as master_slug,
                m.name as master_name,
                CONCAT('/masters/', m.slug, '/products/', p.slug, '/main.jpg') as image
            FROM products p
            JOIN masters m ON p.master_id = m.id
            WHERE p.is_active = true
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении товаров' });
    }
});

// ============================================================
// API: ПОЛУЧИТЬ ТОВАР ПО SLUG
// ============================================================
app.get('/api/products/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await pool.query(`
            SELECT 
                p.id,
                p.slug,
                p.name,
                p.description,
                p.price,
                p.badge,
                p.rating,
                p.meta_data,
                m.slug as master_slug,
                m.name as master_name,
                CONCAT('/masters/', m.slug, '/products/', p.slug, '/main.jpg') as image
            FROM products p
            JOIN masters m ON p.master_id = m.id
            WHERE p.slug = $1 AND p.is_active = true
        `, [slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении товара' });
    }
});

// ============================================================
// API: ПОЛУЧИТЬ ВСЕХ МАСТЕРОВ (с фильтром по типу)
// ============================================================
app.get('/api/masters', async (req, res) => {
    try {
        const { type } = req.query;
        
        let query = `
            SELECT 
                id, slug, name, short_name, title, bio, badge, 
                rating, works_count, extra_data, created_at, type,
                CONCAT('/masters/', slug, '/avatar.jpg') as avatar
            FROM masters 
            WHERE is_active = true
        `;
        const params = [];
        
        if (type) {
            query += ` AND type = $1`;
            params.push(type);
        }
        
        query += ` ORDER BY works_count DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении мастеров' });
    }
});

// ============================================================
// API: ПОЛУЧИТЬ МАСТЕРА ПО SLUG С ЕГО ТОВАРАМИ
// ============================================================
app.get('/api/masters/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        const masterResult = await pool.query(`
            SELECT 
                *,
                CONCAT('/masters/', $1::text, '/avatar.jpg') as avatar
            FROM masters 
            WHERE slug = $1 AND is_active = true
        `, [slug]);
        
        if (masterResult.rows.length === 0) {
            return res.status(404).json({ error: 'Мастер не найден' });
        }
        
        const productsResult = await pool.query(`
            SELECT 
                p.id,
                p.slug,
                p.name,
                p.description,
                p.price,
                p.badge,
                p.rating,
                p.meta_data,
                CONCAT('/masters/', $1::text, '/products/', p.slug, '/main.jpg') as image
            FROM products p
            WHERE p.master_id = $2 AND p.is_active = true
        `, [slug, masterResult.rows[0].id]);
        
        res.json({
            master: masterResult.rows[0],
            products: productsResult.rows
        });
    } catch (err) {
        console.error('Ошибка /api/masters/:slug:', err);
        res.status(500).json({ 
            error: 'Ошибка при получении мастера',
            details: err.message
        });
    }
});

// ============================================================
// API: ПОЛУЧИТЬ ТОВАРЫ МАСТЕРА ПО SLUG
// ============================================================
app.get('/api/masters/:slug/products', async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await pool.query(`
            SELECT 
                p.id,
                p.slug,
                p.name,
                p.description,
                p.price,
                p.badge,
                p.rating,
                p.meta_data,
                CONCAT('/masters/', $1, '/products/', p.slug, '/main.jpg') as image
            FROM products p
            JOIN masters m ON p.master_id = m.id
            WHERE m.slug = $1 AND p.is_active = true
        `, [slug]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении товаров мастера' });
    }
});

// ============================================================
// API: ОФОРМЛЕНИЕ ЗАКАЗА
// ============================================================
app.post('/api/orders', async (req, res) => {
    try {
        const { items, customerName, customerPhone, customerEmail, deliveryAddress, comment, total } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Корзина пуста' });
        }
        
        if (!customerName || !customerPhone) {
            return res.status(400).json({ error: 'Имя и телефон обязательны' });
        }
        
        const orderNumber = 'ORD-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        
        const result = await pool.query(`
            INSERT INTO orders (
                order_number, customer_name, customer_phone, customer_email,
                delivery_address, comment, total_amount, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', NOW())
            RETURNING id
        `, [orderNumber, customerName, customerPhone, customerEmail, deliveryAddress, comment, total]);
        
        const orderId = result.rows[0].id;
        
        for (const item of items) {
            await pool.query(`
                INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
                VALUES ($1, $2, $3, $4, $5)
            `, [orderId, item.id, item.name, item.price, item.quantity]);
        }
        
        // Отправляем письмо
        try {
            await sendOrderEmail({
                orderNumber,
                customerName,
                customerPhone,
                customerEmail,
                deliveryAddress,
                comment,
                items,
                total
            });
        } catch (emailError) {
            console.error('❌ Ошибка отправки письма:', emailError);
        }
        
        res.json({
            success: true,
            orderNumber: orderNumber,
            message: 'Заказ оформлен'
        });
        
    } catch (err) {
        console.error('Ошибка при оформлении заказа:', err);
        res.status(500).json({ error: 'Ошибка при оформлении заказа' });
    }
});

// ============================================================
// ОБРАБОТКА ОШИБОК (для production)
// ============================================================
if (process.env.NODE_ENV === 'production') {
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    });
}

// ============================================================
// API: ОБНОВИТЬ МАСТЕРА (PUT)
// ============================================================
app.put('/api/masters/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { name, short_name, title, bio, badge, type, city, experience, education, style, materials, instagram, phone } = req.body;
        
        const extraData = {
            city: city || null,
            experience: experience || null,
            education: education || null,
            style: style || null,
            materials: materials || [],
            instagram: instagram || null,
            phone: phone || null
        };
        
        const result = await pool.query(`
            UPDATE masters SET
                name = $1,
                short_name = $2,
                title = $3,
                bio = $4,
                badge = $5,
                type = $6,
                extra_data = $7
            WHERE slug = $8
            RETURNING id
        `, [name, short_name, title, bio, badge, type, JSON.stringify(extraData), slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Мастер не найден' });
        }
        
        res.json({ success: true, message: 'Мастер обновлён' });
        
    } catch (err) {
        console.error('Ошибка обновления мастера:', err);
        res.status(500).json({ error: 'Ошибка обновления мастера' });
    }
});

// ============================================================
// API: ОБНОВИТЬ ТОВАР (PUT)
// ============================================================
app.put('/api/products/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { name, description, price, badge, rating, meta_data } = req.body;
        
        const result = await pool.query(`
            UPDATE products SET
                name = $1,
                description = $2,
                price = $3,
                badge = $4,
                rating = $5,
                meta_data = $6::jsonb,
                updated_at = NOW()
            WHERE slug = $7
            RETURNING id
        `, [name, description, price, badge, rating, JSON.stringify(meta_data || []), slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        res.json({ success: true, message: 'Товар обновлён' });
        
    } catch (err) {
        console.error('Ошибка обновления товара:', err);
        res.status(500).json({ error: 'Ошибка обновления товара' });
    }
});

// ============================================================
// API: ПОЛУЧИТЬ ВСЕ ЗАКАЗЫ
// ============================================================
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM orders ORDER BY created_at DESC LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении заказов' });
    }
});

// ============================================================
// СТРАНИЦА АДМИНКИ
// ============================================================
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// ============================================================
// API: СОЗДАТЬ МАСТЕРА
// ============================================================
app.post('/api/admin/masters', async (req, res) => {
    try {
        const { slug, name, short_name, type, title, badge, rating, bio, city, experience, education, style, materials, instagram, phone } = req.body;
        
        if (!slug || !name) {
            return res.status(400).json({ error: 'Slug и имя обязательны' });
        }
        
        // Проверяем, нет ли уже такого slug
        const existing = await pool.query('SELECT id FROM masters WHERE slug = $1', [slug]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Мастер с таким slug уже существует' });
        }
        
        const extraData = {
            city: city || null,
            experience: experience || null,
            education: education || null,
            style: style || null,
            materials: materials || [],
            instagram: instagram || null,
            phone: phone || null
        };
        
        // Создаём запись в БД
        const result = await pool.query(`
            INSERT INTO masters (slug, name, short_name, title, bio, badge, rating, type, extra_data, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
            RETURNING id
        `, [slug, name, short_name, title, bio, badge, rating || 5.0, type, JSON.stringify(extraData)]);
        
        // Создаём папку мастера и info.json
        const masterPath = path.join(__dirname, '../masters', slug);
        const productsPath = path.join(masterPath, 'products');
        
        if (!fs.existsSync(masterPath)) {
            fs.mkdirSync(masterPath, { recursive: true });
        }
        if (!fs.existsSync(productsPath)) {
            fs.mkdirSync(productsPath, { recursive: true });
        }
        
        // Создаём info.json
        const infoJson = {
            name: name,
            short_name: short_name || '',
            title: title || '',
            bio: bio || '',
            badge: badge || '',
            rating: 0,
            type: type || 'individual',
            city: city || '',
            experience: experience || null,
            education: education || '',
            style: style || '',
            materials: materials || [],
            sertificates: [],
            instagram: instagram || '',
            phone: phone || ''
        };
        
        fs.writeFileSync(
            path.join(masterPath, 'info.json'),
            JSON.stringify(infoJson, null, 4),
            'utf8'
        );
        
        res.json({
            success: true,
            id: result.rows[0].id,
            slug: slug,
            message: 'Мастер создан'
        });
        
    } catch (err) {
        console.error('Ошибка создания мастера:', err);
        res.status(500).json({ error: 'Ошибка создания мастера: ' + err.message });
    }
});

// ============================================================
// API: ОБНОВИТЬ МАСТЕРА
// ============================================================
app.put('/api/admin/masters/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { name, short_name, type, title, badge, rating, bio, city, experience, education, style, materials, instagram, phone } = req.body;
        
        const extraData = {
            city: city || null,
            experience: experience || null,
            education: education || null,
            style: style || null,
            materials: materials || [],
            instagram: instagram || null,
            phone: phone || null
        };
        
        const result = await pool.query(`
            UPDATE masters SET
                name = $1,
                short_name = $2,
                type = $3,
                title = $4,
                badge = $5,
                rating = $6,
                bio = $7,
                extra_data = $8
            WHERE slug = $9
            RETURNING id
        `, [name, short_name, type, title, badge, rating || 5.0, bio, JSON.stringify(extraData), slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Мастер не найден' });
        }
        
        // Обновляем info.json
        const masterPath = path.join(__dirname, '../masters', slug);
        const infoPath = path.join(masterPath, 'info.json');
        
        if (fs.existsSync(masterPath)) {
            const infoJson = {
                name: name,
                short_name: short_name || '',
                title: title || '',
                bio: bio || '',
                badge: badge || '',
                type: type || 'individual',
                city: city || '',
                experience: experience || null,
                education: education || '',
                style: style || '',
                materials: materials || [],
                instagram: instagram || '',
                phone: phone || ''
            };
            
            fs.writeFileSync(infoPath, JSON.stringify(infoJson, null, 4), 'utf8');
        }
        
        res.json({ success: true, message: 'Мастер обновлён' });
        
    } catch (err) {
        console.error('Ошибка обновления мастера:', err);
        res.status(500).json({ error: 'Ошибка обновления мастера' });
    }
});

// ============================================================
// API: ЗАГРУЗКА АВАТАРКИ МАСТЕРА
// ============================================================

app.post('/api/admin/upload/avatar/:slug', (req, res) => {
    const slug = req.params.slug;
    const masterPath = path.join(__dirname, '../masters', slug);
    
    // Создаём папку, если её нет
    if (!fs.existsSync(masterPath)) {
        fs.mkdirSync(masterPath, { recursive: true });
    }
    
    // Настраиваем multer для этого запроса
    const upload = multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, masterPath);
            },
            filename: function (req, file, cb) {
                cb(null, 'avatar.jpg');
            }
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: function (req, file, cb) {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new Error('Только изображения'));
            }
            cb(null, true);
        }
    }).single('avatar');
    
    upload(req, res, async function(err) {
        if (err) {
            console.error('❌ Ошибка multer:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        console.log(`✅ Аватарка для ${slug} загружена`);
        
        // Обновляем путь в БД
        try {
            await pool.query(
                'UPDATE masters SET avatar = $1 WHERE slug = $2',
                [`/masters/${slug}/avatar.jpg`, slug]
            );
        } catch (dbErr) {
            console.error('Ошибка обновления аватарки в БД:', dbErr);
        }
        
        res.json({
            success: true,
            path: `/masters/${slug}/avatar.jpg`
        });
    });
});

// ============================================================
// API: СОЗДАТЬ ТОВАР
// ============================================================
app.post('/api/admin/products', async (req, res) => {
    try {
        const { slug, master_slug, name, description, price, badge, rating, meta_data } = req.body;
        
        if (!slug || !master_slug || !name) {
            return res.status(400).json({ error: 'Slug, мастер и название обязательны' });
        }
        
        // Проверяем, нет ли уже такого slug
        const existing = await pool.query('SELECT id FROM products WHERE slug = $1', [slug]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Товар с таким slug уже существует' });
        }
        
        // Находим мастера
        const masterResult = await pool.query('SELECT id, slug FROM masters WHERE slug = $1', [master_slug]);
        if (masterResult.rows.length === 0) {
            return res.status(400).json({ error: 'Мастер не найден' });
        }
        
        const masterId = masterResult.rows[0].id;
        
        // Создаём запись в БД
        const result = await pool.query(`
            INSERT INTO products (slug, master_id, name, description, price, badge, rating, meta_data, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true)
            RETURNING id
        `, [slug, masterId, name, description, price, badge, rating, JSON.stringify(meta_data || [])]);
        
        // Создаём папку товара и info.json
        const productPath = path.join(__dirname, '../masters', master_slug, 'products', slug);
        if (!fs.existsSync(productPath)) {
            fs.mkdirSync(productPath, { recursive: true });
        }
        
        const infoJson = {
            name: name,
            description: description || '',
            price: price,
            badge: badge || '',
            rating: rating || 5.0,
            meta_data: meta_data || []
        };
        
        fs.writeFileSync(
            path.join(productPath, 'info.json'),
            JSON.stringify(infoJson, null, 4),
            'utf8'
        );
        
        // Обновляем works_count у мастера
        await pool.query(`
            UPDATE masters SET works_count = (
                SELECT COUNT(*) FROM products WHERE master_id = $1
            ) WHERE id = $1
        `, [masterId]);
        
        res.json({
            success: true,
            id: result.rows[0].id,
            slug: slug,
            message: 'Товар создан'
        });
        
    } catch (err) {
        console.error('Ошибка создания товара:', err);
        res.status(500).json({ error: 'Ошибка создания товара: ' + err.message });
    }
});

// ============================================================
// API: ОБНОВИТЬ ТОВАР
// ============================================================
app.put('/api/admin/products/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { name, description, price, badge, rating, meta_data } = req.body;
        
        const result = await pool.query(`
            UPDATE products SET
                name = $1,
                description = $2,
                price = $3,
                badge = $4,
                rating = $5,
                meta_data = $6::jsonb,
                updated_at = NOW()
            WHERE slug = $7
            RETURNING id, master_id
        `, [name, description, price, badge, rating, JSON.stringify(meta_data || []), slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        // Обновляем info.json
        const masterResult = await pool.query('SELECT slug FROM masters WHERE id = $1', [result.rows[0].master_id]);
        if (masterResult.rows.length > 0) {
            const masterSlug = masterResult.rows[0].slug;
            const productPath = path.join(__dirname, '../masters', masterSlug, 'products', slug);
            const infoPath = path.join(productPath, 'info.json');
            
            if (fs.existsSync(productPath)) {
                const infoJson = {
                    name: name,
                    description: description || '',
                    price: price,
                    badge: badge || '',
                    rating: rating || 5.0,
                    meta_data: meta_data || []
                };
                
                fs.writeFileSync(infoPath, JSON.stringify(infoJson, null, 4), 'utf8');
            }
        }
        
        res.json({ success: true, message: 'Товар обновлён' });
        
    } catch (err) {
        console.error('Ошибка обновления товара:', err);
        res.status(500).json({ error: 'Ошибка обновления товара' });
    }
});

// ============================================================
// API: ЗАГРУЗКА ФОТО ТОВАРА
// ============================================================
app.post('/api/admin/upload/product/:masterSlug/:productSlug', (req, res) => {
    const { masterSlug, productSlug } = req.params;
    const productPath = path.join(__dirname, '../masters', masterSlug, 'products', productSlug);
    
    if (!fs.existsSync(productPath)) {
        fs.mkdirSync(productPath, { recursive: true });
    }
    
    const upload = multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, productPath);
            },
            filename: function (req, file, cb) {
                cb(null, 'main.jpg');
            }
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: function (req, file, cb) {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new Error('Только изображения'));
            }
            cb(null, true);
        }
    }).single('image');
    
    upload(req, res, function(err) {
        if (err) {
            console.error('❌ Ошибка multer:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        console.log(`✅ Фото товара ${masterSlug}/${productSlug} загружено`);
        
        res.json({
            success: true,
            path: `/masters/${masterSlug}/products/${productSlug}/main.jpg`
        });
    });
});

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(port, () => {
    console.log(`🚀 API работает на http://localhost:${port}`);
    console.log(`📦 Товары: http://localhost:${port}/api/products`);
    console.log(`👤 Мастера: http://localhost:${port}/api/masters`);
    console.log(`🌐 Сайт: http://localhost:${port}/`);
    console.log(`📧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
