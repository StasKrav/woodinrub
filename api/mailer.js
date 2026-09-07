const nodemailer = require('nodemailer');

// ============================================================
// НАСТРОЙКИ ПОЧТЫ
// ============================================================
const EMAIL_USER = 'krav.stan@yandex.ru';      // 👈 Ваш email (отправитель)
const EMAIL_PASS = 'fmerxgxrowgrwkhp';    // 👈 Пароль приложения (не от почты!)
const EMAIL_TO = 'krav.stan@yandex.ru';  // 👈 Куда отправлять заказы

// Создаём транспорт
const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true, // true для 465, false для 587
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

// ============================================================
// ОТПРАВКА ПИСЬМА С ЗАКАЗОМ
// ============================================================
async function sendOrderEmail(orderData) {
    const { orderNumber, customerName, customerPhone, customerEmail, deliveryAddress, comment, items, total } = orderData;

    // Формируем список товаров
    let itemsHtml = items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${(item.price * item.quantity).toLocaleString()} ₽</td>
        </tr>
    `).join('');

    const html = `
        <h1>🪵 Новый заказ!</h1>
        <p><strong>Номер заказа:</strong> ${orderNumber}</p>
        <hr/>
        <h2>Информация о покупателе</h2>
        <p><strong>Имя:</strong> ${customerName}</p>
        <p><strong>Телефон:</strong> ${customerPhone}</p>
        <p><strong>Email:</strong> ${customerEmail || 'Не указан'}</p>
        <p><strong>Адрес доставки:</strong> ${deliveryAddress || 'Не указан'}</p>
        ${comment ? `<p><strong>Комментарий:</strong> ${comment}</p>` : ''}
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
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" align="right"><strong>Итого:</strong></td>
                    <td><strong>${total.toLocaleString()} ₽</strong></td>
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
        html: html,
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
