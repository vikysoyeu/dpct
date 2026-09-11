DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailTemplateTrigger') THEN
    CREATE TYPE "EmailTemplateTrigger" AS ENUM (
      'RESCUE_REQUEST_SUBMITTED',
      'RESCUE_REQUEST_APPROVED',
      'SPONSORSHIP_SUBMITTED',
      'SPONSORSHIP_APPROVED',
      'VOLUNTEER_JOIN_REQUEST_SUBMITTED',
      'VOLUNTEER_JOIN_REQUEST_APPROVED',
      'VOLUNTEER_ACCOUNT_APPROVED',
      'DONATION_CONFIRMED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailDeliveryStatus') THEN
    CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
  END IF;
END $$;

ALTER TABLE "RescueRequest"
  ADD COLUMN IF NOT EXISTS "requesterEmail" TEXT;

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "trigger" "EmailTemplateTrigger",
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT,
  "fromName" TEXT,
  "replyTo" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "variables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id" TEXT NOT NULL,
  "templateId" TEXT,
  "trigger" "EmailTemplateTrigger" NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT,
  "textBody" TEXT,
  "resendEmailId" TEXT,
  "idempotencyKey" TEXT,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "recipientUserId" TEXT,
  "donorId" TEXT,
  "rescueRequestId" TEXT,
  "volunteerRequestId" TEXT,
  "fundTransactionId" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_slug_key" ON "EmailTemplate"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_trigger_key" ON "EmailTemplate"("trigger");
CREATE INDEX IF NOT EXISTS "EmailTemplate_enabled_trigger_idx" ON "EmailTemplate"("enabled", "trigger");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailLog_idempotencyKey_key" ON "EmailLog"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "EmailLog_trigger_status_createdAt_idx" ON "EmailLog"("trigger", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailLog_recipientEmail_createdAt_idx" ON "EmailLog"("recipientEmail", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailLog_rescueRequestId_idx" ON "EmailLog"("rescueRequestId");
CREATE INDEX IF NOT EXISTS "EmailLog_volunteerRequestId_idx" ON "EmailLog"("volunteerRequestId");
CREATE INDEX IF NOT EXISTS "EmailLog_fundTransactionId_idx" ON "EmailLog"("fundTransactionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_templateId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_recipientUserId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_donorId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_rescueRequestId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_rescueRequestId_fkey" FOREIGN KEY ("rescueRequestId") REFERENCES "RescueRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_volunteerRequestId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_volunteerRequestId_fkey" FOREIGN KEY ("volunteerRequestId") REFERENCES "VolunteerRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_fundTransactionId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_fundTransactionId_fkey" FOREIGN KEY ("fundTransactionId") REFERENCES "FundTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "EmailTemplate" ("id", "slug", "trigger", "name", "description", "subject", "htmlBody", "textBody", "fromName", "variables", "updatedAt")
VALUES
  ('tpl_rescue_request_submitted', 'rescue-request-submitted', 'RESCUE_REQUEST_SUBMITTED', 'Xác nhận yêu cầu cứu trợ', 'Gửi cho cán bộ/người gửi form sau khi tạo yêu cầu cứu trợ.', '[DPCT] Đã tiếp nhận yêu cầu cứu trợ {{requestCode}}',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#0f766e;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Đã tiếp nhận yêu cầu cứu trợ</h1><p style="margin:8px 0 0;font-size:14px">Mã yêu cầu: <b>{{requestCode}}</b></p></div><div style="padding:26px 28px"><p>Kính gửi {{recipientName}},</p><p>Hệ thống đã ghi nhận yêu cầu cứu trợ của bạn. Đội điều phối sẽ kiểm tra thông tin và xử lý trong thời gian sớm nhất.</p><div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:14px 16px;margin:18px 0"><p style="margin:0"><b>Nội dung:</b> {{content}}</p><p style="margin:10px 0 0"><b>Địa chỉ:</b> {{address}}</p><p style="margin:10px 0 0"><b>Mức ưu tiên:</b> {{priority}}</p></div><p>Vui lòng giữ điện thoại liên lạc hoạt động để cán bộ phụ trách có thể xác minh khi cần.</p><p style="margin-top:24px;color:#64748b;font-size:13px">Email này được gửi tự động từ hệ thống Điều phối cứu trợ.</p></div></div></div>',
  'Đã tiếp nhận yêu cầu cứu trợ {{requestCode}}. Nội dung: {{content}}. Địa chỉ: {{address}}. Đội điều phối sẽ xử lý trong thời gian sớm nhất.', 'Điều phối cứu trợ', ARRAY['requestCode','recipientName','content','address','priority'], NOW()),
  ('tpl_rescue_request_approved', 'rescue-request-approved', 'RESCUE_REQUEST_APPROVED', 'Yêu cầu cứu trợ được duyệt', 'Gửi khi yêu cầu cứu trợ chuyển sang đang xử lý.', '[DPCT] Yêu cầu cứu trợ {{requestCode}} đang được xử lý',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#2563eb;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Yêu cầu đang được xử lý</h1><p style="margin:8px 0 0;font-size:14px">Mã yêu cầu: <b>{{requestCode}}</b></p></div><div style="padding:26px 28px"><p>Kính gửi {{recipientName}},</p><p>Yêu cầu cứu trợ của bạn đã được duyệt và chuyển sang trạng thái xử lý. Bộ phận điều phối sẽ liên hệ hoặc triển khai lực lượng phù hợp theo tình hình thực tế.</p><div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;margin:18px 0"><p style="margin:0"><b>Nội dung:</b> {{content}}</p><p style="margin:10px 0 0"><b>Địa chỉ:</b> {{address}}</p></div><p>Cảm ơn bạn đã cung cấp thông tin kịp thời.</p></div></div></div>',
  'Yêu cầu cứu trợ {{requestCode}} đã được duyệt và đang được xử lý. Nội dung: {{content}}. Địa chỉ: {{address}}.', 'Điều phối cứu trợ', ARRAY['requestCode','recipientName','content','address'], NOW()),
  ('tpl_sponsorship_submitted', 'sponsorship-submitted', 'SPONSORSHIP_SUBMITTED', 'Xác nhận yêu cầu tài trợ', 'Gửi cho nhà tài trợ sau khi đăng ký tài trợ hàng hóa.', '[DPCT] Đã nhận thông tin tài trợ hàng hóa',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#7c3aed;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Cảm ơn thông tin tài trợ</h1></div><div style="padding:26px 28px"><p>Kính gửi {{recipientName}},</p><p>Hệ thống đã ghi nhận đề nghị tài trợ hàng hóa của bạn. Bộ phận kho vận sẽ kiểm tra và liên hệ để xác nhận phương án tiếp nhận.</p><div style="background:#f5f3ff;border-left:4px solid #8b5cf6;padding:14px 16px;margin:18px 0"><p style="margin:0;white-space:pre-line"><b>Danh sách hàng hóa:</b><br>{{goodsSummary}}</p><p style="margin:10px 0 0"><b>Gắn với yêu cầu:</b> {{requestLabel}}</p></div><p>Xin vui lòng giữ liên lạc qua số điện thoại/email đã cung cấp.</p></div></div></div>',
  'Đã nhận thông tin tài trợ hàng hóa. Danh sách: {{goodsSummary}}. Gắn với yêu cầu: {{requestLabel}}.', 'Điều phối cứu trợ', ARRAY['recipientName','goodsSummary','requestLabel'], NOW()),
  ('tpl_sponsorship_approved', 'sponsorship-approved', 'SPONSORSHIP_APPROVED', 'Tài trợ hàng hóa được xác nhận', 'Gửi khi hàng hóa tài trợ được xác nhận nhập kho/điểm tập kết.', '[DPCT] Tài trợ hàng hóa đã được xác nhận',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#16a34a;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Tài trợ đã được xác nhận</h1></div><div style="padding:26px 28px"><p>Kính gửi {{recipientName}},</p><p>Kho vận đã xác nhận phần tài trợ của bạn và cập nhật vào hệ thống điều phối.</p><div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 16px;margin:18px 0"><p style="margin:0"><b>Hàng hóa:</b> {{itemName}}</p><p style="margin:10px 0 0"><b>Số lượng:</b> {{quantity}} {{unit}}</p></div><p>Trân trọng cảm ơn sự đồng hành của bạn.</p></div></div></div>',
  'Tài trợ đã được xác nhận: {{itemName}} - {{quantity}} {{unit}}. Trân trọng cảm ơn sự đồng hành của bạn.', 'Điều phối cứu trợ', ARRAY['recipientName','itemName','quantity','unit'], NOW()),
  ('tpl_volunteer_join_request_submitted', 'volunteer-join-request-submitted', 'VOLUNTEER_JOIN_REQUEST_SUBMITTED', 'Xác nhận đăng ký tham gia cứu trợ', 'Gửi cho TNV sau khi đăng ký tham gia một yêu cầu cứu trợ.', '[DPCT] Đã nhận đăng ký tham gia {{requestName}}',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#ea580c;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Đã nhận đăng ký tham gia</h1></div><div style="padding:26px 28px"><p>Chào {{recipientName}},</p><p>Hệ thống đã ghi nhận đăng ký tham gia yêu cầu cứu trợ <b>{{requestName}}</b>. Điều phối viên sẽ rà soát năng lực, vị trí và nhu cầu thực tế trước khi phân công.</p><div style="background:#fff7ed;border-left:4px solid #f97316;padding:14px 16px;margin:18px 0"><p style="margin:0"><b>Ghi chú của bạn:</b> {{note}}</p></div><p>Bạn sẽ nhận thông báo khi được phân vào đội hoặc khi trạng thái đăng ký thay đổi.</p></div></div></div>',
  'Đã nhận đăng ký tham gia {{requestName}}. Ghi chú: {{note}}. Điều phối viên sẽ rà soát và phản hồi khi có phân công.', 'Điều phối cứu trợ', ARRAY['recipientName','requestName','note'], NOW()),
  ('tpl_volunteer_join_request_approved', 'volunteer-join-request-approved', 'VOLUNTEER_JOIN_REQUEST_APPROVED', 'TNV được phân công tham gia', 'Gửi khi TNV được duyệt/phân vào đội cứu trợ.', '[DPCT] Bạn đã được phân công vào đội cứu trợ',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#0f766e;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Bạn đã được phân công</h1></div><div style="padding:26px 28px"><p>Chào {{recipientName}},</p><p>Bạn đã được phân vào <b>{{teamName}}</b> cho nhiệm vụ <b>{{missionName}}</b>.</p><div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:14px 16px;margin:18px 0"><p style="margin:0"><b>Vai trò:</b> {{role}}</p><p style="margin:10px 0 0"><b>Yêu cầu cứu trợ:</b> {{requestName}}</p></div><p>Vui lòng theo dõi hệ thống và giữ liên lạc để nhận hướng dẫn tiếp theo.</p></div></div></div>',
  'Bạn đã được phân vào {{teamName}} cho nhiệm vụ {{missionName}}. Vai trò: {{role}}. Yêu cầu: {{requestName}}.', 'Điều phối cứu trợ', ARRAY['recipientName','teamName','missionName','role','requestName'], NOW()),
  ('tpl_volunteer_account_approved', 'volunteer-account-approved', 'VOLUNTEER_ACCOUNT_APPROVED', 'Tài khoản TNV được duyệt', 'Gửi khi tài khoản tình nguyện viên được kích hoạt.', '[DPCT] Tài khoản tình nguyện viên đã được kích hoạt',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#2563eb;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Tài khoản đã được kích hoạt</h1></div><div style="padding:26px 28px"><p>Chào {{recipientName}},</p><p>Tài khoản tình nguyện viên của bạn đã được xác nhận và có thể tham gia các hoạt động cứu trợ trên hệ thống.</p><p>Vui lòng cập nhật hồ sơ, kỹ năng, phương tiện và thời gian sẵn sàng để điều phối viên phân công phù hợp.</p></div></div></div>',
  'Tài khoản tình nguyện viên của bạn đã được xác nhận. Vui lòng cập nhật hồ sơ để nhận phân công phù hợp.', 'Điều phối cứu trợ', ARRAY['recipientName'], NOW()),
  ('tpl_donation_confirmed', 'donation-confirmed', 'DONATION_CONFIRMED', 'Xác nhận quyên góp tiền', 'Gửi khi giao dịch quyên góp được đối soát thành công.', '[DPCT] Đã xác nhận khoản quyên góp {{amount}}',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#16a34a;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Đã xác nhận quyên góp</h1></div><div style="padding:26px 28px"><p>Kính gửi {{recipientName}},</p><p>Hệ thống đã đối soát thành công khoản quyên góp của bạn.</p><div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 16px;margin:18px 0"><p style="margin:0"><b>Số tiền:</b> {{amount}}</p><p style="margin:10px 0 0"><b>Mã giao dịch:</b> {{transactionCode}}</p></div><p>Trân trọng cảm ơn sự đóng góp của bạn cho công tác cứu trợ.</p></div></div></div>',
  'Đã xác nhận khoản quyên góp {{amount}}. Mã giao dịch: {{transactionCode}}. Trân trọng cảm ơn sự đóng góp của bạn.', 'Điều phối cứu trợ', ARRAY['recipientName','amount','transactionCode'], NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "trigger" = EXCLUDED."trigger",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "subject" = EXCLUDED."subject",
  "htmlBody" = EXCLUDED."htmlBody",
  "textBody" = EXCLUDED."textBody",
  "fromName" = EXCLUDED."fromName",
  "variables" = EXCLUDED."variables",
  "updatedAt" = NOW();
