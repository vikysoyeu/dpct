# Hướng dẫn cài đặt và chạy dự án

**Cập nhật:** 2026-06-04  
**Phạm vi:** chạy DPCT trên máy local cho phát triển và demo.

## 1. Yêu cầu hệ thống

| Thành phần | Phiên bản khuyến nghị |
|---|---|
| Node.js | 18+ hoặc 20+ |
| pnpm | 9+ |
| Docker | bản có Docker Compose |
| Trình duyệt | Chrome, Edge, Firefox hoặc Safari bản mới |

## 2. Cài dependencies

```bash
git clone <repo-url>
cd DPCT
pnpm install
```

Repo dùng pnpm workspace:

- `apps/web`: Next.js frontend.
- `apps/api`: Fastify backend.
- `packages/types`: type dùng chung.

## 3. Tạo file môi trường

```bash
cp .env.example .env
```

Các biến quan trọng:

| Biến | Mô tả | Giá trị local thường dùng |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/rescue_coordination` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret ký JWT | đặt chuỗi mạnh, không dùng `change_me` khi deploy |
| `CORS_ORIGIN` | Origin frontend được phép gọi API | `http://localhost:3000` |
| `PORT` | Port API | `3001` |
| `VALHALLA_URL` | URL routing service | `http://localhost:8002` |
| `NEXT_PUBLIC_API_URL` | API URL/proxy frontend | local có thể dùng `/backend` hoặc `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3001` |
| `NEXT_PUBLIC_OSM_TILE` | Tile server bản đồ | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |

Các nhóm env tùy chọn:

- Geocoding: `GEOCODING_PROVIDER`, `VIETMAP_API_KEY`, `GOONG_API_KEY`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`.
- Email: `EMAIL_PROVIDER`, `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`.
- SePay: `SEPAY_ACCOUNT_NUMBER`, `SEPAY_BANK_CODE`, `SEPAY_WEBHOOK_API_KEY`.
- Storage: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`.

## 4. Chạy hạ tầng local

```bash
docker compose up -d
```

Docker Compose chạy:

| Service | Port | Ghi chú |
|---|---:|---|
| PostgreSQL/PostGIS | `5432` | database chính |
| Redis | `6379` | cache/realtime support |
| Valhalla | `8002` | routing |

Kiểm tra:

```bash
docker compose ps
```

## 5. Chuẩn bị database

```bash
pnpm --filter @rescue/api db:push
pnpm --filter @rescue/api db:generate
pnpm --filter @rescue/api db:seed
```

Seed tạo dữ liệu mẫu cho demo và tài khoản admin:

```text
username: admin
password: admin123
```

Reset database khi cần:

```bash
pnpm --filter @rescue/api db:reset
```

Mở Prisma Studio:

```bash
pnpm --filter @rescue/api db:studio
```

## 6. Chạy ứng dụng

Terminal 1, chạy API:

```bash
pnpm dev:api
```

API chạy tại `http://localhost:3001`.

Terminal 2, chạy web:

```bash
pnpm dev:web
```

Web chạy tại `http://localhost:3000`.

Kiểm tra API:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/dashboard/stats
curl http://localhost:3001/locations
```

## 7. Build và kiểm tra

```bash
pnpm build
pnpm lint
pnpm typecheck
```

## 8. Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| API không kết nối database | kiểm tra `docker compose ps` và `DATABASE_URL` |
| Frontend lỗi CORS | kiểm tra `CORS_ORIGIN` có `http://localhost:3000` |
| Không tìm được route bản đồ | kiểm tra container Valhalla và `VALHALLA_URL` |
| Seed lỗi do dữ liệu cũ | chạy `pnpm --filter @rescue/api db:reset` |
| Token lỗi sau khi đổi env | đăng xuất, xóa localStorage token, đăng nhập lại |
