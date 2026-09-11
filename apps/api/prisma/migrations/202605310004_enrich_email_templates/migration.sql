ALTER TABLE "RescueRequest"
  ADD COLUMN IF NOT EXISTS "requesterTitle" TEXT;

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Đã tiếp nhận yêu cầu cứu trợ {{requestCode}}',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#0f766e;color:#fff;padding:22px 28px">
      <h1 style="margin:0;font-size:22px">Đã tiếp nhận yêu cầu cứu trợ</h1>
      <p style="margin:8px 0 0;font-size:14px">Mã yêu cầu: <b>{{requestCode}}</b></p>
    </div>
    <div style="padding:26px 28px">
      <p>Kính gửi {{recipientName}},</p>
      <p>Hệ thống đã ghi nhận yêu cầu cứu trợ. Đội điều phối sẽ kiểm tra thông tin và xử lý trong thời gian sớm nhất.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Người gửi:</b> {{requesterName}}</p>
        <p style="margin:0 0 8px"><b>Chức vụ/đơn vị:</b> {{requesterTitle}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{requesterPhone}}</p>
        <p style="margin:0"><b>Email:</b> {{requesterEmail}}</p>
      </div>
      <div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Loại nhu cầu:</b> {{needType}}</p>
        <p style="margin:0 0 8px"><b>Nội dung:</b> {{content}}</p>
        <p style="margin:0 0 8px"><b>Địa chỉ:</b> {{address}}</p>
        <p style="margin:0 0 8px"><b>Tọa độ:</b> {{coordinates}}</p>
        <p style="margin:0"><b>Mức ưu tiên:</b> {{priority}}</p>
      </div>
      <p>Vui lòng giữ điện thoại liên lạc hoạt động để cán bộ phụ trách có thể xác minh khi cần.</p>
      <p style="margin-top:24px;color:#64748b;font-size:13px">Email này được gửi tự động từ hệ thống Điều phối cứu trợ.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Đã tiếp nhận yêu cầu cứu trợ {{requestCode}}. Người gửi: {{requesterName}} - {{requesterTitle}}. SĐT: {{requesterPhone}}. Email: {{requesterEmail}}. Loại nhu cầu: {{needType}}. Nội dung: {{content}}. Địa chỉ: {{address}}. Tọa độ: {{coordinates}}. Mức ưu tiên: {{priority}}.',
  "variables" = ARRAY['requestCode','recipientName','requesterName','requesterTitle','requesterPhone','requesterEmail','needType','content','address','coordinates','priority'],
  "updatedAt" = NOW()
WHERE "slug" = 'rescue-request-submitted';

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Yêu cầu cứu trợ {{requestCode}} đang được xử lý',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#2563eb;color:#fff;padding:22px 28px">
      <h1 style="margin:0;font-size:22px">Yêu cầu đang được xử lý</h1>
      <p style="margin:8px 0 0;font-size:14px">Mã yêu cầu: <b>{{requestCode}}</b></p>
    </div>
    <div style="padding:26px 28px">
      <p>Kính gửi {{recipientName}},</p>
      <p>Yêu cầu cứu trợ đã được duyệt và chuyển sang trạng thái xử lý. Bộ phận điều phối sẽ liên hệ hoặc triển khai lực lượng phù hợp theo tình hình thực tế.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Người gửi:</b> {{requesterName}}</p>
        <p style="margin:0 0 8px"><b>Chức vụ/đơn vị:</b> {{requesterTitle}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{requesterPhone}}</p>
        <p style="margin:0"><b>Email:</b> {{requesterEmail}}</p>
      </div>
      <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Nội dung:</b> {{content}}</p>
        <p style="margin:0 0 8px"><b>Địa chỉ:</b> {{address}}</p>
        <p style="margin:0"><b>Mức ưu tiên:</b> {{priority}}</p>
      </div>
      <p>Cảm ơn bạn đã cung cấp thông tin kịp thời.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Yêu cầu cứu trợ {{requestCode}} đang được xử lý. Người gửi: {{requesterName}} - {{requesterTitle}}. SĐT: {{requesterPhone}}. Email: {{requesterEmail}}. Nội dung: {{content}}. Địa chỉ: {{address}}. Mức ưu tiên: {{priority}}.',
  "variables" = ARRAY['requestCode','recipientName','requesterName','requesterTitle','requesterPhone','requesterEmail','content','address','priority'],
  "updatedAt" = NOW()
WHERE "slug" = 'rescue-request-approved';

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Đã nhận thông tin tài trợ hàng hóa',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#7c3aed;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Cảm ơn thông tin tài trợ</h1></div>
    <div style="padding:26px 28px">
      <p>Kính gửi {{recipientName}},</p>
      <p>Hệ thống đã ghi nhận đề nghị tài trợ hàng hóa. Bộ phận kho vận sẽ kiểm tra và liên hệ để xác nhận phương án tiếp nhận.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Nhà tài trợ:</b> {{donorName}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{donorPhone}}</p>
        <p style="margin:0 0 8px"><b>Email:</b> {{donorEmail}}</p>
        <p style="margin:0 0 8px"><b>Địa chỉ:</b> {{donorAddress}}</p>
        <p style="margin:0"><b>Loại nhà tài trợ:</b> {{donorType}}</p>
      </div>
      <div style="background:#f5f3ff;border-left:4px solid #8b5cf6;padding:14px 16px;margin:18px 0">
        <p style="margin:0;white-space:pre-line"><b>Danh sách hàng hóa:</b><br>{{goodsSummary}}</p>
        <p style="margin:10px 0 0"><b>Gắn với yêu cầu:</b> {{requestLabel}}</p>
      </div>
      <p>Xin vui lòng giữ liên lạc qua số điện thoại/email đã cung cấp.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Đã nhận thông tin tài trợ hàng hóa. Nhà tài trợ: {{donorName}}. SĐT: {{donorPhone}}. Email: {{donorEmail}}. Địa chỉ: {{donorAddress}}. Loại: {{donorType}}. Danh sách: {{goodsSummary}}. Gắn với yêu cầu: {{requestLabel}}.',
  "variables" = ARRAY['recipientName','donorName','donorPhone','donorEmail','donorAddress','donorType','goodsSummary','requestLabel'],
  "updatedAt" = NOW()
WHERE "slug" = 'sponsorship-submitted';

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Tài trợ hàng hóa đã được xác nhận',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#16a34a;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Tài trợ đã được xác nhận</h1></div>
    <div style="padding:26px 28px">
      <p>Kính gửi {{recipientName}},</p>
      <p>Kho vận đã xác nhận phần tài trợ của bạn và cập nhật vào hệ thống điều phối.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Nhà tài trợ:</b> {{donorName}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{donorPhone}}</p>
        <p style="margin:0"><b>Email:</b> {{donorEmail}}</p>
      </div>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Hàng hóa:</b> {{itemName}}</p>
        <p style="margin:0"><b>Số lượng:</b> {{quantity}} {{unit}}</p>
      </div>
      <p>Trân trọng cảm ơn sự đồng hành của bạn.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Tài trợ đã được xác nhận. Nhà tài trợ: {{donorName}}. SĐT: {{donorPhone}}. Email: {{donorEmail}}. Hàng hóa: {{itemName}} - {{quantity}} {{unit}}.',
  "variables" = ARRAY['recipientName','donorName','donorPhone','donorEmail','itemName','quantity','unit'],
  "updatedAt" = NOW()
WHERE "slug" = 'sponsorship-approved';

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Đã nhận đăng ký tham gia {{requestName}}',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#ea580c;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Đã nhận đăng ký tham gia</h1></div>
    <div style="padding:26px 28px">
      <p>Chào {{recipientName}},</p>
      <p>Hệ thống đã ghi nhận đăng ký tham gia yêu cầu cứu trợ <b>{{requestName}}</b>. Điều phối viên sẽ rà soát năng lực, vị trí và nhu cầu thực tế trước khi phân công.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Tình nguyện viên:</b> {{volunteerName}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{volunteerPhone}}</p>
        <p style="margin:0 0 8px"><b>Email:</b> {{volunteerEmail}}</p>
        <p style="margin:0 0 8px"><b>Khu vực:</b> {{area}}</p>
        <p style="margin:0 0 8px"><b>Kỹ năng:</b> {{skills}}</p>
        <p style="margin:0"><b>Phương tiện:</b> {{vehicleType}}</p>
      </div>
      <div style="background:#fff7ed;border-left:4px solid #f97316;padding:14px 16px;margin:18px 0">
        <p style="margin:0"><b>Ghi chú đăng ký:</b> {{note}}</p>
      </div>
      <p>Bạn sẽ nhận thông báo khi được phân vào đội hoặc khi trạng thái đăng ký thay đổi.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Đã nhận đăng ký tham gia {{requestName}}. TNV: {{volunteerName}}. SĐT: {{volunteerPhone}}. Email: {{volunteerEmail}}. Khu vực: {{area}}. Kỹ năng: {{skills}}. Phương tiện: {{vehicleType}}. Ghi chú: {{note}}.',
  "variables" = ARRAY['recipientName','requestName','volunteerName','volunteerPhone','volunteerEmail','area','skills','vehicleType','note'],
  "updatedAt" = NOW()
WHERE "slug" = 'volunteer-join-request-submitted';

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Bạn đã được phân công vào đội cứu trợ',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#0f766e;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Bạn đã được phân công</h1></div>
    <div style="padding:26px 28px">
      <p>Chào {{recipientName}},</p>
      <p>Bạn đã được phân vào <b>{{teamName}}</b> cho nhiệm vụ <b>{{missionName}}</b>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Tình nguyện viên:</b> {{volunteerName}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{volunteerPhone}}</p>
        <p style="margin:0"><b>Email:</b> {{volunteerEmail}}</p>
      </div>
      <div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Vai trò:</b> {{role}}</p>
        <p style="margin:0 0 8px"><b>Đội:</b> {{teamName}}</p>
        <p style="margin:0 0 8px"><b>Nhiệm vụ:</b> {{missionName}}</p>
        <p style="margin:0"><b>Yêu cầu cứu trợ:</b> {{requestName}}</p>
      </div>
      <p>Vui lòng theo dõi hệ thống và giữ liên lạc để nhận hướng dẫn tiếp theo.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Bạn đã được phân công. TNV: {{volunteerName}}. SĐT: {{volunteerPhone}}. Email: {{volunteerEmail}}. Đội: {{teamName}}. Nhiệm vụ: {{missionName}}. Vai trò: {{role}}. Yêu cầu: {{requestName}}.',
  "variables" = ARRAY['recipientName','volunteerName','volunteerPhone','volunteerEmail','teamName','missionName','role','requestName'],
  "updatedAt" = NOW()
WHERE "slug" = 'volunteer-join-request-approved';

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Tài khoản tình nguyện viên đã được kích hoạt',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#2563eb;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Tài khoản đã được kích hoạt</h1></div>
    <div style="padding:26px 28px">
      <p>Chào {{recipientName}},</p>
      <p>Tài khoản tình nguyện viên của bạn đã được xác nhận và có thể tham gia các hoạt động cứu trợ trên hệ thống.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Họ tên:</b> {{volunteerName}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{volunteerPhone}}</p>
        <p style="margin:0 0 8px"><b>Email:</b> {{volunteerEmail}}</p>
        <p style="margin:0 0 8px"><b>Khu vực:</b> {{area}}</p>
        <p style="margin:0"><b>Kỹ năng:</b> {{skills}}</p>
      </div>
      <p>Vui lòng cập nhật hồ sơ, kỹ năng, phương tiện và thời gian sẵn sàng để điều phối viên phân công phù hợp.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Tài khoản TNV đã được kích hoạt. Họ tên: {{volunteerName}}. SĐT: {{volunteerPhone}}. Email: {{volunteerEmail}}. Khu vực: {{area}}. Kỹ năng: {{skills}}.',
  "variables" = ARRAY['recipientName','volunteerName','volunteerPhone','volunteerEmail','area','skills'],
  "updatedAt" = NOW()
WHERE "slug" = 'volunteer-account-approved';

UPDATE "EmailTemplate"
SET
  "subject" = '[DPCT] Đã xác nhận khoản quyên góp {{amount}}',
  "htmlBody" = $html$
<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
    <div style="background:#16a34a;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Đã xác nhận quyên góp</h1></div>
    <div style="padding:26px 28px">
      <p>Kính gửi {{recipientName}},</p>
      <p>Hệ thống đã đối soát thành công khoản quyên góp của bạn.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Người quyên góp:</b> {{donorName}}</p>
        <p style="margin:0 0 8px"><b>SĐT:</b> {{donorPhone}}</p>
        <p style="margin:0"><b>Email:</b> {{donorEmail}}</p>
      </div>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 16px;margin:18px 0">
        <p style="margin:0 0 8px"><b>Số tiền:</b> {{amount}}</p>
        <p style="margin:0 0 8px"><b>Mã giao dịch:</b> {{transactionCode}}</p>
        <p style="margin:0"><b>Thời gian:</b> {{transactedAt}}</p>
      </div>
      <p>Trân trọng cảm ơn sự đóng góp của bạn cho công tác cứu trợ.</p>
    </div>
  </div>
</div>
$html$,
  "textBody" = 'Đã xác nhận khoản quyên góp {{amount}}. Người quyên góp: {{donorName}}. SĐT: {{donorPhone}}. Email: {{donorEmail}}. Mã giao dịch: {{transactionCode}}. Thời gian: {{transactedAt}}.',
  "variables" = ARRAY['recipientName','donorName','donorPhone','donorEmail','amount','transactionCode','transactedAt'],
  "updatedAt" = NOW()
WHERE "slug" = 'donation-confirmed';
