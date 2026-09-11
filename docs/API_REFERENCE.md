# API Reference

**Base URL local:** `http://localhost:3001`  
**Cập nhật:** 2026-06-04

API dùng JSON cho hầu hết request/response. Các endpoint bảo vệ cần header:

```http
Authorization: Bearer <token>
```

## 1. Health

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra API đang chạy. |

## 2. Auth

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | `/auth/admin/login` | Public | Đăng nhập admin. |
| GET | `/auth/admin/me` | Admin | Lấy thông tin admin hiện tại. |
| GET | `/auth/admin/users` | `ADMIN` | Danh sách tài khoản admin. |
| POST | `/auth/admin/users` | `ADMIN` | Tạo tài khoản admin. |
| PATCH | `/auth/admin/users/:id` | `ADMIN` | Cập nhật tài khoản admin. |
| DELETE | `/auth/admin/users/:id` | `ADMIN` | Xóa tài khoản admin. |
| POST | `/auth/volunteer/register` | Public | Đăng ký tình nguyện viên. |
| POST | `/auth/volunteer/login` | Public | Đăng nhập tình nguyện viên. |
| POST | `/auth/volunteer/forgot-password` | Public | Yêu cầu reset mật khẩu. |
| POST | `/auth/volunteer/reset-password` | Public | Đặt lại mật khẩu. |
| GET | `/auth/volunteer/me` | Volunteer | Lấy thông tin tài khoản. |
| PATCH | `/auth/volunteer/me` | Volunteer | Cập nhật thông tin tài khoản. |
| POST | `/auth/request-otp` | Public | Placeholder OTP. |
| POST | `/auth/verify-otp` | Public | Placeholder OTP. |

## 3. Public và dashboard

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/dashboard/stats` | Số liệu dashboard. |
| GET | `/locations` | Danh sách địa điểm, hỗ trợ filter query. |
| GET | `/locations/:id` | Chi tiết địa điểm. |
| POST | `/locations` | Tạo địa điểm. |
| PATCH | `/locations/:id` | Cập nhật địa điểm. |
| DELETE | `/locations/:id` | Xóa địa điểm. |
| POST | `/locations/:id/images` | Upload/cập nhật ảnh cho địa điểm. |
| POST | `/locations/:id/confirm` | Xác nhận/cập nhật điểm. |
| PATCH | `/locations/updates/:updateId` | Cập nhật bản tin địa điểm. |
| DELETE | `/locations/updates/:updateId` | Xóa bản tin địa điểm. |
| GET | `/locations/:id/needs` | Danh sách nhu cầu của địa điểm. |
| POST | `/locations/:id/needs` | Tạo nhu cầu cho địa điểm. |
| PATCH | `/needs/:id` | Cập nhật nhu cầu. |
| DELETE | `/needs/:id` | Xóa nhu cầu. |
| GET | `/rescue-requests` | Danh sách yêu cầu cứu trợ công khai. |
| GET | `/rescue-requests/:code` | Chi tiết yêu cầu theo mã. |
| POST | `/rescue-requests` | Gửi yêu cầu cứu trợ. |
| GET | `/donors` | Danh sách nhà tài trợ. |
| GET | `/item-categories` | Danh mục hàng hóa. |
| POST | `/sponsorships` | Gửi tài trợ hiện vật. |
| POST | `/fund/donations` | Ghi nhận quyên góp. |
| GET | `/fund/transactions/:id` | Tra cứu giao dịch. |
| POST | `/webhooks/sepay` | Webhook SePay phía API. |
| POST | `/upload` | Upload file. |
| POST | `/route` | Tính tuyến đường qua Valhalla. |
| GET | `/geocode` | Tìm địa chỉ. |
| GET | `/geocode/resolve` | Resolve địa chỉ/place id ra tọa độ. |

## 4. Volunteer portal

Các endpoint này cần token tình nguyện viên.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/volunteer/rescue-requests` | Danh sách yêu cầu có thể tham gia. |
| GET | `/volunteer/rescue-requests/:code` | Chi tiết yêu cầu. |
| POST | `/volunteer/rescue-requests/:code/register` | Đăng ký tham gia yêu cầu. |
| PATCH | `/volunteer/missions/:id/complete` | Đánh dấu hoàn thành mission được giao. |
| GET | `/volunteer/my-requests` | Danh sách yêu cầu đã đăng ký/tham gia. |
| GET | `/volunteer/profile` | Hồ sơ tình nguyện viên. |
| PATCH | `/volunteer/profile` | Cập nhật hồ sơ tình nguyện viên. |

## 5. Admin rescue

Các endpoint này cần admin có quyền phù hợp. `ADMIN` có quyền đi qua mọi role guard.

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/admin/rescue-requests` | `ADMIN_YCCT` | Danh sách yêu cầu cứu trợ. |
| GET | `/admin/rescue-requests/:id` | `ADMIN_YCCT` | Chi tiết yêu cầu. |
| POST | `/admin/rescue-requests` | `ADMIN_YCCT` | Tạo yêu cầu. |
| PATCH | `/admin/rescue-requests/:id` | `ADMIN_YCCT` | Cập nhật yêu cầu. |
| DELETE | `/admin/rescue-requests/:id` | `ADMIN_YCCT` | Xóa yêu cầu. |
| POST | `/admin/rescue-requests/:id/missions` | `ADMIN_YCCT` | Tạo mission từ yêu cầu. |
| PATCH | `/admin/missions/:id` | `ADMIN_YCCT` | Cập nhật mission. |
| DELETE | `/admin/missions/:id` | `ADMIN_YCCT` | Xóa mission. |
| POST | `/admin/rescue-teams` | `ADMIN_TNV` | Tạo/cập nhật đội cứu trợ. |
| DELETE | `/admin/rescue-teams/:id` | `ADMIN_TNV` | Xóa đội cứu trợ. |
| PATCH | `/admin/rescue-teams/:teamId/members/:userId` | `ADMIN_TNV` | Cập nhật vai trò thành viên đội. |
| GET | `/admin/roles` | Admin | Danh sách role admin. |
| POST | `/admin/volunteer-accounts` | `ADMIN` | Tạo tài khoản tình nguyện viên. |
| PATCH | `/admin/volunteer-accounts/:id` | `ADMIN` | Cập nhật tài khoản tình nguyện viên. |

## 6. Admin kho, quỹ, email

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/admin/sponsorships` | `ADMIN_KHO` | Danh sách tài trợ hiện vật. |
| PATCH | `/admin/sponsorships/:donorId/:itemCategoryId` | `ADMIN_KHO` | Cập nhật trạng thái tài trợ. |
| GET | `/admin/inventory/mission-assignments` | `ADMIN_KHO` | Danh sách phân bổ hàng cho mission. |
| PATCH | `/admin/missions/:id/item-assignments` | `ADMIN_KHO` | Gán hàng cho mission. |
| GET | `/admin/fund` | `ADMIN_KHO` | Tổng quan quỹ. |
| POST | `/admin/fund/transactions` | `ADMIN_KHO` | Tạo giao dịch quỹ. |
| PATCH | `/admin/fund/transactions/:id` | `ADMIN_KHO` | Cập nhật giao dịch quỹ. |
| DELETE | `/admin/fund/transactions/:id` | `ADMIN_KHO` | Xóa giao dịch quỹ. |
| GET | `/admin/email/context` | Admin | Lấy ngữ cảnh email. |
| POST | `/admin/email/send` | Admin | Gửi email tùy chỉnh. |
| POST | `/admin/email/send-mission-report` | Admin | Gửi báo cáo mission. |

## 7. CRUD phụ trợ

| Nhóm | Endpoint |
|---|---|
| Volunteers | `GET/POST /volunteers`, `GET/PATCH/DELETE /volunteers/:id` |
| Volunteer teams | `GET/POST /volunteer-teams`, `PATCH/DELETE /volunteer-teams/:id` |
| Inventory | `GET/POST /inventory`, `GET/PATCH/DELETE /inventory/:id` |

## 8. Notifications

Các endpoint cần token admin hoặc volunteer.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/notifications` | Danh sách thông báo. |
| GET | `/notifications/unread-count` | Số thông báo chưa đọc. |
| PATCH | `/notifications/:id/read` | Đánh dấu đã đọc. |
| PATCH | `/notifications/read-all` | Đánh dấu tất cả đã đọc. |

## 9. Response lỗi

API thường trả lỗi dạng:

```json
{
  "message": "Unauthorized"
}
```

Hoặc lỗi validation:

```json
{
  "message": "Validation failed",
  "errors": {
    "fieldErrors": {
      "email": ["Invalid email"]
    }
  }
}
```
