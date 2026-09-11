INSERT INTO "EmailTemplate" ("id", "slug", "trigger", "name", "description", "subject", "htmlBody", "textBody", "fromName", "variables", "updatedAt")
VALUES (
  'tpl_volunteer_password_reset',
  'volunteer-password-reset',
  'VOLUNTEER_PASSWORD_RESET',
  'Mã đặt lại mật khẩu TNV',
  'Gửi mã xác thực cho tình nguyện viên khi quên mật khẩu.',
  '[DPCT] Mã xác thực đặt lại mật khẩu TNV',
  '<div style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden"><div style="background:#1d4ed8;color:#fff;padding:22px 28px"><h1 style="margin:0;font-size:22px">Mã đặt lại mật khẩu</h1></div><div style="padding:26px 28px"><p>Chào {{volunteerName}},</p><p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản tình nguyện viên của bạn.</p><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:18px 20px;margin:20px 0;text-align:center"><p style="margin:0 0 8px;color:#475569;font-size:13px">Mã xác thực</p><p style="margin:0;font-size:32px;font-weight:800;letter-spacing:6px;color:#1d4ed8">{{code}}</p></div><p>Mã có hiệu lực trong {{expiresInMinutes}} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p><p style="margin-top:24px;color:#64748b;font-size:13px">Email này được gửi tự động từ hệ thống Điều phối cứu trợ.</p></div></div></div>',
  'Mã xác thực đặt lại mật khẩu TNV của bạn là {{code}}. Mã có hiệu lực trong {{expiresInMinutes}} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.',
  'Điều phối cứu trợ',
  ARRAY['recipientName','volunteerName','code','expiresInMinutes'],
  NOW()
)
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
