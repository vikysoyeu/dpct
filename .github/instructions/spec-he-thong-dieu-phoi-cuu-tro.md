# Specification: Hệ thống Điều phối Cứu trợ

**Phiên bản:** 0.1 (giai đoạn test)  
**Cập nhật:** 2025-04

---

## 1. Mục tiêu

Ứng dụng web hỗ trợ điều phối cứu hộ khẩn cấp (thiên tai, lũ lụt) theo thời gian thực, nhằm tối ưu phân bổ nguồn lực: con người, hàng hóa, phương tiện.

**Vấn đề cần giải quyết:**
- Không biết đưa hàng đến đâu, đi đường nào
- Không nắm được nhu cầu cụ thể từng điểm
- Đường dây nóng quá tải
- Phân bổ nguồn lực thiếu hiệu quả (chỗ thừa, chỗ thiếu)

---

## 2. Người dùng & Vai trò

| Vai trò | Mô tả |
|---|---|
| **Nạn nhân** | Người cần cứu trợ, báo nhu cầu |
| **Tình nguyện viên (TNV)** | Tham gia cứu trợ, cập nhật thực địa |
| **Cán bộ điều phối** | Quản lý tổng thể, phân công, xác nhận thông tin |

Đăng ký bằng số điện thoại + OTP (Zalo/SMS). Không yêu cầu email.

---

## 3. Các chức năng

### 3.1 Bản đồ điều phối (Map)

**Hiển thị** toàn bộ điểm trên bản đồ với màu sắc phân biệt theo loại:

| Loại điểm | Mô tả |
|---|---|
| Điểm tập kết hàng/người (TNV) | Nơi tập trung lực lượng và hàng hóa cứu trợ |
| Điểm tập trung nạn nhân | Nơi nạn nhân đang chờ cứu trợ |
| Điểm trung chuyển | Điểm chuyển tiếp hàng hóa/người |
| Điểm cần cứu trợ khẩn cấp | Ưu tiên cao nhất |
| Điểm cần cứu trợ | Ưu tiên bình thường |
| Điểm tắc/nghẽn/bị chia cắt | Cảnh báo giao thông |
| Điểm hỗ trợ ăn uống | Nơi cung cấp thức ăn |
| Điểm hỗ trợ dừng nghỉ | Nơi TNV nghỉ ngơi |

**Tương tác trên bản đồ:**
- Xem chi tiết điểm (tap/click vào marker)
- Thêm điểm mới trực tiếp trên bản đồ
- Lọc theo loại điểm (dropdown)
- Tìm kiếm địa chỉ

**Routing tránh điểm tắc:**
- Tính đường từ A → B tránh các điểm tắc đã đánh dấu
- Cập nhật lại đường đi khi có điểm tắc mới
- Điểm tắc tự hết hạn sau 2 giờ nếu không xác nhận lại

**Tech:** Leaflet.js + OpenStreetMap + OpenRouteService API

---

### 3.2 Quản lý Địa điểm

**Thêm/cập nhật điểm:**
- Tên, loại, tọa độ (tap map hoặc nhập địa chỉ)
- Mô tả tình hình thực địa
- Ảnh đính kèm (chụp tại chỗ)
- Mức độ khẩn cấp (1–5)

**Nhập từ nguồn đã kiểm chứng** (ưu tiên):
- Thủ công nhập từ MTTQ, Hội Chữ thập đỏ, UBND, Ban PCLB
- (Tương lai) Webhook/API kết nối tự động

**Vòng đời của điểm:**
```
Báo cáo → Chờ xác nhận → Đang hoạt động → Hoàn thành / Hết hạn
```

Cán bộ xác nhận hoặc xóa điểm. Điểm tắc tự hết hạn sau 2h.

---

### 3.3 Quản lý Nhu cầu

Mỗi điểm cứu trợ có bảng nhu cầu cụ thể:

**Nhân lực:**
- Số TNV cần
- Kỹ năng cần thiết (sơ cứu, nấu ăn, lái xuồng, v.v.)

**Vật chất:**
- Thực phẩm (gạo, mì, nước uống, v.v.)
- Thuốc & dụng cụ y tế
- Quần áo, chăn màn
- Dụng cụ vệ sinh

**Phương tiện & Thiết bị:**
- Phương tiện vận chuyển (xe tải, xe máy)
- Phương tiện cứu hộ (xuồng, drone)
- Dụng cụ khác

Trạng thái từng nhu cầu: **Chưa đáp ứng / Đang xử lý / Đã đủ**

---

### 3.4 Quản lý Nguồn lực

**Tình nguyện viên:**
- Danh sách TNV: tên, kỹ năng, phương tiện sẵn có, vị trí hiện tại
- Trạng thái: Sẵn sàng / Đang làm nhiệm vụ / Nghỉ
- Lịch sử nhiệm vụ

**Hàng hóa:**
- Kho hàng tại các điểm tập kết
- Theo dõi tồn kho theo chủng loại
- Ghi nhận xuất/nhập kho

**Phương tiện:**
- Danh sách xe, xuồng, drone
- Trạng thái: Sẵn sàng / Đang vận chuyển / Bảo trì
- Vị trí hiện tại

**Kết nối đối tác:**
- Nhà tài trợ / nhà hảo tâm (thông tin liên hệ, cam kết hỗ trợ)
- Nhà xe (số lượng xe, loại xe, khu vực)
- Điểm ăn uống & dừng nghỉ cho TNV

---

### 3.5 Điều phối & Phân công

**Cán bộ có thể:**
- Phân công TNV vào điểm cụ thể
- Điều phối hàng hóa từ điểm tập kết → điểm cần
- Gợi ý phân bổ dựa trên nhu cầu và nguồn lực hiện có
- Ghi nhận tiến độ từng nhiệm vụ

**Luồng phân công:**
```
Xác định nhu cầu → Tìm nguồn lực phù hợp → Phân công
→ TNV xác nhận → Thực hiện → Báo cáo hoàn thành
```

---

### 3.6 Thông báo & Realtime

- Bản đồ cập nhật tức thì khi có điểm mới hoặc thay đổi
- Push notification khi:
  - Được phân công nhiệm vụ
  - Có điểm khẩn cấp mới gần vị trí TNV
  - Điểm tắc mới xuất hiện trên lộ trình
- Kênh thông báo: Push notification (web) + Zalo OA

---

### 3.7 Thông tin & Hướng dẫn

Trang hướng dẫn tĩnh, phân theo vai trò:

**Cho nạn nhân:**
- Cách báo tin, liên hệ cứu trợ
- Kỹ năng sinh tồn trong lũ lụt
- Danh sách số điện thoại khẩn cấp

**Cho TNV:**
- Quy trình tham gia, đăng ký
- Hướng dẫn sơ cứu cơ bản
- An toàn khi hoạt động trong vùng lũ

**Cho cán bộ:**
- Hướng dẫn sử dụng hệ thống
- Quy trình xác nhận thông tin
- Liên hệ các đầu mối (MTTQ, Chữ thập đỏ, UBND)

---

### 3.8 Dashboard Tổng quan (Cán bộ)

- Số điểm đang hoạt động theo loại
- Số TNV đang làm nhiệm vụ vs. sẵn sàng
- Nhu cầu chưa được đáp ứng (highlight khẩn cấp)
- Hàng tồn kho các điểm tập kết
- Hoạt động gần đây (log)

---

## 4. Tech Stack

### Frontend
| | |
|---|---|
| Framework | Next.js 14 (App Router + PWA) |
| Bản đồ | Leaflet.js + OpenStreetMap |
| Routing | OpenRouteService API |
| Realtime | Socket.io client |
| UI | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Language | TypeScript |

### Backend
| | |
|---|---|
| Runtime | Node.js + Fastify |
| Realtime | Socket.io |
| ORM | Prisma |
| Auth | JWT (RS256) + OTP |
| Validation | Zod |

### Data & Infra
| | |
|---|---|
| Database | PostgreSQL + PostGIS |
| Cache / Queue | Redis |
| File storage | Cloudflare R2 |
| Deploy (test) | Railway |

---

## 5. Kiến trúc hệ thống

```
┌──────────────────────────────────────────┐
│               Clients                    │
│   Browser (Next.js PWA)  │  Mobile       │
└─────────────┬────────────────────────────┘
              │ HTTPS / WSS
┌─────────────▼────────────────────────────┐
│          API Gateway (Nginx)             │
│    Auth JWT · Rate limit · Routing       │
└──────────┬─────────────┬─────────────────┘
           │ REST        │ WebSocket
┌──────────▼──────┐ ┌────▼───────────────┐
│   Core API      │ │ Realtime Service   │
│   (Fastify)     │ │  (Socket.io)       │
└──────────┬──────┘ └────┬───────────────┘
           │              │ pub/sub
┌──────────▼──────────────▼───────────────┐
│             Data Layer                  │
│  PostgreSQL+PostGIS  │  Redis           │
│  Cloudflare R2 (files)                  │
└──────────┬──────────────────────────────┘
           │
┌──────────▼──────────────────────────────┐
│           External Services             │
│  OpenRouteService  │  OSM Tiles         │
│  Zalo OA API       │  SMS Gateway       │
└─────────────────────────────────────────┘
```

---

## 6. API Endpoints

```
# Auth
POST  /auth/request-otp
POST  /auth/verify-otp

# Locations
GET    /locations              # Lấy tất cả (filter: type, status, bbox)
POST   /locations              # Thêm điểm
PATCH  /locations/:id          # Cập nhật
DELETE /locations/:id          # Xóa (cán bộ)
POST   /locations/:id/confirm  # Xác nhận điểm còn hiệu lực

# Needs
GET    /locations/:id/needs
PUT    /locations/:id/needs    # Cập nhật nhu cầu

# Routing
POST   /route                  # { from, to } → tránh điểm tắc đang active

# Resources
GET    /volunteers
POST   /volunteers
PATCH  /volunteers/:id/status

GET    /inventory              # Hàng hóa tồn kho
POST   /inventory/transfer     # Chuyển hàng giữa điểm

GET    /vehicles
PATCH  /vehicles/:id/status

# Assignments
POST   /assignments            # Phân công TNV / phương tiện
PATCH  /assignments/:id        # Cập nhật trạng thái
GET    /assignments            # Danh sách (filter: volunteer, location)

# Partners
GET    /partners               # Nhà tài trợ, nhà xe
POST   /partners

# Upload
POST   /upload                 # Ảnh → R2, trả về URL

# Info (static content)
GET    /guides/:role           # victim | volunteer | coordinator
```

---

## 7. Data Models

```typescript
enum LocationType {
  STAGING_AREA,        // Tập kết hàng/TNV
  VICTIM_AREA,         // Tập trung nạn nhân
  TRANSIT_POINT,       // Trung chuyển
  URGENT_NEED,         // Cần cứu trợ khẩn cấp
  NEED_POINT,          // Cần cứu trợ
  BLOCKED_ROAD,        // Điểm tắc/nghẽn
  FOOD_SUPPORT,        // Hỗ trợ ăn uống
  REST_STOP,           // Dừng nghỉ
}

enum LocationStatus { PENDING | ACTIVE | DONE | EXPIRED }

Location {
  id, type, status
  lat, lng, name, description
  urgency     Int (1–5)
  imageUrls   String[]
  reportedBy  userId
  verifiedBy  userId?
  expiresAt   DateTime?       // BLOCKED_ROAD: +2h từ lần confirm cuối
  createdAt, updatedAt
}

Need {
  id, locationId
  category    MANPOWER | FOOD | MEDICINE | EQUIPMENT | VEHICLE | OTHER
  item        String          // "Gạo", "Áo phao", "TNV sơ cứu"
  quantity    Int
  unit        String
  status      UNMET | PARTIAL | MET
}

User {
  id, role (VICTIM | VOLUNTEER | COORDINATOR)
  name, phone
  skills      String[]
  vehicleType String?
}

Assignment {
  id
  volunteerId  uuid?
  vehicleId    uuid?
  locationId   uuid
  taskNote     String?
  status       PENDING | ACTIVE | DONE | CANCELLED
  assignedBy   userId
  assignedAt, completedAt
}

InventoryItem {
  id, locationId
  item, quantity, unit
  lastUpdatedBy userId
}

Vehicle {
  id, type (TRUCK | MOTORBIKE | BOAT | DRONE | OTHER)
  name, capacity, status (AVAILABLE | IN_USE | MAINTENANCE)
  currentLocationId uuid?
}

Partner {
  id, type (DONOR | TRANSPORT | FOOD | SPONSOR)
  name, phone, note
  commitment String?
}
```

---

## 8. Phân quyền

| Chức năng | Nạn nhân | TNV | Cán bộ |
|---|:---:|:---:|:---:|
| Xem bản đồ | ✓ | ✓ | ✓ |
| Xem hướng dẫn | ✓ | ✓ | ✓ |
| Báo điểm cần cứu trợ | ✓ | ✓ | ✓ |
| Đánh dấu điểm tắc | | ✓ | ✓ |
| Cập nhật nhu cầu điểm | | ✓ | ✓ |
| Xác nhận / xóa điểm | | | ✓ |
| Quản lý TNV, phương tiện | | | ✓ |
| Phân công nhiệm vụ | | | ✓ |
| Quản lý kho hàng | | ✓ | ✓ |
| Thêm đối tác / nhà xe | | | ✓ |
| Xem dashboard tổng | | | ✓ |

---

## 9. WebSocket Events

```
# Server → All clients
location:added      { location }
location:updated    { id, changes }
location:removed    { id }
location:blocked    { zone }       # Điểm tắc mới

# Server → TNV cụ thể
assignment:new      { assignment } # Được phân công
assignment:updated  { id, status }

# Client → Server
location:confirm    { id }         # Xác nhận điểm tắc còn hiệu lực
```

---

## 10. Cấu trúc Repo

```
rescue-coordination/
│
├── apps/
│   ├── web/                              # Next.js frontend
│   │   ├── app/
│   │   │   ├── (public)/
│   │   │   │   ├── map/                  # Bản đồ chính
│   │   │   │   └── guides/[role]/        # Hướng dẫn theo vai trò
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   └── dashboard/                # Cán bộ điều phối
│   │   │       ├── locations/
│   │   │       ├── volunteers/
│   │   │       ├── inventory/
│   │   │       ├── vehicles/
│   │   │       ├── partners/
│   │   │       └── assignments/
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── MapView.tsx
│   │   │   │   ├── LocationMarker.tsx
│   │   │   │   ├── BlockedZone.tsx
│   │   │   │   ├── RouteLayer.tsx
│   │   │   │   └── MapControls.tsx       # Filter dropdown, search
│   │   │   ├── locations/
│   │   │   │   ├── LocationCard.tsx
│   │   │   │   ├── AddLocationForm.tsx
│   │   │   │   └── NeedsEditor.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsOverview.tsx
│   │   │   │   ├── AssignmentPanel.tsx
│   │   │   │   └── InventoryTable.tsx
│   │   │   └── ui/                       # shadcn components
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   ├── useLocations.ts
│   │   │   ├── useRoute.ts
│   │   │   └── useAuth.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── socket.ts
│   │   │   └── map-utils.ts
│   │   └── stores/
│   │       ├── mapStore.ts
│   │       ├── authStore.ts
│   │       └── notificationStore.ts
│   │
│   └── api/                              # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── locations.ts
│       │   │   ├── needs.ts
│       │   │   ├── route.ts
│       │   │   ├── volunteers.ts
│       │   │   ├── inventory.ts
│       │   │   ├── vehicles.ts
│       │   │   ├── assignments.ts
│       │   │   ├── partners.ts
│       │   │   └── upload.ts
│       │   ├── services/
│       │   │   ├── locationService.ts
│       │   │   ├── routingService.ts
│       │   │   ├── notificationService.ts
│       │   │   ├── socketService.ts
│       │   │   ├── storageService.ts
│       │   │   └── authService.ts
│       │   ├── plugins/
│       │   │   ├── prisma.ts
│       │   │   ├── redis.ts
│       │   │   └── socket.ts
│       │   └── index.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   └── types/                            # Shared TypeScript types
│       └── index.ts
│
├── docker-compose.yml                    # PostgreSQL + Redis local
├── .env.example
├── package.json                          # pnpm workspace
└── README.md
```

---

## 11. Environment Variables

```bash
# API
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
ORS_API_KEY=...               # OpenRouteService

# Notifications
ZALO_OA_TOKEN=...
SMS_GATEWAY_KEY=...

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_OSM_TILE=https://tile.openstreetmap.org/{z}/{x}/{y}.png

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=rescue-uploads
```

---

## 12. Lộ trình MVP (6 tuần)

| Tuần | Mục tiêu |
|---|---|
| 1 | Setup repo, DB schema, Auth OTP, bản đồ hiển thị marker theo loại |
| 2 | CRUD locations + nhu cầu, WebSocket realtime, lọc theo loại điểm |
| 3 | Routing tránh điểm tắc, upload ảnh, phân quyền 3 role |
| 4 | Quản lý TNV, phương tiện, phân công nhiệm vụ |
| 5 | Quản lý kho hàng, đối tác, trang hướng dẫn theo role |
| 6 | Dashboard tổng quan, thông báo Zalo/push, deploy Railway |

---

## 13. Quyết định kỹ thuật đã chốt

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Bản đồ | Leaflet + OSM | Miễn phí, offline-capable |
| Routing | OpenRouteService | Hỗ trợ avoid_polygons, free tier |
| Auth | OTP qua Zalo/SMS | Người dùng nông thôn không có email |
| Monorepo | pnpm workspace | Team nhỏ, chia types dễ hơn |
| Database | PostgreSQL + PostGIS | Bắt buộc cho truy vấn địa lý |
| Điểm tắc | Auto-expire 2h | Tránh dữ liệu cũ gây lệch đường |
| REST vs GraphQL | REST | Đơn giản, đủ dùng cho MVP |
| Notification | Zalo OA ưu tiên | Hầu hết TNV đã dùng Zalo |
