# Trạng thái dự án

**Cập nhật:** 2026-06-04

Tài liệu này tóm tắt phạm vi hiện tại của repo. Không phải kế hoạch sprint chi tiết.

## 1. Đã có trong repo

| Nhóm | Trạng thái |
|---|---|
| Monorepo pnpm | Hoàn thành. |
| Frontend Next.js | Có các khu vực public, volunteer, admin. |
| Backend Fastify | Có route theo module chính. |
| Database Prisma/PostgreSQL | Có schema, migrations, seed. |
| Auth admin | Có username/password, JWT, role guard. |
| Auth tình nguyện viên | Có đăng ký, đăng nhập, hồ sơ, reset password. |
| Bản đồ | Có Leaflet/OpenStreetMap, marker/location, route layer. |
| Routing | Có route API gọi Valhalla. |
| Geocoding | Có VietMap/Goong/Google/Mapbox/Nominatim theo env. |
| Rescue request | Có public request, admin quản lý, mission. |
| Volunteer portal | Có danh sách yêu cầu, đăng ký tham gia, hồ sơ. |
| Inventory/fund | Có kho, tài trợ, giao dịch quỹ, SePay webhook. |
| Email | Có template/log và gửi email qua provider. |
| Notification | Có lưu notification và realtime Socket.IO. |
| Deployment config | Có `render.yaml`, hướng dẫn Vercel/Render. |

## 2. Dữ liệu seed

Seed tạo dữ liệu demo cho:

- Admin mặc định: `admin / admin123`.
- Tình nguyện viên, đội nhóm.
- Địa điểm, nhu cầu, yêu cầu cứu trợ.
- Kho hàng, danh mục hàng hóa, phân bổ.
- Nhà tài trợ, giao dịch quỹ.
- Email template.

Chạy:

```bash
pnpm --filter @rescue/api db:seed
```

## 3. Phần cần kiểm tra khi tiếp tục phát triển

| Nhóm | Việc nên kiểm tra |
|---|---|
| Phân quyền | Đảm bảo mọi endpoint admin nhạy cảm đều có guard đúng role. |
| Upload/storage | Xác định dùng local upload hay Cloudflare R2 cho môi trường thật. |
| Email | Test provider thật và nội dung template trước demo public. |
| SePay | Kiểm tra webhook secret, idempotency và log giao dịch. |
| Valhalla | Chuẩn bị dữ liệu OSM đủ tốt cho khu vực demo. |
| Tests | Repo hiện thiên về demo/manual; nên bổ sung test cho service/route quan trọng. |

## 4. Lệnh kiểm tra nhanh

```bash
pnpm typecheck
pnpm lint
pnpm build
curl http://localhost:3001/health
```

## 5. Tài liệu liên quan

- [SETUP_GUIDE.md](SETUP_GUIDE.md)
- [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)
- [API_REFERENCE.md](API_REFERENCE.md)
- [ADMIN_AUTH.md](ADMIN_AUTH.md)
