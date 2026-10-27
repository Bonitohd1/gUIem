// ===== gUlEm · Node "Soạn đơn" — bản chỉn chu (Telegram rõ info + địa chỉ + thanh toán) =====
// Dán toàn bộ đoạn này vào node Code "Soạn đơn" (thay code cũ), bấm Save.

const order = ($input.first().json.body) || $input.first().json || {};
const vnd = n => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
const cus = order.customer || {};
const now = new Date();
const pad = n => ('0' + n).slice(-2);
const timeStr = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
const code = 'GU' + String(now.getTime()).slice(-6);

const items = order.items || [];
const itemLines = items.map(it => {
  const opt = it.opts ? '\n     ⤷ ' + it.opts : '';
  return '• ' + it.name + ' ×' + it.qty + '  —  ' + vnd(it.lineTotal) + opt;
});

const L = [];
L.push('🧾 ĐƠN MỚI · ' + (order.shop || 'gUlEm'));
L.push('🔖 Mã: ' + code + '    🕒 ' + timeStr);
L.push('━━━━━━━━━━━━━');
itemLines.forEach(x => L.push(x));
L.push('━━━━━━━━━━━━━');
L.push('💰 Tổng: ' + vnd(order.total) + '  (' + (order.count || 0) + ' món)');
L.push('');
if (cus.name)    L.push('👤 Khách: ' + cus.name);
if (cus.phone)   L.push('📞 SĐT: ' + cus.phone);
if (cus.address) L.push('📍 Địa chỉ: ' + cus.address);
L.push('💳 Thanh toán: ' + (order.payment || 'Tiền mặt khi nhận'));
if (order.note)  L.push('📝 Ghi chú: ' + order.note);
const zaloText = L.join('\n');

const itemsText = items.map(i => i.name + (i.opts ? '(' + i.opts + ')' : '') + ' x' + i.qty).join(', ');

return [{
  json: {
    code,
    at: now.toISOString(),
    shop: order.shop || 'gUlEm',
    customerName: cus.name || '',
    customerPhone: cus.phone || '',
    address: cus.address || '',
    itemsText,
    count: order.count || 0,
    total: order.total || 0,
    payment: order.payment || 'Tiền mặt khi nhận',
    note: order.note || '',
    zaloText
  }
}];
