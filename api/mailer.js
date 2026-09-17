require('dotenv').config();
const nodemailer = require('nodemailer');

// ============================================================
// НАСТРОЙКИ ПОЧТЫ (из .env)
// ============================================================
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO   = process.env.EMAIL_TO;

if (!EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) {
    console.error('❌ Не заданы EMAIL_USER / EMAIL_PASS / EMAIL_TO в .env');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

// ============================================================
// ЭКРАНИРОВАНИЕ HTML
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// ОТПРАВКА ПИСЬМА С ЗАКАЗОМ
// ============================================================
async function sendOrderEmail(orderData) {
    const {
        orderNumber, customerName, customerPhone, customerEmail,
        deliveryAddress, comment, items, total
    } = orderData;

    const itemsHtml = items.map(item => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${Number(item.quantity) || 0}</td>
            <td>${(Number(item.price) * Number(item.quantity)).toLocaleString('ru-RU')} ₽</td>
        </tr>
    `).join('');

    const html = `
        <h1>🪵 Новый заказ!</h1>
        <p><strong>Номер заказа:</strong> ${escapeHtml(orderNumber)}</p>
        <hr/>
        <h2>Информация о покупателе</h2>
        <p><strong>Имя:</strong> ${escapeHtml(customerName)}</p>
        <p><strong>Телефон:</strong> ${escapeHtml(customerPhone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(customerEmail) || 'Не указан'}</p>
        <p><strong>Адрес доставки:</strong> ${escapeHtml(deliveryAddress) || 'Не указан'}</p>
        ${comment ? `<p><strong>Комментарий:</strong> ${escapeHtml(comment)}</p>` : ''}
        <hr/>
        <h2>Товары в заказе</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <thead>
                <tr>
                    <th>Товар</th>
                    <th>Кол-во</th>
                    <th>Сумма</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
                <tr>
                    <td colspan="2" align="right"><strong>Итого:</strong></td>
                    <td><strong>${Number(total).toLocaleString('ru-RU')} ₽</strong></td>
                </tr>
            </tfoot>
        </table>
        <hr/>
        <p style="color: #666; font-size: 12px;">Письмо сгенерировано автоматически. Не отвечайте на это письмо.</p>
    `;

    const mailOptions = {
        from: `"WoodInRub" <${EMAIL_USER}>`,
        to: EMAIL_TO,
        subject: `🪵 Новый заказ №${orderNumber}`,
        html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Письмо с заказом №${orderNumber} отправлено на ${EMAIL_TO}`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка отправки письма:', error);
        return false;
    }
}

module.exports = { sendOrderEmail };
