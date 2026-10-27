# GymFlow – Thiết kế cơ sở dữ liệu

Lược đồ do **Flyway** quản lý (`backend/src/main/resources/db/migration/V1__init_schema.sql`), Hibernate chỉ đọc (`ddl-auto: none`).
Nguyên tắc: **mọi quy tắc toàn vẹn quan trọng đều nằm ở CSDL**, kể cả khi service đã kiểm tra trước, để không có đường nào ghi được dữ liệu sai.

## Sơ đồ ERD

```mermaid
erDiagram
    users ||--o| trainers : "là"
    users ||--o| members : "là"
    users ||--o{ password_reset_tokens : "yêu cầu"
    users ||--o{ audit_logs : "thực hiện"
    trainers ||--o{ trainer_shifts : "có ca"
    trainers |o--o{ members : "phụ trách"
    members ||--o{ member_subscriptions : "đăng ký"
    membership_plans ||--o{ member_subscriptions : "được bán"
    members ||--o{ workout_plans : "có"
    trainers |o--o{ workout_plans : "soạn"
    workout_plans ||--o{ workout_plan_items : "gồm"
    exercises ||--o{ workout_plan_items : "dùng trong"
    members ||--o{ workout_schedules : "được xếp"
    trainers |o--o{ workout_schedules : "dạy"
    workout_plans |o--o{ workout_schedules : "theo"
    workout_schedules |o--o| workout_logs : "ghi nhận"
    members ||--o{ workout_logs : "hoàn thành"
    members ||--o{ weight_records : "đo"

    users {
        bigint id PK
        varchar email UK "regex CHECK"
        varchar password_hash "BCrypt"
        varchar full_name
        varchar role "ADMIN | TRAINER | MEMBER"
        varchar status "ACTIVE | LOCKED"
        timestamp last_login_at
    }
    password_reset_tokens {
        bigint id PK
        bigint user_id FK
        varchar token_hash UK "SHA-256, không lưu mã gốc"
        timestamp expires_at "30 phút"
        timestamp used_at "dùng 1 lần"
    }
    trainers {
        bigint id PK
        bigint user_id FK,UK
        varchar specialty
        int experience_years "0..60"
        boolean active
    }
    trainer_shifts {
        bigint id PK
        bigint trainer_id FK
        smallint day_of_week "1..7"
        time start_time
        time end_time "> start_time"
    }
    members {
        bigint id PK
        bigint user_id FK,UK
        varchar code UK "HV00001"
        bigint trainer_id FK "SET NULL"
        varchar gender "MALE | FEMALE | OTHER"
        numeric height_cm "80..250"
        varchar status "ACTIVE | PAUSED | INACTIVE"
        date joined_at
    }
    membership_plans {
        bigint id PK
        varchar name UK
        bigint price ">= 0 (VND)"
        int duration_days "1..1095"
        boolean active "ngừng bán thay vì xoá"
    }
    member_subscriptions {
        bigint id PK
        bigint member_id FK
        bigint plan_id FK "RESTRICT"
        date start_date
        date end_date ">= start_date"
        bigint price_paid "giá thực thu"
        boolean cancelled
        bigint created_by FK
    }
    exercises {
        bigint id PK
        varchar name UK
        varchar muscle_group "8 nhóm cơ"
        varchar level "BEGINNER | INTERMEDIATE | ADVANCED"
        boolean hidden "ẩn thay vì xoá"
    }
    workout_plans {
        bigint id PK
        bigint member_id FK
        bigint trainer_id FK
        date start_date
        date end_date
        varchar status "ACTIVE | COMPLETED | ARCHIVED"
    }
    workout_plan_items {
        bigint id PK
        bigint plan_id FK "CASCADE"
        bigint exercise_id FK "RESTRICT"
        smallint day_of_week "1..7"
        int sets "1..20"
        varchar reps "10-12, 45s…"
        numeric weight_kg
        int rest_seconds "0..900"
    }
    workout_schedules {
        bigint id PK
        bigint member_id FK
        bigint trainer_id FK
        bigint plan_id FK "SET NULL"
        timestamp start_time
        timestamp end_time "> start_time"
        varchar status "SCHEDULED | COMPLETED | MISSED | CANCELLED"
    }
    workout_logs {
        bigint id PK
        bigint schedule_id FK,UK "1 buổi – 1 nhật ký"
        bigint member_id FK
        int duration_minutes "1..600"
        int calories "0..5000"
        smallint rating "1..5"
    }
    weight_records {
        bigint id PK
        bigint member_id FK
        date recorded_date "UK (member_id, recorded_date)"
        numeric weight_kg "20..300"
        numeric body_fat "2..70"
    }
    audit_logs {
        bigint id PK
        bigint actor_id FK
        varchar action
        varchar target_type
        varchar detail
        boolean success
        varchar ip
        timestamp created_at
    }
```

## Ràng buộc nghiệp vụ đặt trong CSDL

| Quy tắc | Cài đặt | Tên ràng buộc |
| --- | --- | --- |
| Một hội viên không có 2 gói chồng thời gian (trừ gói đã huỷ) | `EXCLUDE USING gist (member_id WITH =, daterange(start,end,'[]') WITH &&) WHERE NOT cancelled` | `ex_sub_overlap` |
| HLV không dạy 2 buổi trùng giờ | `EXCLUDE … tsrange(start,end) WITH && WHERE status <> 'CANCELLED'` | `ex_ws_trainer_overlap` |
| Hội viên không có 2 buổi trùng giờ | như trên theo `member_id` | `ex_ws_member_overlap` |
| Mỗi ngày tối đa 1 bản ghi cân nặng | `UNIQUE (member_id, recorded_date)` | `uq_weight_member_day` |
| Mỗi buổi tập chỉ ghi nhận hoàn thành 1 lần | `UNIQUE (schedule_id)` | `uq_logs_schedule` |
| Gói đã bán / bài tập đã dùng không bị xoá cứng | `ON DELETE RESTRICT` | FK `plan_id`, `exercise_id` |
| Giờ/ngày, phạm vi số (cân nặng, % mỡ, số hiệp, đánh giá…) | `CHECK` | `ck_*` |

`GlobalExceptionHandler` ánh xạ tên ràng buộc → thông báo tiếng Việt (HTTP 409/400), nên dù có request đi vòng qua service, người dùng vẫn nhận lỗi dễ hiểu.

## Trạng thái gói tập

Không lưu cột trạng thái, tính theo ngày hôm nay (`MemberSubscription.stateOn`, view `v_subscription_status` cho báo cáo SQL):

| Điều kiện | Trạng thái |
| --- | --- |
| `cancelled = true` | Đã huỷ |
| hôm nay < `start_date` | Sắp bắt đầu |
| hôm nay > `end_date` | Hết hạn |
| còn ≤ 7 ngày | Sắp hết hạn |
| còn lại | Còn hiệu lực |

## Index chính

`ix_sub_member (member_id, end_date)`, partial `ix_sub_end … WHERE NOT cancelled`, `ix_ws_member_time`, `ix_ws_trainer_time`, `ix_ws_status_time` (job tự đánh vắng), `ix_logs_member`, `ix_audit_created DESC`.
