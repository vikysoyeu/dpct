UPDATE "RescueRequest"
SET "content" = trim(
  regexp_replace(
    regexp_replace(
      replace(replace("content", E'\r\n', E'\n'), E'\r', E'\n'),
      '[[:blank:]]+(-[[:blank:]]*(Hàng hóa|Cứu hộ|Cứu nạn|Y tế|Nước sạch|Thực phẩm|Nhu yếu phẩm|Khác)[[:blank:]]*:)',
      E'\n\\1',
      'gi'
    ),
    E'\n{3,}',
    E'\n\n',
    'g'
  )
)
WHERE "content" IS NOT NULL;
