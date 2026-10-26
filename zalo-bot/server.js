import express from "express";
import fs from "fs";
import { Zalo, ThreadType } from "zca-js";

const PORT = process.env.PORT || 3030;
const API_KEY = process.env.API_KEY || "";
const GROUP_ID = process.env.GROUP_ID || "";
const UA = process.env.USER_AGENT || "";

let api = null, ready = false, ownId = null, lastError = null;

const zalo = new Zalo({ selfListen: false, checkUpdate: true, logging: true });

async function login() {
  try {
    api = await zalo.loginQR({ userAgent: UA || undefined, qrPath: "./qr.png" }, (qrPath) => {
      console.log(`\n[Zalo bot] Quét QR tại file ${qrPath}  (hoặc mở http://<host>:${PORT}/qr)\n`);
    });
    if (api.listener && api.listener.start) api.listener.start();
    ownId = api.getOwnId ? api.getOwnId() : null;
    ready = true;
    lastError = null;
    // QR đã dùng xong thì xoá để /qr không hiện mã cũ
    try { if (fs.existsSync("./qr.png")) fs.unlinkSync("./qr.png"); } catch (_) {}
    console.log(`[Zalo bot] Đã đăng nhập. ownId = ${ownId}`);
  } catch (e) {
    lastError = String(e);
    ready = false;
    console.error("[Zalo bot] Lỗi đăng nhập:", e);
  }
}
login();

const app = express();
app.use(express.json({ limit: "256kb" }));

function auth(req, res, next) {
  if (API_KEY && req.headers["x-api-key"] !== API_KEY)
    return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}

app.get("/health", (req, res) => res.json({ ok: true, ready, ownId, lastError }));

app.get("/qr", (req, res) => {
  const p = process.cwd() + "/qr.png";
  if (fs.existsSync(p)) return res.sendFile(p);
  res.status(404).send(ready ? "Đã đăng nhập, không cần quét." : "QR chưa sẵn sàng, thử lại sau vài giây.");
});

// Lấy danh sách nhóm để tìm GROUP_ID
app.get("/groups", auth, async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ ok: false, error: "chưa đăng nhập, mở /qr để quét" });
    const g = await api.getAllGroups();
    res.json({ ok: true, groups: g });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// n8n gọi vào đây: body { message, groupId? }
app.post("/send", auth, async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ ok: false, error: "chưa đăng nhập, mở /qr để quét" });
    const message = req.body && req.body.message;
    const threadId = (req.body && req.body.groupId) || GROUP_ID;
    if (!message || !threadId)
      return res.status(400).json({ ok: false, error: "thiếu message hoặc groupId" });
    const result = await api.sendMessage(String(message), String(threadId), ThreadType.Group);
    res.json({ ok: true, result });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

app.listen(PORT, () => console.log(`[Zalo bot] nghe cổng ${PORT}`));
