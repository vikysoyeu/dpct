# Hướng dẫn sử dụng nhanh

**Cập nhật:** 2026-06-04

Tài liệu này dùng cho demo và giới thiệu luồng thao tác chính.

## 1. Người dân

### Xem bản đồ

1. Mở `http://localhost:3000/map`.
2. Xem các điểm cần hỗ trợ, điểm tập kết, điểm tắc đường.
3. Chọn marker để xem thông tin chi tiết.

### Gửi yêu cầu cứu trợ

1. Mở `http://localhost:3000/rescue-request`.
2. Nhập thông tin người cần hỗ trợ, địa chỉ, mô tả tình huống.
3. Chọn nhóm hàng hóa/nhu cầu cần hỗ trợ.
4. Gửi form.
5. Lưu mã yêu cầu để tra cứu trạng thái.

### Gửi tài trợ/quyên góp

- Tài trợ hiện vật: mở `http://localhost:3000/sponsorship`.
- Quyên góp: mở `http://localhost:3000/donate`.

## 2. Tình nguyện viên

### Đăng ký và đăng nhập

1. Mở `http://localhost:3000/register`.
2. Nhập thông tin cá nhân, kỹ năng, phương tiện, thời gian sẵn sàng.
3. Đăng nhập tại `http://localhost:3000/login`.
4. Vào cổng tình nguyện viên tại `http://localhost:3000/volunteer`.

### Nhận nhiệm vụ

1. Mở `/volunteer/requests`.
2. Xem danh sách yêu cầu đang cần tình nguyện viên.
3. Mở chi tiết yêu cầu.
4. Chọn đăng ký tham gia.
5. Theo dõi các yêu cầu đã đăng ký ở `/volunteer/my-requests`.

### Cập nhật hồ sơ

1. Mở `/volunteer/profile`.
2. Cập nhật kỹ năng, phương tiện, địa chỉ, liên hệ khẩn cấp.
3. Lưu thông tin.

## 3. Admin

### Đăng nhập

Mở `http://localhost:3000/login`.

Tài khoản seed:

```text
username: admin
password: admin123
```

Sau khi đăng nhập, mở `http://localhost:3000/admin`.

### Quản lý yêu cầu cứu trợ

1. Mở `/admin/rescue-requests`.
2. Xem yêu cầu mới.
3. Cập nhật trạng thái, thông tin liên hệ, mức ưu tiên.
4. Tạo mission nếu yêu cầu cần điều phối đội/hàng.

### Quản lý địa điểm

1. Mở `/admin/locations`.
2. Tạo hoặc cập nhật điểm cần hỗ trợ, điểm tắc đường, điểm tập kết.
3. Cập nhật trạng thái và thông tin bản đồ.

### Quản lý nguồn lực

1. Mở `/admin/resources`.
2. Quản lý tình nguyện viên, đội nhóm và tài khoản liên quan.
3. Phân loại theo trạng thái/khu vực/kỹ năng.

### Quản lý kho và quỹ

- Kho hàng: `/admin/inventory`.
- Quỹ: `/admin/fund`.
- Tài trợ hiện vật: phần sponsorship trong khu vực kho/quỹ.

## 4. Gợi ý kịch bản demo

1. Mở bản đồ để giới thiệu tình hình.
2. Gửi một yêu cầu cứu trợ mới.
3. Đăng nhập admin, duyệt yêu cầu và tạo mission.
4. Đăng nhập tình nguyện viên, đăng ký tham gia yêu cầu.
5. Quay lại admin để xem nguồn lực/kho/quỹ.
6. Cho xem notification hoặc trạng thái mission nếu có dữ liệu phù hợp.
