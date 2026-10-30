-- Chạy TRƯỚC khi deploy V4 trên CSDL đang có dữ liệu. Chỉ đọc, không sửa gì.
-- Mọi cột phải bằng 0; dòng nào khác 0 thì V4 sẽ lỗi ở ràng buộc tương ứng → báo lại để xử lý riêng.
SELECT
    (SELECT COUNT(*) FROM (SELECT token_hash FROM password_reset_tokens GROUP BY token_hash HAVING COUNT(*) > 1) d) AS dup_reset_token,
    (SELECT COUNT(*) FROM users WHERE CHAR_LENGTH(TRIM(full_name)) = 0)                                          AS blank_full_name,
    (SELECT COUNT(*) FROM users WHERE phone IS NOT NULL AND phone <> ''
                                  AND NOT REGEXP_LIKE(phone, '^(0|[+]84)[0-9]{9,10}$'))                          AS bad_phone,
    (SELECT COUNT(*) FROM members WHERE NOT REGEXP_LIKE(code, '^HV[0-9]{5,}$', 'c'))                             AS bad_member_code,
    (SELECT COUNT(*) FROM member_subscriptions WHERE cancelled <> (cancelled_at IS NOT NULL))                   AS bad_cancelled,
    (SELECT COUNT(*) FROM articles WHERE status = 'PUBLISHED' AND published_at IS NULL)                          AS published_no_date,
    (SELECT COUNT(*) FROM exercises WHERE CHAR_LENGTH(TRIM(name)) = 0)                                           AS blank_exercise,
    (SELECT COUNT(*) FROM content_sources WHERE license_url IS NOT NULL AND license_url NOT LIKE 'https://%')     AS bad_license_url;
