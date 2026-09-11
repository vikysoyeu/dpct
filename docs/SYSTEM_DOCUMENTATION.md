# Tài liệu hệ thống

**Dự án:** DPCT - Hệ thống điều phối cứu trợ  
**Cập nhật:** 2026-06-04  
**Phạm vi:** mô tả kiến trúc và module theo hiện trạng mã nguồn.

## 1. Mục tiêu

DPCT hỗ trợ đội điều phối cứu trợ tiếp nhận yêu cầu, theo dõi địa điểm cần hỗ trợ, quản lý nhu cầu hàng hóa, nguồn lực tình nguyện viên, kho hàng, quỹ và nhiệm vụ cứu trợ.

Mục tiêu chính:

- Gom dữ liệu cứu trợ vào một hệ thống chung.
- Giúp điều phối viên quan sát tình hình qua dashboard và bản đồ.
- Giúp tình nguyện viên xem nhiệm vụ, đăng ký tham gia và cập nhật hồ sơ.
- Giúp bộ phận kho/quỹ theo dõi hàng hóa, tài trợ và giao dịch.
- Giảm thao tác thủ công khi phân loại, phân công và theo dõi yêu cầu.

## 2. Kiến trúc tổng thể

```text
Browser
  |
  | HTTP + WebSocket
  v
Next.js Web App (apps/web)
  |
  | REST API + Socket.IO client
  v
Fastify API (apps/api)
  |-- Prisma ORM -> PostgreSQL/PostGIS
  |-- Socket.IO -> realtime notifications
  |-- Valhalla -> routing
  |-- Geocoding providers -> address search
  |-- Email providers -> Resend/SMTP/Gmail
  |-- SePay webhook -> donation reconciliation
```

Hạ tầng local:

| Service | Container | Port |
|---|---|---:|
| PostgreSQL/PostGIS | `rescue-postgres` | `5432` |
| Redis | `rescue-redis` | `6379` |
| Valhalla | `rescue-valhalla` | `8002` |

## 3. Cấu trúc mã nguồn

```text
apps/web
├── app/                 # Next.js App Router pages/layouts
├── components/          # UI components
├── hooks/               # data hooks gọi API
├── lib/                 # api client, validation, map helpers
└── stores/              # Zustand stores

apps/api
├── src/index.ts         # Fastify bootstrap
├── src/routes/          # REST endpoints
├── src/plugins/         # Prisma, JWT, Socket.IO, Redis
├── src/services/        # business services
└── prisma/              # schema, migrations, seed

packages/types
└── src/index.ts         # type dùng chung
```

## 4. Vai trò người dùng

| Vai trò | Mô tả |
|---|---|
| Người dân | Gửi yêu cầu cứu trợ, xem bản đồ, đọc hướng dẫn, gửi tài trợ/quyên góp. |
| Tình nguyện viên | Đăng ký tài khoản, xem yêu cầu, đăng ký tham gia, theo dõi nhiệm vụ. |
| `ADMIN` | Quản trị toàn hệ thống. |
| `ADMIN_TNV` | Quản lý tình nguyện viên, đội cứu trợ, nguồn lực. |
| `ADMIN_YCCT` | Quản lý yêu cầu cứu trợ và nhiệm vụ. |
| `ADMIN_KHO` | Quản lý kho, tài trợ, quỹ và phân bổ hàng hóa. |

## 5. Module chính

| Module | Chức năng |
|---|---|
| Bản đồ | Hiển thị địa điểm, điểm cần hỗ trợ, điểm tắc đường, route. |
| Địa điểm | CRUD location, cập nhật hình ảnh/diễn biến, xác nhận trạng thái. |
| Yêu cầu cứu trợ | Tạo request công khai, quản trị request, tạo mission. |
| Tình nguyện viên | Đăng ký, đăng nhập, hồ sơ, nhận nhiệm vụ. |
| Đội cứu trợ | Lập đội, quản lý thành viên, gắn với mission. |
| Nhu cầu & kho | Quản lý item categories, inventory, sponsorship, phân bổ hàng. |
| Quỹ | Ghi nhận donation, transaction, webhook SePay. |
| Email | Gửi email theo template và ngữ cảnh request/mission. |
| Thông báo | Lưu notification và đẩy realtime qua Socket.IO. |

## 6. Dữ liệu chính

Các model quan trọng trong Prisma:

- `User`, `AdminUser`, `Volunteer`, `VolunteerTeam`.
- `Location`, `LocationUpdate`, `Need`.
- `RescueRequest`, `Mission`, `VolunteerRequest`, `RescueTeam`, `RescueTeamMember`.
- `ItemCategory`, `InventoryItem`, `Donor`, `DonorGoods`, `MissionItemAssignment`.
- `FundTransaction`, `Notification`, `EmailTemplate`, `EmailLog`.

Các enum nghiệp vụ chính:

- `UserRole`: `VICTIM`, `VOLUNTEER`, `COORDINATOR`, `ADMIN`, `ADMIN_TNV`, `ADMIN_YCCT`, `ADMIN_KHO`.
- `RequestStatus`: `CHO_TIEP_NHAN`, `DANG_THUC_HIEN`, `HOAN_THANH`, `HUY_BO`.
- `MissionStatus`: `CHO_TIEP_NHAN`, `DANG_TUYEN`, `DA_DU_DOI`, `DA_DU_HANG`, `SAN_SANG`, `DANG_THUC_HIEN`, `HOAN_THANH`, `HUY_BO`.
- `PriorityLevel`: `THAP`, `TRUNG_BINH`, `CAO`, `KHAN_CAP`.

## 7. Xác thực và phân quyền

Backend dùng `@fastify/jwt`, token hết hạn sau 24 giờ.

Token payload có:

- `sub`: id tài khoản.
- `kind`: `admin` hoặc `volunteer`.
- `role`: vai trò.
- `username`: tên đăng nhập nếu có.

Frontend lưu:

- `admin_token` cho khu vực admin.
- `volunteer_token` cho khu vực tình nguyện viên.

Guard backend:

- `requireAdmin`.
- `requireAdminRole([...])`.
- `requireVolunteer`.

Chi tiết xem [ADMIN_AUTH.md](ADMIN_AUTH.md).

## 8. Tích hợp ngoài

| Tích hợp | Mục đích |
|---|---|
| OpenStreetMap tiles | Bản đồ nền. |
| Valhalla | Tính đường đi. |
| VietMap/Goong/Google/Mapbox/Nominatim | Tìm kiếm địa chỉ và geocoding. |
| Socket.IO | Thông báo realtime. |
| Resend/SMTP/Gmail | Gửi email. |
| SePay | Webhook giao dịch ngân hàng. |
| Cloudflare R2 | Cấu hình lưu trữ file khi triển khai. |

## 9. Luồng nghiệp vụ mẫu

### Người dân gửi yêu cầu cứu trợ

1. Người dân mở `/rescue-request`.
2. Nhập thông tin liên hệ, địa chỉ, nhu cầu.
3. Backend tạo `RescueRequest` và mã yêu cầu.
4. Admin xem ở `/admin/rescue-requests`.
5. Admin duyệt/cập nhật trạng thái và tạo mission nếu cần.

### Tình nguyện viên tham gia nhiệm vụ

1. Tình nguyện viên đăng ký/đăng nhập.
2. Mở `/volunteer/requests`.
3. Xem chi tiết yêu cầu và đăng ký tham gia.
4. Backend tạo `VolunteerRequest`.
5. Admin/TNV quản lý đội và trạng thái mission.

### Kho phân bổ hàng cho mission

1. Bộ phận kho xem `/admin/inventory`.
2. Xem danh sách mission cần hàng.
3. Gán số lượng theo item category.
4. Backend cập nhật `MissionItemAssignment`.
5. Mission có thể chuyển sang trạng thái sẵn sàng khi đủ đội và đủ hàng.
