// gUlEm · proxy cùng tên miền tới ntfy.sh
// Trình duyệt khách chỉ gọi /api/ntfy (cùng tên miền app) -> không bị mạng chặn.
// Máy chủ Vercel mới là bên gọi ntfy.sh (không bị chặn). Zero setup.
const BASE = process.env.GULEM_NTFY || 'gulem-ord-45dce218aa';
const SUF = { orders: '', status: '-st', menu: '-menu', review: '-rv' };

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') { try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve(req.body); } }
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; });
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(d); } });
    req.on('error', () => resolve(''));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const kind = (req.query && req.query.topic) || 'orders';
  const suf = (SUF[kind] !== undefined) ? SUF[kind] : '';
  const topic = BASE + suf;

  try {
    if (req.method === 'GET') {
      const since = String((req.query && req.query.since) || '24h').replace(/[^a-z0-9]/gi, '');
      const r = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=${since}`);
      const t = await r.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(t);
      return;
    }
    if (req.method === 'POST') {
      const data = await readBody(req);
      const msg = (typeof data === 'string') ? data : JSON.stringify(data);
      const pr = await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST', body: msg, headers: { 'Title': 'gUlEm', 'Tags': 'bell', 'Priority': 'high' }
      });
      // Khi là đơn mới: phát thêm sự kiện "sold" để trừ tồn kho theo ngày
      if (kind === 'orders' && data && typeof data === 'object' && data.recvDate && Array.isArray(data.items)) {
        const si = {};
        data.items.forEach((it) => { si[it.name] = (si[it.name] || 0) + (it.qty || 0); });
        try { await fetch(`https://ntfy.sh/${BASE}-menu`, { method: 'POST', body: JSON.stringify({ t: 'sold', date: data.recvDate, items: si, ts: Date.now() }) }); } catch (e) {}
      }
      // Phát thêm bản tin DỄ ĐỌC sang topic -push để chủ quán nhận ĐẨY NỀN qua app ntfy (kể cả khi đóng app web)
      if (kind === 'orders' && data && typeof data === 'object') {
        try {
          const nm = (data.customer && data.customer.name) || 'Khach';
          const items = (data.items || []).map((it) => `${it.name} x${it.qty}`).join(', ');
          const tot = (Number(data.total) || 0).toLocaleString('vi-VN') + 'd';
          const recv = (data.recvLabel && data.recvLabel !== 'Hôm nay') ? (' | ' + data.recvLabel) : '';
          const body = `${nm} - ${tot}${recv}\n${items}`;
          await fetch(`https://ntfy.sh/${BASE}-push`, { method: 'POST', body, headers: { 'Title': 'gUlEm - Don moi' + (data.code ? (' ' + data.code) : ''), 'Tags': 'bell', 'Priority': 'urgent', 'Click': 'https://guiem-blue.vercel.app/?admin=1' } });
        } catch (e) {}
      }
      res.status(pr.ok ? 200 : 502).json({ ok: pr.ok, code: (data && data.code) || null });
      return;
    }
    res.status(405).json({ ok: false });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
};
