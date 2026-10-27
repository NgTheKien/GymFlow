-- =====================================================================
-- GymFlow · V1 · Lược đồ CSDL (PostgreSQL 16)
-- Người phụ trách: Database Developer (Nguyễn Thế Kiên)
-- Nguyên tắc: ràng buộc nằm ở CSDL (PK/FK/UNIQUE/CHECK/EXCLUDE),
-- backend kiểm tra lại để trả thông báo thân thiện.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- cho ràng buộc chống chồng thời gian

-- ---------- Tài khoản ----------
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(120) NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    role            VARCHAR(20)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'TRAINER', 'MEMBER')),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'LOCKED')),
    CONSTRAINT ck_users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TABLE password_reset_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    used_at     TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX ix_reset_tokens_user ON password_reset_tokens (user_id);

-- ---------- Huấn luyện viên ----------
CREATE TABLE trainers (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    specialty         VARCHAR(150),
    experience_years  INT          NOT NULL DEFAULT 0,
    certificates      VARCHAR(255),
    bio               TEXT,
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_trainers_user UNIQUE (user_id),
    CONSTRAINT ck_trainers_exp CHECK (experience_years BETWEEN 0 AND 60)
);

CREATE TABLE trainer_shifts (
    id           BIGSERIAL PRIMARY KEY,
    trainer_id   BIGINT   NOT NULL REFERENCES trainers (id) ON DELETE CASCADE,
    day_of_week  SMALLINT NOT NULL,
    start_time   TIME     NOT NULL,
    end_time     TIME     NOT NULL,
    CONSTRAINT ck_shift_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_shift_time CHECK (end_time > start_time)
);
CREATE INDEX ix_shifts_trainer ON trainer_shifts (trainer_id, day_of_week);

-- ---------- Hội viên ----------
CREATE TABLE members (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code           VARCHAR(20)  NOT NULL,
    date_of_birth  DATE,
    gender         VARCHAR(10),
    height_cm      NUMERIC(5, 1),
    goal           VARCHAR(255),
    address        VARCHAR(255),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    trainer_id     BIGINT       REFERENCES trainers (id) ON DELETE SET NULL,
    joined_at      DATE         NOT NULL DEFAULT CURRENT_DATE,
    note           TEXT,
    CONSTRAINT uq_members_user UNIQUE (user_id),
    CONSTRAINT uq_members_code UNIQUE (code),
    CONSTRAINT ck_members_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT ck_members_height CHECK (height_cm IS NULL OR height_cm BETWEEN 80 AND 250),
    CONSTRAINT ck_members_status CHECK (status IN ('ACTIVE', 'PAUSED', 'INACTIVE')),
    CONSTRAINT ck_members_dob CHECK (date_of_birth IS NULL OR date_of_birth > DATE '1900-01-01')
);
CREATE INDEX ix_members_trainer ON members (trainer_id);
CREATE INDEX ix_members_status ON members (status);

-- ---------- Gói tập & đăng ký ----------
CREATE TABLE membership_plans (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    price          BIGINT       NOT NULL,
    duration_days  INT          NOT NULL,
    benefits       TEXT,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uq_plans_name UNIQUE (name),
    CONSTRAINT ck_plans_price CHECK (price >= 0),
    CONSTRAINT ck_plans_duration CHECK (duration_days BETWEEN 1 AND 1095)
);

CREATE TABLE member_subscriptions (
    id            BIGSERIAL PRIMARY KEY,
    member_id     BIGINT    NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    plan_id       BIGINT    NOT NULL REFERENCES membership_plans (id) ON DELETE RESTRICT,
    start_date    DATE      NOT NULL,
    end_date      DATE      NOT NULL,
    price_paid    BIGINT    NOT NULL,
    cancelled     BOOLEAN   NOT NULL DEFAULT FALSE,
    cancelled_at  TIMESTAMP,
    note          VARCHAR(255),
    created_by    BIGINT    REFERENCES users (id) ON DELETE SET NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_sub_dates CHECK (end_date >= start_date),
    CONSTRAINT ck_sub_price CHECK (price_paid >= 0),
    -- Một hội viên không có 2 gói (chưa huỷ) chồng thời gian
    CONSTRAINT ex_sub_overlap EXCLUDE USING gist (
        member_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    ) WHERE (NOT cancelled)
);
CREATE INDEX ix_sub_member ON member_subscriptions (member_id, end_date);
CREATE INDEX ix_sub_end ON member_subscriptions (end_date) WHERE NOT cancelled;

-- ---------- Bài tập & kế hoạch ----------
CREATE TABLE exercises (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    muscle_group  VARCHAR(30)  NOT NULL,
    equipment     VARCHAR(60),
    level         VARCHAR(20)  NOT NULL DEFAULT 'BEGINNER',
    description   TEXT,
    instructions  TEXT,
    video_url     VARCHAR(255),
    hidden        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by    BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uq_exercises_name UNIQUE (name),
    CONSTRAINT ck_ex_group CHECK (muscle_group IN ('CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO', 'FULL_BODY')),
    CONSTRAINT ck_ex_level CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'))
);

CREATE TABLE workout_plans (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT       NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    trainer_id  BIGINT       REFERENCES trainers (id) ON DELETE SET NULL,
    name        VARCHAR(120) NOT NULL,
    goal        VARCHAR(255),
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    note        TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT ck_wp_dates CHECK (end_date >= start_date),
    CONSTRAINT ck_wp_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED'))
);
CREATE INDEX ix_wp_member ON workout_plans (member_id, status);

CREATE TABLE workout_plan_items (
    id                BIGSERIAL PRIMARY KEY,
    plan_id           BIGINT       NOT NULL REFERENCES workout_plans (id) ON DELETE CASCADE,
    exercise_id       BIGINT       NOT NULL REFERENCES exercises (id) ON DELETE RESTRICT,
    day_of_week       SMALLINT     NOT NULL,
    sort_order        INT          NOT NULL DEFAULT 0,
    sets              INT          NOT NULL,
    reps              VARCHAR(20)  NOT NULL,
    weight_kg         NUMERIC(6, 1),
    rest_seconds      INT,
    duration_minutes  INT,
    note              VARCHAR(255),
    CONSTRAINT ck_wpi_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_wpi_sets CHECK (sets BETWEEN 1 AND 20),
    CONSTRAINT ck_wpi_weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT ck_wpi_rest CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 900),
    CONSTRAINT ck_wpi_duration CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 300)
);
CREATE INDEX ix_wpi_plan ON workout_plan_items (plan_id, day_of_week, sort_order);

-- ---------- Lịch tập & nhật ký ----------
CREATE TABLE workout_schedules (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT       NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    trainer_id  BIGINT       REFERENCES trainers (id) ON DELETE SET NULL,
    plan_id     BIGINT       REFERENCES workout_plans (id) ON DELETE SET NULL,
    title       VARCHAR(120) NOT NULL,
    start_time  TIMESTAMP    NOT NULL,
    end_time    TIMESTAMP    NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED',
    note        VARCHAR(255),
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT ck_ws_time CHECK (end_time > start_time),
    CONSTRAINT ck_ws_status CHECK (status IN ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED')),
    -- HLV và hội viên không có 2 buổi trùng giờ (trừ buổi đã huỷ)
    CONSTRAINT ex_ws_trainer_overlap EXCLUDE USING gist (
        trainer_id WITH =, tsrange(start_time, end_time) WITH &&
    ) WHERE (status <> 'CANCELLED' AND trainer_id IS NOT NULL),
    CONSTRAINT ex_ws_member_overlap EXCLUDE USING gist (
        member_id WITH =, tsrange(start_time, end_time) WITH &&
    ) WHERE (status <> 'CANCELLED')
);
CREATE INDEX ix_ws_member_time ON workout_schedules (member_id, start_time);
CREATE INDEX ix_ws_trainer_time ON workout_schedules (trainer_id, start_time);
CREATE INDEX ix_ws_status_time ON workout_schedules (status, start_time);

CREATE TABLE workout_logs (
    id                BIGSERIAL PRIMARY KEY,
    schedule_id       BIGINT    REFERENCES workout_schedules (id) ON DELETE SET NULL,
    member_id         BIGINT    NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    completed_at      TIMESTAMP NOT NULL DEFAULT now(),
    duration_minutes  INT,
    calories          INT,
    rating            SMALLINT,
    note              VARCHAR(255),
    CONSTRAINT uq_logs_schedule UNIQUE (schedule_id),
    CONSTRAINT ck_logs_duration CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600),
    CONSTRAINT ck_logs_calories CHECK (calories IS NULL OR calories BETWEEN 0 AND 5000),
    CONSTRAINT ck_logs_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);
CREATE INDEX ix_logs_member ON workout_logs (member_id, completed_at);

-- ---------- Theo dõi cân nặng ----------
CREATE TABLE weight_records (
    id             BIGSERIAL PRIMARY KEY,
    member_id      BIGINT        NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    recorded_date  DATE          NOT NULL,
    weight_kg      NUMERIC(5, 1) NOT NULL,
    body_fat       NUMERIC(4, 1),
    note           VARCHAR(255),
    created_at     TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT uq_weight_member_day UNIQUE (member_id, recorded_date),
    CONSTRAINT ck_weight_range CHECK (weight_kg BETWEEN 20 AND 300),
    CONSTRAINT ck_body_fat_range CHECK (body_fat IS NULL OR body_fat BETWEEN 2 AND 70)
);

-- ---------- Nhật ký hệ thống ----------
CREATE TABLE audit_logs (
    id           BIGSERIAL PRIMARY KEY,
    actor_id     BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    actor_email  VARCHAR(120),
    action       VARCHAR(60)  NOT NULL,
    target_type  VARCHAR(40),
    target_id    VARCHAR(40),
    detail       VARCHAR(500),
    success      BOOLEAN      NOT NULL DEFAULT TRUE,
    ip           VARCHAR(45),
    created_at   TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_created ON audit_logs (created_at DESC);
CREATE INDEX ix_audit_actor ON audit_logs (actor_id, created_at DESC);

-- ---------- View báo cáo ----------
-- Trạng thái gói tính theo ngày hiện tại, không lưu cứng
CREATE VIEW v_subscription_status AS
SELECT s.*,
       CASE
           WHEN s.cancelled THEN 'CANCELLED'
           WHEN CURRENT_DATE < s.start_date THEN 'UPCOMING'
           WHEN CURRENT_DATE > s.end_date THEN 'EXPIRED'
           WHEN s.end_date - CURRENT_DATE <= 7 THEN 'EXPIRING'
           ELSE 'ACTIVE'
       END AS computed_status,
       (s.end_date - CURRENT_DATE) AS days_left
FROM member_subscriptions s;
