// gUlEm · Kho dữ liệu bền (Upstash Redis REST / Vercel KV)
// Lưu lâu dài: đơn hàng (theo SĐT), trạng thái, thực đơn theo ngày, tồn kho.
// Nếu CHƯA cấu hình biến môi trường -> trả {disabled:true} để client tự dùng ntfy (app vẫn chạy).

function creds() {
  const e = process.env;
  const url = e.UPSTASH_REDIS_REST_URL || e.KV_REST_API_URL || e.REDIS_REST_URL || e.STORAGE_REST_API_URL;
  const token = e.UPSTASH_REDIS_REST_TOKEN || e.KV_REST_API_TOKEN || e.REDIS_REST_TOKEN || e.STORAGE_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function cmd(c, arr) {
  const r = await fetch(c.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(arr),
  });
  const j = await r.json().catch(() => ({}));
  if (j && Object.prototype.hasOwnProperty.call(j, 'result')) return j.result;
  return null;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') { try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve({}); } }
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (x) => { d += x; });
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
const dateKey = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : '');
const codeKey = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const c = creds();
  const op = (req.query && req.query.op) || 'ping';

  if (!c) { res.status(200).json({ ok: false, disabled: true, configured: false }); return; }

  try {
    if (op === 'ping') { res.status(200).json({ ok: true, configured: true }); return; }

    // ---- GET: đọc ----
    if (req.method === 'GET') {
      if (op === 'history') {
        const ph = digits((req.query && req.query.phone) || '');
        const n = Math.min(60, parseInt((req.query && req.query.n) || '40', 10) || 40);
        if (!ph) { res.status(200).json({ ok: true, orders: [] }); return; }
        const codes = (await cmd(c, ['LRANGE', 'gu:op:' + ph, '0', String(n - 1)])) || [];
        if (!codes.length) { res.status(200).json({ ok: true, orders: [] }); return; }
        const vals = (await cmd(c, ['MGET'].concat(codes.map((x) => 'gu:o:' + x)))) || [];
        const orders = vals.map((v) => { try { return JSON.parse(v); } catch (e) { return null; } }).filter(Boolean);
        res.status(200).json({ ok: true, orders });
        return;
      }
      if (op === 'orders') { // admin: đơn gần đây
        const n = Math.min(300, parseInt((req.query && req.query.n) || '150', 10) || 150);
        const codes = (await cmd(c, ['LRANGE', 'gu:orec', '0', String(n - 1)])) || [];
        if (!codes.length) { res.status(200).json({ ok: true, orders: [] }); return; }
        const vals = (await cmd(c, ['MGET'].concat(codes.map((x) => 'gu:o:' + x)))) || [];
        const orders = vals.map((v) => { try { return JSON.parse(v); } catch (e) { return null; } }).filter(Boolean);
        res.status(200).json({ ok: true, orders });
        return;
      }
      if (op === 'top') {
        const n = Math.min(10, parseInt((req.query && req.query.n) || '5', 10) || 5);
        const arr = (await cmd(c, ['ZREVRANGE', 'gu:top', '0', String(n - 1), 'WITHSCORES'])) || [];
        const top = [];
        for (let i = 0; i < arr.length; i += 2) { top.push({ name: arr[i], sold: parseInt(arr[i + 1], 10) || 0 }); }
        res.status(200).json({ ok: true, top });
        return;
      }
      if (op === 'menu') {
        const dates = String((req.query && req.query.dates) || '').split(',').map(dateKey).filter(Boolean).slice(0, 7);
        const plans = {}, sold = {};
        for (const d of dates) {
          const p = await cmd(c, ['GET', 'gu:plan:' + d]);
          if (p) { try { plans[d] = JSON.parse(p); } catch (e) {} }
          const h = (await cmd(c, ['HGETALL', 'gu:sold:' + d])) || [];
          const m = {};
          for (let i = 0; i < h.length; i += 2) m[h[i]] = parseInt(h[i + 1], 10) || 0;
          sold[d] = m;
        }
        res.status(200).json({ ok: true, plans, sold });
        return;
      }
      res.status(400).json({ ok: false, error: 'bad op' });
      return;
    }

    // ---- POST: ghi ----
    const data = await readBody(req);

    if (op === 'order') {
      const code = codeKey(data.code);
      if (!code) { res.status(400).json({ ok: false, error: 'no code' }); return; }
      const ph = digits(data.customer && data.customer.phone);
      const doc = {
        code, at: data.at || new Date().toISOString(),
        items: data.items || [], total: data.total || 0, count: data.count || 0,
        customer: { name: (data.customer && data.customer.name) || '', phone: ph, address: (data.customer && data.customer.address) || '' },
        note: data.note || '', payment: data.payment || '', recvDate: data.recvDate || '', recvLabel: data.recvLabel || '',
        status: data.status || '', ts: Date.now(),
      };
      await cmd(c, ['SET', 'gu:o:' + code, JSON.stringify(doc)]);
      await cmd(c, ['LREM', 'gu:orec', '0', code]);
      await cmd(c, ['LPUSH', 'gu:orec', code]);
      await cmd(c, ['LTRIM', 'gu:orec', '0', '499']);
      if (ph) {
        await cmd(c, ['LREM', 'gu:op:' + ph, '0', code]);
        await cmd(c, ['LPUSH', 'gu:op:' + ph, code]);
        await cmd(c, ['LTRIM', 'gu:op:' + ph, '0', '59']);
      }
      // tồn kho theo ngày nhận
      const rd = dateKey(data.recvDate);
      if (rd && Array.isArray(data.items)) {
        for (const it of data.items) { if (it && it.name) await cmd(c, ['HINCRBY', 'gu:sold:' + rd, it.name, String(it.qty || 0)]); }
      }
      // Xếp hạng bán chạy (mọi đơn) để gợi ý "Top bán chạy"
      if (Array.isArray(data.items)) {
        for (const it of data.items) { if (it && it.name && (it.qty || 0) > 0) await cmd(c, ['ZINCRBY', 'gu:top', String(it.qty || 0), it.name]); }
      }
      res.status(200).json({ ok: true, code });
      return;
    }

    if (op === 'status') {
      const code = codeKey(data.code); const st = String(data.status || '').slice(0, 20);
      if (!code) { res.status(400).json({ ok: false, error: 'no code' }); return; }
      const cur = await cmd(c, ['GET', 'gu:o:' + code]);
      if (cur) { let o; try { o = JSON.parse(cur); } catch (e) { o = null; } if (o) { o.status = st; o.ts = Date.now(); await cmd(c, ['SET', 'gu:o:' + code, JSON.stringify(o)]); } }
      res.status(200).json({ ok: true });
      return;
    }

    if (op === 'delete') {
      const code = codeKey(data.code);
      if (!code) { res.status(400).json({ ok: false, error: 'no code' }); return; }
      let ph = '';
      const cur = await cmd(c, ['GET', 'gu:o:' + code]);
      if (cur) { try { const o = JSON.parse(cur); ph = digits(o.customer && o.customer.phone);
        if (Array.isArray(o.items)) { for (const it of o.items) { if (it && it.name && (it.qty || 0) > 0) await cmd(c, ['ZINCRBY', 'gu:top', String(-(it.qty || 0)), it.name]); } }
      } catch (e) {} }
      await cmd(c, ['DEL', 'gu:o:' + code]);
      await cmd(c, ['LREM', 'gu:orec', '0', code]);
      if (ph) await cmd(c, ['LREM', 'gu:op:' + ph, '0', code]);
      res.status(200).json({ ok: true });
      return;
    }

    if (op === 'plan') {
      const d = dateKey(data.date);
      if (!d) { res.status(400).json({ ok: false, error: 'bad date' }); return; }
      const plan = { date: d, items: data.items || {}, note: data.note || '', ts: Date.now() };
      await cmd(c, ['SET', 'gu:plan:' + d, JSON.stringify(plan)]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ ok: false, error: 'bad op' });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }
};
