UPDATE "EmailTemplate"
SET
  "htmlBody" = replace(
    "htmlBody",
    '<p style="margin:0 0 8px"><b>Nội dung:</b> {{content}}</p>',
    '<p style="margin:0 0 8px;white-space:pre-line"><b>Nội dung:</b><br>{{content}}</p>'
  ),
  "textBody" = replace(
    "textBody",
    '. Nội dung: {{content}}. Địa chỉ:',
    E'. Nội dung:\n{{content}}\nĐịa chỉ:'
  ),
  "updatedAt" = NOW()
WHERE "slug" IN ('rescue-request-submitted', 'rescue-request-approved');
