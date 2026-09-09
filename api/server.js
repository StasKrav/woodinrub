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
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(port, () => {
    console.log(`🚀 API работает на http://localhost:${port}`);
    console.log(`📦 Товары: http://localhost:${port}/api/products`);
    console.log(`👤 Мастера: http://localhost:${port}/api/masters`);
    console.log(`🌐 Сайт: http://localhost:${port}/`);
    console.log(`📧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
