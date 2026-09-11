<div align="center">

# DPCT - Hệ thống điều phối cứu trợ

Hệ thống hỗ trợ tiếp nhận yêu cầu, quản lý nguồn lực và điều phối cứu trợ trên bản đồ.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?logo=postgresql&logoColor=white)

</div>

## Tổng quan

DPCT là hệ thống điều phối cứu trợ hỗ trợ theo dõi tình hình tại các điểm cần hỗ trợ, tiếp nhận yêu cầu cứu trợ, quản lý nhu cầu hàng hóa, nguồn lực tình nguyện viên, kho hàng và đóng góp. Hệ thống tập trung gom dữ liệu vận hành vào một nơi để đội điều phối có thể quan sát, phân loại, ưu tiên và phân công nhanh hơn.

Hệ thống gồm 2 phần chính:

| Thành phần | Mô tả |
|---|---|
| Web app | Giao diện người dùng, tình nguyện viên và quản trị. |
| API server | Xử lý dữ liệu, xác thực, điều phối, thông báo, upload và realtime. |

## Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Bản đồ điều phối | Hiển thị điểm cần hỗ trợ, thông tin địa điểm và hỗ trợ định tuyến. |
| Yêu cầu cứu trợ | Tạo, theo dõi và xử lý yêu cầu cứu trợ. |
| Nhu cầu & kho hàng | Quản lý nhu cầu hàng hóa, tồn kho và phân bổ nguồn lực. |
| Tình nguyện viên | Quản lý hồ sơ, đội nhóm, nhiệm vụ và trạng thái tham gia. |
| Quỹ & tài trợ | Theo dõi đóng góp, nhà tài trợ và giao dịch quỹ. |
| Quản trị | Dashboard, quản lý hệ thống, email và dữ liệu vận hành. |

## Giao diện

### Đăng nhập

<p align="center">
  <img src="media/login.png" alt="Đăng nhập" width="900">
</p>

### Người dùng

| Bản đồ điều phối | Danh sách yêu cầu cứu trợ |
|---|---|
| <img src="media/1.map.png" alt="Bản đồ điều phối" width="420"> | <img src="media/2.rescue-requests.png" alt="Danh sách yêu cầu cứu trợ" width="420"> |

| Tạo yêu cầu cứu trợ | Tài trợ |
|---|---|
| <img src="media/3.rescue-request.png" alt="Tạo yêu cầu cứu trợ" width="420"> | <img src="media/4.sponsorship.png" alt="Tài trợ" width="420"> |

| Quyên góp | Hướng dẫn |
|---|---|
| <img src="media/5.donate.png" alt="Quyên góp" width="420"> | <img src="media/6.guides.png" alt="Hướng dẫn" width="420"> |

### Tình nguyện viên

| Danh sách nhiệm vụ | Nhiệm vụ của tôi |
|---|---|
| <img src="media/7.vol-requests.png" alt="Danh sách nhiệm vụ tình nguyện viên" width="420"> | <img src="media/8.vol-my-requests.png" alt="Nhiệm vụ của tôi" width="420"> |

| Chi tiết nhiệm vụ | Sổ tay tình nguyện viên |
|---|---|
| <img src="media/9.vol-requests-detail.png" alt="Chi tiết nhiệm vụ tình nguyện viên" width="420"> | <img src="media/10.vol-handbook.png" alt="Sổ tay tình nguyện viên" width="420"> |

| Hồ sơ tình nguyện viên |
|---|
| <img src="media/11.vol-profile.png" alt="Hồ sơ tình nguyện viên" width="420"> |

### Quản trị

| Dashboard | Địa điểm |
|---|---|
| <img src="media/12.admin.png" alt="Dashboard quản trị" width="420"> | <img src="media/13.admin-locations.png" alt="Quản lý địa điểm" width="420"> |

| Nhu cầu | Nguồn lực |
|---|---|
| <img src="media/14.admin-needs.png" alt="Quản lý nhu cầu" width="420"> | <img src="media/15.admin-resources.png" alt="Quản lý nguồn lực" width="420"> |

| Kho hàng | Quỹ |
|---|---|
| <img src="media/16.admin-inventory.png" alt="Quản lý kho" width="420"> | <img src="media/17.admin-fund.png" alt="Quản lý quỹ" width="420"> |

| Hệ thống |
|---|
| <img src="media/18.admin-system.png" alt="Cấu hình hệ thống" width="420"> |

## Cấu trúc thư mục

```text
.
├── apps/
│   ├── api/                 # Backend Fastify, Prisma, routes, services
│   └── web/                 # Frontend Next.js
├── packages/
│   └── types/               # TypeScript types dùng chung
├── docs/                    # Tài liệu hệ thống, cài đặt, triển khai
├── media/                   # Ảnh giao diện dùng trong README
├── UI/                      # Mẫu/thiết kế giao diện tham khảo
├── valhalla-data/           # Dữ liệu routing cho Valhalla
├── docker-compose.yml       # PostgreSQL, Redis, Valhalla
├── pnpm-workspace.yaml      # Cấu hình monorepo
└── README.md
```

## Công nghệ sử dụng

| Nhóm | Công nghệ |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand |
| Bản đồ | Leaflet, React Leaflet, OpenStreetMap tiles |
| Backend | Fastify, Prisma ORM, Socket.IO, Zod |
| Database | PostgreSQL/PostGIS |
| Cache | Redis |
| Routing | Valhalla |
| Package manager | pnpm workspace |
| DevOps | Docker Compose |

## Yêu cầu cài đặt

- Node.js 18 trở lên.
- pnpm 9 trở lên.
- Docker và Docker Compose.

## Cài đặt

Clone repository và cài dependencies:

```bash
git clone <repo-url>
cd DPCT
pnpm install
```

Tạo file môi trường:

```bash
cp .env.example .env
```

Khởi động các service nền:

```bash
docker compose up -d
```

Đồng bộ database và tạo dữ liệu mẫu:

```bash
pnpm --filter @rescue/api db:push
pnpm --filter @rescue/api db:generate
pnpm --filter @rescue/api db:seed
```

## Chạy ứng dụng

Chạy API server:

```bash
pnpm dev:api
```

API mặc định chạy tại `http://localhost:3001`.

Chạy web app trong terminal khác:

```bash
pnpm dev:web
```

Web app mặc định chạy tại `http://localhost:3000`.

Kiểm tra API:

```bash
curl http://localhost:3001/health
```

## Tài khoản mẫu

Sau khi chạy seed, có thể đăng nhập khu vực quản trị bằng tài khoản:

```text
username: admin
password: admin123
```

Dữ liệu seed cũng tạo thêm địa điểm, nhu cầu, tình nguyện viên, yêu cầu cứu trợ, kho hàng và giao dịch mẫu để phục vụ demo.

## Một số đường dẫn

| Màn hình | URL |
|---|---|
| Trang chủ | `http://localhost:3000` |
| Đăng nhập | `http://localhost:3000/login` |
| Đăng ký tình nguyện viên | `http://localhost:3000/register` |
| Bản đồ | `http://localhost:3000/map` |
| Yêu cầu cứu trợ | `http://localhost:3000/rescue-request` |
| Quản trị | `http://localhost:3000/admin` |
| Công việc tình nguyện viên | `http://localhost:3000/volunteer` |

## Lệnh hữu ích

| Lệnh | Mục đích |
|---|---|
| `pnpm dev:web` | Chạy frontend |
| `pnpm dev:api` | Chạy backend |
| `pnpm build` | Build tất cả package/app |
| `pnpm lint` | Kiểm tra lint |
| `pnpm typecheck` | Kiểm tra TypeScript |
| `pnpm --filter @rescue/api db:studio` | Mở Prisma Studio |
| `pnpm --filter @rescue/api db:reset` | Reset database và seed lại |

## Cấu hình môi trường

File `.env` nằm ở thư mục gốc. Có thể bắt đầu từ `.env.example`.

| Biến | Mô tả |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL |
| `REDIS_URL` | Connection string Redis |
| `JWT_SECRET` | Khóa ký JWT |
| `CORS_ORIGIN` | Origin frontend được phép gọi API |
| `VALHALLA_URL` | URL Valhalla routing service |
| `NEXT_PUBLIC_API_URL` | URL/proxy API cho frontend |
| `NEXT_PUBLIC_WS_URL` | URL websocket cho frontend |
| `NEXT_PUBLIC_OSM_TILE` | Tile URL cho bản đồ |

## Tài liệu tham khảo

- [Mục lục tài liệu](docs/README.md)
- [Hướng dẫn cài đặt](docs/SETUP_GUIDE.md)
- [Tài liệu hệ thống](docs/SYSTEM_DOCUMENTATION.md)
- [API reference](docs/API_REFERENCE.md)
- [Xác thực và phân quyền](docs/ADMIN_AUTH.md)
- [Hướng dẫn sử dụng nhanh](docs/USER_GUIDE.md)
- [Tài liệu triển khai](docs/DEPLOYMENT.md)
- [Trạng thái dự án](docs/PROGRESS.md)
- [Đặc tả hệ thống](spec-he-thong-dieu-phoi-cuu-tro.md)

## Ghi chú

- `docker-compose.yml` chạy PostgreSQL/PostGIS, Redis và Valhalla.
- Nếu thay đổi Prisma schema, cần chạy lại `db:generate`.
- Nếu database lỗi hoặc dữ liệu mẫu cũ, có thể chạy `pnpm --filter @rescue/api db:reset`.
- Các khóa API/email/storage trong `.env.example` là placeholder, cần thay bằng giá trị thật khi triển khai.
