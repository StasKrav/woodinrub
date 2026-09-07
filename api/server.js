const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// ============================================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// ============================================================
const pool = new Pool({
    user: 'woodinrub_user',
    host: 'localhost',
    database: 'woodinrub',
    password: 'woodinrub_pass',
    port: 5432,
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());

// 👇 РАЗДАЁМ СТАТИКУ
app.use('/masters', express.static(path.join(__dirname, '../masters')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/images', express.static(path.join(__dirname, '../images')));
// Раздаём статику из папки components
app.use('/components', express.static(path.join(__dirname, '../components')));

// 👇 РАЗДАЁМ HTML (чтобы index.html открывался по /)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
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
// API: ПОЛУЧИТЬ ВСЕХ МАСТЕРОВ (с extra_data)
// ============================================================
app.get('/api/masters', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, slug, name, short_name, title, bio, badge, 
                rating, works_count, extra_data, created_at,
                CONCAT('/masters/', slug, '/avatar.jpg') as avatar
            FROM masters 
            WHERE is_active = true 
            ORDER BY works_count DESC
        `);
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
                CONCAT('/masters/', slug, '/avatar.jpg') as avatar
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
                CONCAT('/masters/', $1, '/products/', p.slug, '/main.jpg') as image
            FROM products p
            WHERE p.master_id = $2 AND p.is_active = true
        `, [slug, masterResult.rows[0].id]);
        
        res.json({
            master: masterResult.rows[0],
            products: productsResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении мастера' });
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
// СТРАНИЦЫ
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/masters', (req, res) => {
    res.sendFile(path.join(__dirname, '../masters/index.html'));
});

// Страница корзины
app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, '../cart/index.html'));
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
        
        // Генерируем номер заказа
        const orderNumber = 'ORD-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        
        // Сохраняем заказ в БД
        const result = await pool.query(`
            INSERT INTO orders (
                order_number, customer_name, customer_phone, customer_email,
                delivery_address, comment, total_amount, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', NOW())
            RETURNING id
        `, [orderNumber, customerName, customerPhone, customerEmail, deliveryAddress, comment, total]);
        
        const orderId = result.rows[0].id;
        
        // Сохраняем товары в order_items
        for (const item of items) {
            await pool.query(`
                INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
                VALUES ($1, $2, $3, $4, $5)
            `, [orderId, item.id, item.name, item.price, item.quantity]);
        }
        
        // Здесь можно отправить уведомление на email/telegram
        
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
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(port, () => {
    console.log(`🚀 API работает на http://localhost:${port}`);
    console.log(`📦 Товары: http://localhost:${port}/api/products`);
    console.log(`👤 Мастера: http://localhost:${port}/api/masters`);
    console.log(`🌐 Сайт: http://localhost:${port}/index.html`);
});
