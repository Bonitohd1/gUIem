# An Yên — Zalo Bot (zca-js)

Service nhỏ chạy trên VPS, cho n8n POST vào `/send` để đẩy tin đơn hàng vào **nhóm Zalo**.
⚠️ zca-js đăng nhập bằng 1 tài khoản Zalo thật (không chính thức) → **dùng SĐT phụ**, Zalo có thể khóa số.

## Cài & chạy trên VPS
```bash
cd zalo-bot
cp .env.example .env            # sửa API_KEY, GROUP_ID (điền sau)
npm install
npm start                        # hoặc: pm2 start server.js --name anyen-zalo-bot
```

## Đăng nhập
1. Chạy lên, log in ra đường dẫn QR. Mở **`http://<ip-vps>:3030/qr`** trên trình duyệt.
2. Dùng **Zalo (SĐT phụ)** quét QR → đăng nhập. (Giữ service chạy bằng pm2; reboot/khởi động lại thì quét lại.)
3. Kiểm tra: `GET http://<ip-vps>:3030/health` → `{ ready: true }`.

## Lấy ID nhóm
- `GET http://<ip-vps>:3030/groups` (kèm header `x-api-key`) → trả `gridVerMap` gồm các `groupId`.
- Thêm bot (tài khoản phụ) vào đúng nhóm An Yên trước. Dán `groupId` vào `.env` (GROUP_ID) rồi restart, hoặc truyền `groupId` trong body.

## Nối n8n (node "Đẩy nhóm Zalo")
- Bật lại node, đặt:
  - **URL**: `http://<ip-vps>:3030/send`
  - **Header**: `x-api-key: <API_KEY trong .env>`
  - **Body (JSON)**: `{ "groupId": "<GROUP_ID>", "message": {{ JSON.stringify($json.zaloText) }} }`
- Execute workflow để test → tin sẽ hiện trong nhóm.

## Endpoint
- `GET /health` — trạng thái đăng nhập
- `GET /qr` — ảnh QR để quét
- `GET /groups` — danh sách nhóm (cần x-api-key)
- `POST /send` `{message, groupId?}` — gửi vào nhóm (cần x-api-key)
