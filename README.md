# GymFlow – Hệ thống quản lý phòng gym và theo dõi quá trình tập luyện

Đồ án môn Phát triển Dự án Phần mềm – **Nhóm 03 (HN-KS24-CNTT3)** · GVHD: ThS. Hồ Xuân Hùng

| Tầng | Công nghệ |
| --- | --- |
| Frontend | React 18 + TypeScript, Vite, React Router 6, CSS thuần (design system theo Figma “GymFlow – UI Design”), biểu đồ SVG tự vẽ |
| Backend | Java 21, Spring Boot 3.5, Gradle, Spring Security + JWT (HS256), Spring Data JPA, Bean Validation, springdoc OpenAPI (Swagger) |
| CSDL | MySQL 8.4 + **Flyway** (migration có version), ràng buộc `CHECK`/`UNIQUE`/FK ngay trong CSDL; chống trùng lịch/gói bằng khoá dòng ở service |
| Đóng gói | Docker, Docker Compose, Nginx (phục vụ SPA + reverse proxy `/api`) |
| CI | GitHub Actions: `gradle build` (unit test), `tsc --noEmit`, `vite build`, `docker compose build` |

## 1. Chạy nhanh bằng Docker

```bash
cp .env.example .env          # Windows: copy .env.example .env
docker compose up -d --build
```

- Giao diện: http://localhost:8081 · MySQL: localhost:3307
- API: http://localhost:8080/api · Swagger UI: http://localhost:8080/swagger-ui.html · Health: http://localhost:8080/actuator/health

CSDL trống sẽ được Flyway tạo lược đồ, sau đó backend tự sinh dữ liệu mẫu **bám theo ngày hiện tại**: 12 hội viên, 3 HLV (có ca làm), 6 gói (1 gói đã ngừng bán), 23 bài tập, giáo án, lịch tập 8 tuần trước + 2 tuần tới, cân nặng 10 tuần và doanh thu trải 6 tháng. Nhờ vậy lúc nào demo cũng có gói sắp hết hạn, gói hết hạn, gói gia hạn trước, buổi tập hôm nay…

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Quản lý | admin@gymflow.vn | Admin@123 |
| Huấn luyện viên | trainer@gymflow.vn (+ trainer2, trainer3) | Trainer@123 |
| Hội viên | member@gymflow.vn (+ member2 … member12) | Member@123 |

Màn hình đăng nhập có 3 nút đăng nhập nhanh.

```bash
docker compose logs -f backend    # xem log
docker compose down -v            # xoá dữ liệu, lần sau seed lại
```

## 2. Chạy khi phát triển

```bash
docker compose up -d mysql                    # chỉ chạy MySQL (cổng 3307)
cd backend && gradle bootRun                  # Gradle 8.14, tự tải JDK 21; cổng 8080
cd frontend && npm install && npm run dev     # Node 22, http://localhost:5173 (proxy /api → 8080)
```

Kiểm thử backend: `cd backend && gradle test` (unit test Mockito, **không cần CSDL**). Kiểm tra kiểu frontend: `npm run typecheck`.

## 3. Cấu trúc thư mục

```
gymflow/
├── backend/src/main/
│   ├── java/com/gymflow/
│   │   ├── domain/        14 entity + enum (User, Member, Trainer, TrainerShift, MembershipPlan, MemberSubscription,
│   │   │                  Exercise, WorkoutPlan, WorkoutPlanItem, WorkoutSchedule, WorkoutLog, WeightRecord, PasswordResetToken, AuditLog)
│   │   ├── repository/    Spring Data JPA (JPQL)
│   │   ├── service/       Nghiệp vụ, AccessService (phạm vi dữ liệu), Mappers (DTO + trường dẫn xuất)
│   │   ├── web/           REST controller (@PreAuthorize theo vai trò)
│   │   ├── dto/Dtos.java  Toàn bộ request/response + validation (đối chiếu 1-1 với frontend/src/api/types.ts)
│   │   ├── security/      JwtService, JwtAuthFilter, AuthUser
│   │   ├── config/        SecurityConfig, OpenApiConfig, ClockConfig, DataSeeder
│   │   └── common/        ApiException, GlobalExceptionHandler, PageResponse, Secrets
│   └── resources/db/migration/V1__init_schema.sql
├── backend/src/test/      Unit test: trạng thái gói, BMI/chuyên cần/chuỗi tuần, gia hạn nối tiếp, chặn trùng lịch
├── frontend/src/
│   ├── api/               HTTP client (JWT, xử lý 401) + kiểu dữ liệu
│   ├── auth/              AuthContext
│   ├── components/        UI kit, Layout (sidebar, topbar, thông báo, tab bar mobile), biểu đồ SVG, lịch tuần, form dùng chung
│   ├── pages/{admin,trainer,member,shared}/
│   └── styles.css         Design system (token màu từ Figma)
├── docs/ERD.md            Sơ đồ ERD (Mermaid) + bảng ràng buộc
├── compose.yaml · compose.prod.yaml · .env.example · .github/workflows/ci.yml
```

## 4. Chức năng

**Hội viên** – đăng nhập/đăng xuất, quên mật khẩu (mã 8 ký tự, 30 phút, dùng 1 lần, chỉ lưu bản băm), đổi mật khẩu có thước đo độ mạnh, cập nhật hồ sơ tập luyện; dashboard với chuỗi tuần tập, buổi tiếp theo, nhắc đánh dấu hoàn thành; gói tập & số ngày còn lại; lịch tuần (desktop dạng lưới giờ, mobile dạng danh sách); giáo án theo ngày (mở sẵn ngày hôm nay); hoàn thành buổi (thời lượng, calo, đánh giá sao), ghi bù buổi bị đánh vắng trong 7 ngày; cân nặng & % mỡ, biểu đồ, thanh BMI chuẩn châu Á, chuyên cần 8 tuần.

**Huấn luyện viên** – dashboard hôm nay/tuần, tỉ lệ đi tập, tải lịch theo ngày; hội viên được phân công kèm tiến độ; soạn giáo án theo 7 ngày (chép ngày, đổi thứ tự, hiệp/số lần/tạ/nghỉ/phút cardio); xếp lịch lặp tới 12 tuần (tuần nào trùng giờ/hết gói thì **bỏ qua và báo lại**, không huỷ cả loạt); dời/huỷ/đánh vắng; thư viện bài tập; hồ sơ chuyên môn & ca làm việc.

**Quản lý** – dashboard (hội viên, gói hiệu lực, doanh thu tháng & tăng trưởng, doanh thu 6 tháng, phân bổ gói, gói sắp hết hạn, hoạt động gần đây); CRUD hội viên (mật khẩu tạm tự sinh), trạng thái, phân công HLV; HLV & ca làm; gói tập (ngừng bán thay vì xoá); đăng ký/gia hạn nối tiếp/huỷ có lý do; báo cáo theo khoảng ngày (doanh thu theo tháng/gói, chuyên cần theo HLV, hội viên mới, trạng thái, giới tính); tài khoản (khoá/mở, cấp mật khẩu tạm, thêm quản lý); nhật ký hệ thống có lọc theo hành động/ngày. **Xuất CSV** (mở được bằng Excel tiếng Việt) cho hội viên, đăng ký gói, báo cáo, nhật ký.

**Chung** – trung tâm thông báo tính sẵn theo vai trò (gói sắp hết, buổi hôm nay, nhắc cân, đăng nhập thất bại bất thường), giao diện responsive có tab bar dưới cho điện thoại, trang 403/404, Swagger cho toàn bộ API.

### Quy tắc nghiệp vụ

- Trạng thái gói (Sắp bắt đầu / Còn hiệu lực / Sắp hết hạn ≤ 7 ngày / Hết hạn / Đã huỷ) **tính theo ngày**, không lưu cứng.
- Gia hạn để trống ngày bắt đầu → nối tiếp ngay sau gói hiện tại; hai gói không bao giờ chồng nhau (**chặn ở CSDL** bằng `EXCLUDE`).
- Chỉ xếp lịch khi hội viên có gói hiệu lực vào ngày đó; HLV/hội viên không trùng giờ (**chặn ở CSDL**); buổi 15–240 phút, trong cùng một ngày.
- Buổi quá ngày chưa hoàn thành tự chuyển “Vắng” lúc 00:05 hằng ngày và khi khởi động.
- Mỗi ngày một bản ghi cân nặng (ghi lại thì cập nhật); 20–300 kg, mỡ 2–70 %.
- Mỗi hội viên chỉ một giáo án “Đang áp dụng”; tạo giáo án mới tự lưu trữ giáo án cũ.
- Gói đã bán, bài tập đã dùng không xoá cứng (ngừng bán / ẩn); xoá giáo án giữ lại các buổi tập đã gắn.

### Bảo mật

- BCrypt; JWT HS256 stateless, `JWT_SECRET` tối thiểu 32 ký tự (kiểm tra khi khởi động).
- Mỗi request nạp lại user từ CSDL → **khoá tài khoản / đổi vai trò có hiệu lực ngay** với token đã cấp.
- Phân quyền 2 lớp: `@PreAuthorize` theo vai trò + `AccessService` theo phạm vi dữ liệu (HLV chỉ thấy hội viên được phân công, hội viên chỉ thấy dữ liệu của mình). Frontend chặn route theo vai trò nhưng không phải lớp bảo vệ chính.
- Không lộ email tồn tại ở “Quên mật khẩu”; không tự khoá chính mình; luôn còn ít nhất 1 quản lý.
- Lỗi trả JSON thống nhất `{ status, message, fieldErrors }`; vi phạm ràng buộc CSDL → thông báo tiếng Việt.
- Nhật ký ghi trong giao dịch riêng (`REQUIRES_NEW`), giữ được cả thao tác thất bại (VD đăng nhập sai) kèm IP.
- Nginx thêm `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. Bí mật đọc từ `.env` (đã `.gitignore`).
- Chưa gửi email thật: ở chế độ demo (`RESET_EXPOSE_TOKEN=true`) mã khôi phục trả trong response. **Tắt khi triển khai.**

## 5. API

Toàn bộ API có trên Swagger: http://localhost:8080/swagger-ui.html. Mọi endpoint (trừ đăng nhập, quên/đặt lại mật khẩu, `GET /api/plans/public`) cần `Authorization: Bearer <token>`.

| Method | Endpoint | Vai trò | Mô tả |
| --- | --- | --- | --- |
| POST | /api/auth/login | công khai | Đăng nhập |
| POST | /api/auth/register | công khai | Hội viên tự đăng ký (luôn role MEMBER; tắt bằng `REGISTRATION_ENABLED=false`) |
| GET | /api/auth/options | công khai | Trạng thái đăng ký + tài khoản demo đang hoạt động (rỗng khi `DEMO_QUICK_LOGIN=false`) |
| GET, PUT | /api/auth/me | tất cả | Xem / sửa tài khoản |
| POST | /api/auth/change-password | tất cả | Đổi mật khẩu |
| POST | /api/auth/forgot-password, /reset-password | công khai | Quên / đặt lại mật khẩu |
| GET | /api/members?q&status&trainerId&page&size | ADMIN, TRAINER | Tra cứu (HLV tự giới hạn hội viên của mình) |
| GET, PUT | /api/members/me | MEMBER | Hồ sơ của tôi |
| GET | /api/members/{id} | theo phạm vi | Chi tiết + gói + giáo án + số buổi |
| POST, PUT | /api/members, /{id}, /{id}/status, /{id}/trainer | ADMIN | Thêm, sửa, trạng thái, phân công |
| GET, POST | /api/members/{id}/weights | theo phạm vi | Cân nặng (POST = ghi/cập nhật theo ngày) |
| GET | /api/members/{id}/progress | theo phạm vi | BMI, chuyên cần 8 tuần, chuỗi tuần, tổng calo… |
| DELETE | /api/weights/{id} | theo phạm vi | Xoá bản ghi cân nặng |
| GET | /api/trainers, /{id}, /me | tất cả / TRAINER | Danh sách, chi tiết |
| POST, PUT | /api/trainers, /{id}, /{id}/active, /{id}/shifts | ADMIN (HLV sửa của mình) | HLV & ca làm |
| GET | /api/plans/public, /api/plans | công khai / tất cả | Gói tập |
| POST, PUT, DELETE | /api/plans, /{id}, /{id}/active | ADMIN | Quản lý gói |
| GET | /api/subscriptions?state&memberId, /preview | ADMIN | Danh sách, xem trước ngày hiệu lực |
| GET | /api/subscriptions/me, /api/members/{id}/subscriptions | MEMBER / theo phạm vi | Lịch sử gói |
| POST, PUT | /api/subscriptions, /{id}/cancel | ADMIN | Đăng ký / gia hạn, huỷ |
| GET, POST, PUT, DELETE | /api/exercises, /{id}, /{id}/hidden | xem: tất cả; sửa: ADMIN, TRAINER | Thư viện bài tập |
| GET, POST, PUT, DELETE | /api/workout-plans, /{id}, /{id}/status, /me/current | xem theo phạm vi; sửa: ADMIN, TRAINER | Giáo án |
| GET | /api/schedules?from&to&memberId&trainerId | theo phạm vi | Lịch (tối đa 3 tháng/lần) |
| POST, PUT | /api/schedules, /{id}, /{id}/cancel, /{id}/missed | ADMIN, TRAINER | Xếp (lặp tuần), dời, huỷ, đánh vắng |
| POST | /api/schedules/{id}/complete | hội viên của buổi / HLV / ADMIN | Hoàn thành buổi |
| GET | /api/dashboard/admin, /trainer, /member | theo vai trò | Dashboard |
| GET | /api/notifications | tất cả | Thông báo theo vai trò |
| GET | /api/reports/summary?from&to | ADMIN | Báo cáo tổng hợp |
| GET, POST, PUT | /api/users, /{id}/status, /{id}/reset-password | ADMIN | Tài khoản |
| GET | /api/audit-logs, /actions | ADMIN | Nhật ký hệ thống |

## 6. Quy ước Git

Nhánh `main`, `develop`, `feat/<ma-task>-<mo-ta>`, `fix/...`; commit theo Conventional Commits (`feat:`, `fix:`, `docs:`…). Mỗi Pull Request cần ít nhất 1 người review và CI xanh trước khi merge.
