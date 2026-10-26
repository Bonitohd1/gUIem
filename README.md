# An Yên — App Đặt Món (menu web)

App đặt đồ uống cho quán **An Yên Trà & Cà Phê**, gồm 7 màn: Thực đơn · Tùy biến món · Giỏ hàng · Xác nhận · Theo dõi đơn · Lịch sử · Tích điểm. Giao diện dựng từ Google Stitch (design system *Warm Roast & Leaf*), đồng giá 50.000đ.

Trang tĩnh một file (`index.html`) — deploy thẳng lên Vercel/Netlify, không cần build.

## 1. Deploy lên Vercel
1. Import repo này vào Vercel (New Project → chọn repo → Deploy). Không cần cấu hình build, Framework = **Other**, Output = thư mục gốc.
2. Deploy xong là có link `https://<project>.vercel.app`. Ảnh món (Stitch host) và webhook sẽ chạy bình thường vì không còn giới hạn sandbox.

## 2. Cấu hình (sửa đầu khối `<script>` controller cuối `index.html`)
```js
var ZALO_GROUP = "https://zalo.me/g/xxxxxx";  // link nhóm Zalo thật
var WEBHOOK    = "";                           // dán URL webhook n8n để tự bắn đơn
var SHOP       = "An Yên Trà & Cà Phê";
```
- `WEBHOOK` để trống: nút "Đặt qua Zalo" sẽ **copy đơn + mở nhóm Zalo** để khách dán.
- `WEBHOOK` có URL n8n: đơn **tự POST JSON** lên n8n (ghi Sheet + đẩy Zalo), app báo "Đã gửi đơn".

## 3. Đồng bộ n8n
1. Mở n8n (self-host) → **Import from File** → chọn `n8n/menu-order-workflow.json`.
2. Luồng 5 node: `Webhook → Soạn đơn → Google Sheet (append) → Đẩy nhóm Zalo (HTTP) → Trả về app`.
3. Điền:
   - **Google Sheet**: nối credential + Sheet ID. Tab `Orders`, header hàng 1: `at, shop, customerName, customerPhone, itemsText, count, total, note, zaloText`.
   - **Đẩy nhóm Zalo**: đổi URL thành endpoint bot Zalo của bạn + groupId (Zalo không có API chính thức đẩy nhóm — dùng bot self-host `zca-js` với SĐT phụ, hoặc đổi sang Telegram).
4. **Active** workflow → lấy Production URL `https://<n8n>/webhook/menu-order` → dán vào `WEBHOOK` ở `index.html`.

## 4. Đơn hàng gửi lên webhook (JSON)
```json
{
  "shop": "An Yên Trà & Cà Phê",
  "at": "2026-10-27T00:00:00Z",
  "count": 3,
  "total": 150000,
  "items": [{ "name": "Trà sữa xoài", "qty": 2, "price": 50000, "opts": "", "lineTotal": 100000 }],
  "customer": { "name": "...", "phone": "..." },
  "note": "ít đá"
}
```

---
Thực đơn (7 món, đồng giá 50.000đ): Trà Earl Grey kem sữa · Trà nhài kem sữa · Trà sữa xoài · Americano chanh vàng · Cà phê muối · Cà phê sữa · Hoa quả ép theo mùa.
