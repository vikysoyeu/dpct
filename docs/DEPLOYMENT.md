# Hướng dẫn triển khai

**Cập nhật:** 2026-06-04

Tài liệu này mô tả hướng triển khai đơn giản cho demo/sản phẩm môn học. Cấu hình production thật có thể cần bổ sung domain, HTTPS, backup và giám sát.

## 1. Kiến trúc triển khai gợi ý

| Thành phần | Nơi triển khai gợi ý |
|---|---|
| Web `apps/web` | Vercel |
| API `apps/api` | Render |
| Database | Neon, Supabase hoặc PostgreSQL managed |
| Redis | Upstash hoặc Redis managed |
| Routing | Valhalla self-host hoặc service riêng |
| File storage | Cloudflare R2 hoặc storage tương đương |

## 2. Chuẩn bị database

Tạo PostgreSQL database managed và lấy connection string.

Env cần cho API:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<secret-manh>
CORS_ORIGIN=https://<web-domain>
PORT=3001
```

Chạy migration/schema:

```bash
pnpm install
pnpm --filter @rescue/api db:push
pnpm --filter @rescue/api db:generate
pnpm --filter @rescue/api db:seed
```

## 3. Deploy API lên Render

Repo có sẵn `render.yaml`.

Render blueprint hiện dùng:

- Root directory: `apps/api`.
- Build command: `pnpm build`.
- Start command: `pnpm start`.
- Node version: `20`.

Env cần cấu hình trên Render:

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `DATABASE_URL` | Có | PostgreSQL connection string. |
| `JWT_SECRET` | Có | Chuỗi mạnh, không dùng default. |
| `CORS_ORIGIN` | Có | Domain web, có thể nhiều origin cách nhau bằng dấu phẩy. |
| `REDIS_URL` | Khuyến nghị | Dùng cho hạ tầng realtime/cache nếu bật. |
| `VALHALLA_URL` | Tùy chọn | Cần nếu dùng routing. |
| `GEOCODING_PROVIDER` | Tùy chọn | `nominatim`, `vietmap`, `goong`, `mapbox`, `google`. |
| `RESEND_API_KEY`/SMTP | Tùy chọn | Cần nếu gửi email thật. |
| `SEPAY_WEBHOOK_API_KEY` | Tùy chọn | Cần nếu bật webhook SePay. |

Sau deploy, kiểm tra:

```bash
curl https://<api-domain>/health
```

## 4. Deploy web lên Vercel

Khi import repo:

- Root directory: `apps/web`.
- Framework: Next.js.
- Install/build theo Vercel mặc định hoặc dùng pnpm.

Env web:

```env
NEXT_PUBLIC_API_URL=https://<api-domain>
NEXT_PUBLIC_WS_URL=wss://<api-domain>
NEXT_PUBLIC_OSM_TILE=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Nếu dùng route proxy `/backend` như local, cần cấu hình rewrite phù hợp. Khi deploy public, cách rõ nhất là đặt `NEXT_PUBLIC_API_URL` trỏ thẳng về API domain.

## 5. CORS và WebSocket

API đọc `CORS_ORIGIN` dạng danh sách:

```env
CORS_ORIGIN=https://dpct.vercel.app,https://preview-domain.vercel.app
```

Nếu frontend gọi API lỗi CORS:

1. Kiểm tra domain web đúng tuyệt đối.
2. Kiểm tra không thừa slash cuối nếu cấu hình đang so khớp chặt.
3. Redeploy/restart API sau khi đổi env.

## 6. SePay webhook

Webhook backend:

```text
POST https://<api-domain>/webhooks/sepay
```

Repo cũng có route proxy trong web:

```text
POST https://<web-domain>/api/webhooks/sepay
```

Nếu dùng proxy web, đặt `API_URL` trong Vercel để web chuyển tiếp về API.

## 7. Checklist trước khi demo

- `GET /health` trả `status: ok`.
- Web mở được trang chủ.
- Đăng nhập admin bằng tài khoản seed.
- Dashboard có dữ liệu.
- Bản đồ hiển thị tile.
- Tạo yêu cầu cứu trợ thành công.
- Tình nguyện viên đăng ký/đăng nhập được.
- Các env nhạy cảm không nằm trong git.

## 8. Lỗi thường gặp

| Lỗi | Cách kiểm tra |
|---|---|
| API build lỗi trên Render | kiểm tra `rootDir`, `pnpm-lock.yaml`, Node version. |
| Database lỗi SSL | kiểm tra connection string managed DB. |
| Frontend gọi API sai domain | kiểm tra `NEXT_PUBLIC_API_URL`. |
| WebSocket không kết nối | kiểm tra `NEXT_PUBLIC_WS_URL`, CORS và domain HTTPS/WSS. |
| Email không gửi | kiểm tra provider, API key/SMTP credential và log API. |
