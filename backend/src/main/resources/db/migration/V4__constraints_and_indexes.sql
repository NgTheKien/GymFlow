-- =====================================================================
-- GymFlow · V4 · Bổ sung index và ràng buộc sau khi rà soát V1–V3 (MySQL 8.4)
--  * Chỉ THÊM index/CHECK, không đổi kiểu cột, không xoá hay sửa dữ liệu.
--  * Mỗi CHECK dưới đây trùng với quy tắc backend đã kiểm tra trước khi ghi
--    (Dtos, MemberService.nextCode, ArticleService, SubscriptionService), nay đưa xuống CSDL
--    để dữ liệu nhập tay hoặc script ngoài cũng không lọt.
--  * MySQL kiểm tra lại dữ liệu cũ khi ADD CHECK: chạy docs/db/V4_preflight.sql trước khi deploy,
--    mọi dòng phải ra 0.
-- =====================================================================

-- ---------- Index cho các truy vấn đang dùng ----------

-- AuthService.resetPassword: findByTokenHash. Trước đây quét toàn bảng; token là SHA-256 của chuỗi ngẫu nhiên nên duy nhất.
ALTER TABLE password_reset_tokens
    ADD CONSTRAINT uq_reset_tokens_hash UNIQUE (token_hash);

-- UserRepository.search (order by created_at desc) và countByRole trên trang tổng quan
ALTER TABLE users
    ADD INDEX ix_users_role (role),
    ADD INDEX ix_users_created (created_at);

-- MemberRepository.countByJoinedAtBetween (hội viên mới theo tháng)
ALTER TABLE members
    ADD INDEX ix_members_joined (joined_at);

-- MemberSubscriptionRepository.revenueBetween (doanh thu theo created_at, bỏ gói đã huỷ)
ALTER TABLE member_subscriptions
    ADD INDEX ix_sub_revenue (cancelled, created_at);

-- AuditLogRepository.search lọc theo action trong khoảng thời gian
ALTER TABLE audit_logs
    ADD INDEX ix_audit_action (action, created_at);

-- ---------- Ràng buộc dữ liệu ----------

-- Họ tên không được chỉ toàn khoảng trắng (Dtos: @NotBlank)
ALTER TABLE users
    ADD CONSTRAINT ck_users_full_name CHECK (CHAR_LENGTH(TRIM(full_name)) > 0),
    -- Dtos.PHONE_RULE: rỗng hoặc 0/+84 kèm 9–10 chữ số
    ADD CONSTRAINT ck_users_phone CHECK (phone IS NULL OR phone = '' OR REGEXP_LIKE(phone, '^(0|[+]84)[0-9]{9,10}$'));

-- Mã hội viên do MemberService.nextCode / DataSeeder sinh: HV + ít nhất 5 chữ số
ALTER TABLE members
    ADD CONSTRAINT ck_members_code CHECK (REGEXP_LIKE(code, '^HV[0-9]{5,}$', 'c'));

-- Gói đã huỷ phải có thời điểm huỷ và ngược lại (SubscriptionService.cancel ghi cả hai)
ALTER TABLE member_subscriptions
    ADD CONSTRAINT ck_sub_cancelled CHECK ((cancelled AND cancelled_at IS NOT NULL) OR (NOT cancelled AND cancelled_at IS NULL));

-- Bài đang xuất bản phải có ngày xuất bản (ArticleService APPROVE ghi published_at); trang công khai sắp xếp theo cột này
ALTER TABLE articles
    ADD CONSTRAINT ck_article_published CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL);

-- Tên bài tập không được rỗng
ALTER TABLE exercises
    ADD CONSTRAINT ck_ex_name CHECK (CHAR_LENGTH(TRIM(name)) > 0);

-- Link giấy phép cũng phải là https như link nguồn (ck_source_url)
ALTER TABLE content_sources
    ADD CONSTRAINT ck_source_license_url CHECK (license_url IS NULL OR license_url LIKE 'https://%');
