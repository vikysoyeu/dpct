# Xác thực và phân quyền

**Cập nhật:** 2026-06-04

## 1. Tổng quan

Hệ thống dùng JWT cho admin và tình nguyện viên.

- Backend: `@fastify/jwt`, token hết hạn sau 24 giờ.
- Frontend: token lưu trong `localStorage`.
- Admin: dùng `admin_token`.
- Tình nguyện viên: dùng `volunteer_token`.

Token được gửi qua header:

```http
Authorization: Bearer <token>
```

## 2. Tài khoản seed

Sau khi chạy `pnpm --filter @rescue/api db:seed`:

```text
username: admin
password: admin123
```

Khi triển khai thật, cần đổi mật khẩu và đặt `JWT_SECRET` mạnh.

## 3. Auth admin

### Đăng nhập

```http
POST /auth/admin/login
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response thành công gồm `token` và thông tin `admin`.

### Lấy phiên hiện tại

```http
GET /auth/admin/me
Authorization: Bearer <token>
```

### Quản lý tài khoản admin

Các endpoint sau chỉ dành cho `ADMIN`:

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/auth/admin/users` | Danh sách admin. |
| POST | `/auth/admin/users` | Tạo admin. |
| PATCH | `/auth/admin/users/:id` | Cập nhật admin. |
| DELETE | `/auth/admin/users/:id` | Xóa admin. |

Không được xóa chính mình và không được xóa admin cuối cùng.

## 4. Auth tình nguyện viên

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/volunteer/register` | Đăng ký tài khoản. |
| POST | `/auth/volunteer/login` | Đăng nhập. |
| GET | `/auth/volunteer/me` | Lấy thông tin tài khoản. |
| PATCH | `/auth/volunteer/me` | Cập nhật thông tin tài khoản. |
| POST | `/auth/volunteer/forgot-password` | Yêu cầu reset mật khẩu. |
| POST | `/auth/volunteer/reset-password` | Đặt lại mật khẩu. |

## 5. Vai trò admin

| Role | Phạm vi |
|---|---|
| `ADMIN` | Toàn quyền. |
| `ADMIN_TNV` | Quản lý tình nguyện viên, đội cứu trợ, nguồn lực. |
| `ADMIN_YCCT` | Quản lý yêu cầu cứu trợ và nhiệm vụ. |
| `ADMIN_KHO` | Quản lý kho, tài trợ, quỹ. |

Backend guard:

- `requireAdmin`: cần token admin.
- `requireAdminRole([...])`: cần token admin có role phù hợp; `ADMIN` luôn được phép.
- `requireVolunteer`: cần token tình nguyện viên.

## 6. File liên quan

| File | Mô tả |
|---|---|
| `apps/api/src/plugins/jwt.ts` | JWT plugin và guard. |
| `apps/api/src/routes/auth.ts` | Endpoint auth. |
| `apps/api/prisma/schema.prisma` | Model user/admin/volunteer. |
| `apps/web/stores/authStore.ts` | Store auth admin. |
| `apps/web/components/layout/admin-auth-guard.tsx` | Guard trang admin. |
| `apps/web/components/layout/volunteer-auth-guard.tsx` | Guard trang tình nguyện viên. |

## 7. Lưu ý bảo mật

- Không dùng `JWT_SECRET=change_me` khi deploy.
- Không commit `.env`.
- Đổi mật khẩu admin seed khi đưa hệ thống ra môi trường thật.
- Nếu nghi token bị lộ, đổi `JWT_SECRET` và yêu cầu đăng nhập lại.
