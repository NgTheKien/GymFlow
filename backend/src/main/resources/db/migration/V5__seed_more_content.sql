-- =====================================================================
-- GymFlow – V5: bổ sung bài tập và bài kiến thức (đều ở trạng thái CHỜ DUYỆT)
--
-- Cùng quy tắc với V3:
--  * Văn bản tiếng Việt do nhóm tự biên soạn lại từ trang NHS (Open Government Licence v3.0),
--    content_origin = 'ADAPTED'; không ghi là "của NHS", giao diện hiện câu ghi công OGL và link gốc.
--  * Số lần, thời gian giữ, định lượng chỉ lấy từ trang nguồn đã đối chiếu ngày 2026-10-30.
--    Trang không ghi số thì suggested_dose = NULL (giao diện hiện "Chưa có dữ liệu").
--  * Không ảnh, không video, không sao chép nguyên văn.
--  * Chạy lại an toàn trên CSDL đã có dữ liệu: trùng mã nguồn / tên bài / slug thì giữ bản cũ,
--    chỉ điền các cột đang NULL; không ghi đè nội dung HLV hay ADMIN đã sửa.
-- =====================================================================

INSERT INTO content_sources (code, publisher, title, url, license, license_url, license_verified, attribution, publisher_reviewed, accessed_at)
VALUES
    ('NHS_KNEE_RUN', 'NHS (nhs.uk)', 'Knee exercises for runners', 'https://www.nhs.uk/live-well/exercise/knee-exercises-for-runners/',
     'Open Government Licence v3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', TRUE,
     'Contains public sector information licensed under the Open Government Licence v3.0.', '2024-09-20', '2026-10-30'),
    ('NHS_RUN_INJURY', 'NHS (nhs.uk)', 'Knee pain and other running injuries', 'https://www.nhs.uk/live-well/exercise/knee-pain-and-other-running-injuries/',
     'Open Government Licence v3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', TRUE,
     'Contains public sector information licensed under the Open Government Licence v3.0.', '2022-11-25', '2026-10-30'),
    ('NHS_STARCHY', 'NHS (nhs.uk)', 'Starchy foods and carbohydrates', 'https://www.nhs.uk/live-well/eat-well/food-types/starchy-foods-and-carbohydrates/',
     'Open Government Licence v3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', TRUE,
     'Contains public sector information licensed under the Open Government Licence v3.0.', '2023-03-15', '2026-10-30'),
    ('NHS_FAT', 'NHS (nhs.uk)', 'Fat: the facts', 'https://www.nhs.uk/live-well/eat-well/food-types/different-fats-nutrition/',
     'Open Government Licence v3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', TRUE,
     'Contains public sector information licensed under the Open Government Licence v3.0.', '2023-04-14', '2026-10-30'),
    ('NHS_MEAT', 'NHS (nhs.uk)', 'Meat in your diet', 'https://www.nhs.uk/live-well/eat-well/food-types/meat-nutrition/',
     'Open Government Licence v3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', TRUE,
     'Contains public sector information licensed under the Open Government Licence v3.0.', '2024-05-01', '2026-10-30')
AS n
ON DUPLICATE KEY UPDATE code = content_sources.code;

SET @safe = 'Dừng tập ngay nếu thấy đau, chóng mặt, khó thở bất thường hoặc không khoẻ. Người có bệnh lý, chấn thương, mới phẫu thuật, đang mang thai hoặc mới sinh nên hỏi ý kiến nhân viên y tế trước khi tập.';
SET @knee = 'Không được thấy đau khi tập; nếu đau hãy dừng ngay và đi khám. Không phù hợp với người đang có chấn thương gối.';

INSERT INTO exercises (name, name_en, aliases, muscle_group, secondary_muscles, equipment, level, location, goals,
                       description, instructions, breathing, common_mistakes, safety_notes, variations, suggested_dose,
                       content_origin, review_status)
VALUES
-- ---------------- Giãn cơ – biên soạn lại từ NHS Flexibility / Sitting exercises ----------------
-- Danh mục nhóm cơ không có "cổ" → xếp vào SHOULDERS, ghi rõ "Cổ" ở nhóm cơ phụ.
('Xoay cổ', 'Neck rotation', NULL, 'SHOULDERS', 'Cổ', 'Ghế', 'BEGINNER', 'ANY', 'MOBILITY',
 'Bài xoay đầu chậm giúp cổ linh hoạt hơn, tập được khi ngồi làm việc.',
 '1. Ngồi thẳng, hạ vai xuống, mắt nhìn thẳng.\n2. Từ từ quay đầu về phía vai trái trong biên độ thoải mái, giữ 5 giây rồi về giữa.\n3. Làm tương tự bên phải.',
 'Thở chậm và đều trong lúc giữ.',
 'Quay giật hoặc quá biên độ thoải mái; nhún vai lên tai.',
 @safe,
 NULL,
 'Mỗi bên 3 lần.', 'ADAPTED', 'PENDING'),
('Giãn cổ nghiêng', 'Neck stretch', NULL, 'SHOULDERS', 'Cổ', 'Ghế', 'BEGINNER', 'ANY', 'MOBILITY',
 'Bài giãn nhẹ cho các cơ cổ bị căng.',
 '1. Ngồi thẳng, mắt nhìn trước, tay phải giữ vai trái hạ xuống.\n2. Từ từ nghiêng đầu sang phải, vai trái vẫn được giữ.\n3. Đổi bên.',
 'Thở chậm và đều trong lúc giữ.',
 'Kéo đầu bằng tay; để vai bên đang giãn nhô lên.',
 @safe,
 NULL,
 'Giữ 5 giây, mỗi bên 3 lần.', 'ADAPTED', 'PENDING'),
('Nghiêng người sang bên', 'Sideways bend', NULL, 'CORE', 'Hông, lưng dưới', 'Không', 'BEGINNER', 'ANY', 'MOBILITY',
 'Bài nghiêng thân ở tư thế đứng, giúp lưng dưới linh hoạt trở lại.',
 '1. Đứng thẳng, hai chân rộng bằng hông, tay thả dọc thân.\n2. Trượt tay trái dọc theo thân xuống thấp trong biên độ thoải mái; hông bên đối diện sẽ thấy căng.\n3. Về giữa rồi làm với tay phải.',
 'Thở ra khi nghiêng, hít vào khi về giữa.',
 'Đổ người về trước hoặc ra sau thay vì nghiêng sang bên; nhún nảy.',
 @safe,
 NULL,
 'Giữ 2 giây, mỗi bên 3 lần.', 'ADAPTED', 'PENDING'),
('Giãn cổ chân khi ngồi', 'Seated ankle stretch', NULL, 'LEGS', 'Bắp chân', 'Ghế', 'BEGINNER', 'HOME', 'MOBILITY',
 'Bài gập duỗi cổ chân khi ngồi, giúp cổ chân linh hoạt và giảm nguy cơ hình thành cục máu đông khi ngồi lâu.',
 '1. Ngồi thẳng, tay nắm hai bên ghế, duỗi thẳng chân trái và nhấc bàn chân khỏi sàn.\n2. Giữ chân thẳng, duỗi mũi chân ra xa.\n3. Gập mũi chân về phía người.\n4. Đổi chân.',
 'Thở đều.',
 'Gập gối chân đang nâng; làm nhanh, giật cổ chân.',
 CONCAT('Chọn ghế chắc, không bánh xe, không tay vịn. ', @safe),
 NULL,
 'Thử 2 hiệp, mỗi hiệp 5 lần mỗi chân.', 'ADAPTED', 'PENDING'),

-- ---------------- Tăng sức mạnh quanh gối – biên soạn lại từ NHS Knee exercises for runners ----------------
('Squat tựa tường', 'Wall squat', 'Wall sit', 'LEGS', 'Mông', 'Tường', 'BEGINNER', 'ANY', 'STRENGTH',
 'Bài squat có tường đỡ lưng, tăng sức mạnh các cơ quanh gối; dùng khi khởi động trước chạy hoặc thả lỏng sau chạy.',
 '1. Đứng cách tường khoảng một bàn chân, lưng áp vào tường, hai gối rộng bằng hông, mũi chân hơi mở ra ngoài.\n2. Gập gối chậm để lưng trượt xuống theo tường; gối không vượt quá mũi chân và cùng hướng với mũi chân.\n3. Khi đứng lên, chủ động siết cơ phía trên gối và cơ mông.',
 'Hít vào khi trượt xuống, thở ra khi đứng lên.',
 'Gối vượt quá mũi chân; gối sụp vào trong; trượt xuống quá nhanh.',
 CONCAT(@knee, ' ', @safe),
 'Đặt bóng tập giữa lưng và tường để trượt êm hơn.',
 NULL, 'ADAPTED', 'PENDING'),
('Siết cơ đùi khi ngồi', 'Seated thigh contraction', NULL, 'LEGS', NULL, 'Ghế', 'BEGINNER', 'ANY', 'STRENGTH',
 'Bài siết tĩnh cơ đùi trước, giúp các cơ đỡ khớp gối khoẻ hơn.',
 '1. Ngồi thẳng trên ghế.\n2. Từ từ duỗi và nâng chân phải tới khi thẳng, mũi chân hơi mở ra ngoài.\n3. Siết cơ đùi phải và giữ 5 giây; luôn giữ căng cơ phía trên gối.\n4. Đổi chân.',
 'Thở đều, không nín thở khi giữ.',
 'Thả lỏng cơ đùi khi đang giữ; ngả người ra sau.',
 CONCAT(@knee, ' ', @safe),
 'Đeo tạ cổ chân để khó hơn.',
 'Mỗi chân 10 lần, mỗi lần giữ 5 giây.', 'ADAPTED', 'PENDING'),
('Giãn đùi sau khi ngồi kết hợp siết đùi', 'Seated hamstring stretch with thigh contraction', NULL, 'LEGS', NULL, 'Ghế', 'BEGINNER', 'ANY', 'MOBILITY,STRENGTH',
 'Bài giãn đùi sau đồng thời siết cơ đùi trước, tập ngay trên ghế.',
 '1. Ngồi ở mép ghế, gập chân phải, duỗi thẳng chân trái, gót trái chạm sàn, mũi chân hơi mở ra ngoài.\n2. Giữ lưng thẳng, gập người từ hông về phía chân trái để giãn đùi sau, đồng thời siết cơ phía trên gối.\n3. Đổi chân.',
 'Thở chậm và đều trong lúc giữ.',
 'Cong lưng để với xa hơn; gập từ thắt lưng thay vì từ hông.',
 CONCAT(@knee, ' ', @safe),
 NULL,
 '3 hiệp, mỗi hiệp giữ 15 giây cho mỗi chân.', 'ADAPTED', 'PENDING'),
('Squat tay không', 'Bodyweight squat', 'Air squat', 'LEGS', 'Mông, cơ lõi', 'Không', 'BEGINNER', 'ANY', 'STRENGTH',
 'Bài squat không tạ, tăng sức mạnh các cơ quanh gối và chuẩn bị nền tảng cho squat có tạ.',
 '1. Đứng hai chân rộng bằng vai, mũi chân hơi mở ra ngoài, tay để dọc thân hoặc duỗi ra trước để giữ thăng bằng.\n2. Hạ người như sắp ngồi xuống ghế, gập gối không quá góc vuông.\n3. Giữ lưng thẳng, gối không vượt quá mũi chân; đứng lên về tư thế ban đầu.',
 'Hít vào khi hạ người, thở ra khi đứng lên.',
 'Gập gối sâu quá góc vuông khi chưa quen; cong lưng; nhấc gót.',
 CONCAT(@knee, ' ', @safe),
 'Squat nông có ghế vịn (dễ hơn); Back Squat khi đã vững kỹ thuật.',
 NULL, 'ADAPTED', 'PENDING'),
('Chùng chân tại chỗ', 'Static lunge', 'Split squat', 'LEGS', 'Mông, cơ lõi', 'Không', 'BEGINNER', 'ANY', 'STRENGTH,BALANCE',
 'Bài chùng chân giữ nguyên vị trí hai bàn chân, tập từng chân và khả năng giữ thăng bằng.',
 '1. Đứng tư thế chân trước chân sau: chân phải phía trước, chân trái phía sau.\n2. Từ từ gập hai gối để hạ người tới khi chân phải gần vuông góc.\n3. Dồn trọng lượng vào gót chân, đẩy người về tư thế ban đầu; lưng thẳng, gối không vượt quá mũi chân.\n4. Đổi chân.',
 'Hít vào khi hạ người, thở ra khi đẩy lên.',
 'Gối trước vượt quá mũi chân; thân đổ về trước; dồn trọng lượng lên mũi chân.',
 CONCAT(@knee, ' ', @safe),
 'Walking Lunge khi đã giữ thăng bằng tốt.',
 '3 hiệp, mỗi hiệp 5 lần mỗi chân.', 'ADAPTED', 'PENDING')
AS n
ON DUPLICATE KEY UPDATE
    name_en           = COALESCE(exercises.name_en, n.name_en),
    aliases           = COALESCE(exercises.aliases, n.aliases),
    secondary_muscles = COALESCE(exercises.secondary_muscles, n.secondary_muscles),
    location          = COALESCE(exercises.location, n.location),
    goals             = COALESCE(exercises.goals, n.goals),
    breathing         = COALESCE(exercises.breathing, n.breathing),
    common_mistakes   = COALESCE(exercises.common_mistakes, n.common_mistakes),
    safety_notes      = COALESCE(exercises.safety_notes, n.safety_notes),
    variations        = COALESCE(exercises.variations, n.variations),
    suggested_dose    = COALESCE(exercises.suggested_dose, n.suggested_dose);

-- ---------------- Gắn nguồn ----------------
INSERT IGNORE INTO exercise_sources (exercise_id, source_id)
SELECT e.id, s.id FROM exercises e JOIN content_sources s ON s.code IN ('NHS_FLEX', 'NHS_SITTING')
WHERE e.name = 'Xoay cổ';

INSERT IGNORE INTO exercise_sources (exercise_id, source_id)
SELECT e.id, s.id FROM exercises e JOIN content_sources s ON s.code = 'NHS_FLEX'
WHERE e.name IN ('Giãn cổ nghiêng', 'Nghiêng người sang bên');

INSERT IGNORE INTO exercise_sources (exercise_id, source_id)
SELECT e.id, s.id FROM exercises e JOIN content_sources s ON s.code = 'NHS_SITTING'
WHERE e.name = 'Giãn cổ chân khi ngồi';

INSERT IGNORE INTO exercise_sources (exercise_id, source_id)
SELECT e.id, s.id FROM exercises e JOIN content_sources s ON s.code = 'NHS_KNEE_RUN'
WHERE e.name IN ('Squat tựa tường', 'Siết cơ đùi khi ngồi', 'Giãn đùi sau khi ngồi kết hợp siết đùi',
                 'Squat tay không', 'Chùng chân tại chỗ');

-- =====================================================================
-- Kho kiến thức: 4 bài, trạng thái PENDING (ADMIN duyệt mới hiện công khai)
-- =====================================================================
INSERT INTO articles (slug, title, category, summary, body, content_origin, status, review_note)
VALUES
('tinh-bot-va-chat-xo', 'Tinh bột và chất xơ: chọn sao cho đúng', 'NUTRITION',
 'Vì sao tinh bột là nguồn năng lượng chính, nên ưu tiên loại nào và cách bảo quản cơm nguội an toàn.',
 '## Tinh bột chiếm bao nhiêu\nTheo Eatwell Guide của Anh, thực phẩm giàu tinh bột như khoai, bánh mì, cơm, mì, ngũ cốc nên chiếm hơn một phần ba lượng thức ăn, và nên có mặt mỗi ngày.\n\n## Vì sao cần\n- Là nguồn năng lượng tốt, đồng thời cung cấp chất xơ, canxi, sắt và vitamin nhóm B.\n- Tính theo gam, tinh bột cung cấp chưa tới một nửa năng lượng so với chất béo. Thứ làm món tinh bột "béo" thường là dầu, bơ thêm vào khi nấu và ăn.\n\n## Ưu tiên loại nhiều chất xơ\n- Chọn gạo lứt, bánh mì nguyên cám, mì nguyên hạt, yến mạch; ăn khoai cả vỏ khi có thể.\n- Chất xơ giúp ruột hoạt động tốt và giúp no lâu hơn, nên hữu ích khi muốn kiểm soát cân nặng.\n- Luộc, hấp, nướng khoai với ít dầu tốt hơn chiên.\n\n## Cơm nguội: bảo quản đúng cách\n- Nếu chưa ăn ngay, làm nguội và cho vào tủ lạnh trong vòng 1 giờ, ăn trong vòng 24 giờ.\n- Hâm thật nóng đều, chỉ hâm một lần.\n- Bỏ cơm, ngũ cốc đã để ở nhiệt độ phòng qua đêm.\n\n## Lưu ý\nGymFlow không tính khẩu phần. Người nghi dị ứng hoặc không dung nạp lúa mì nên hỏi bác sĩ thay vì tự cắt bỏ hẳn một nhóm thực phẩm.',
 'ADAPTED', 'PENDING', 'Trang nguồn ghi hạn rà soát tiếp theo 15/03/2026 (đã quá hạn khi nhóm truy cập) – người duyệt cần mở lại trang gốc để đối chiếu.'),
('chat-beo-nen-chon', 'Chất béo: loại nào nên hạn chế, loại nào nên chọn', 'NUTRITION',
 'Phân biệt chất béo bão hoà, chất béo chuyển hoá và chất béo không bão hoà, kèm mức giới hạn khuyến nghị tại Anh.',
 '## Cơ thể vẫn cần một ít chất béo\nChất béo cung cấp axit béo thiết yếu mà cơ thể không tự tạo được, và giúp hấp thu vitamin A, D, E. Nhưng mọi loại chất béo đều nhiều năng lượng: 1 g chất béo cho 9 kcal, trong khi 1 g tinh bột hoặc đạm cho 4 kcal.\n\n## Chất béo bão hoà: nên giảm\n- Có nhiều trong thịt mỡ, xúc xích, bơ, mỡ lợn, phô mai cứng, kem, bánh quy, bánh ngọt, dầu cọ, dầu và nước cốt dừa.\n- Ăn nhiều có thể làm tăng cholesterol "xấu" (LDL), tăng nguy cơ bệnh tim và đột quỵ.\n- Khuyến nghị tại Anh: nam không quá 30 g, nữ không quá 20 g chất béo bão hoà mỗi ngày; trẻ em cần ít hơn.\n\n## Chất béo chuyển hoá (trans): giữ ở mức thấp\nCó tự nhiên ở mức thấp trong thịt, sữa và trong dầu thực vật hydro hoá một phần. Người lớn không nên quá khoảng 5 g mỗi ngày.\n\n## Chất béo không bão hoà: thay thế một phần\n- Không bão hoà đơn: dầu ô liu, dầu hạt cải, quả bơ, hạnh nhân, lạc.\n- Không bão hoà đa: omega-6 trong dầu ngô, dầu hướng dương, óc chó; omega-3 trong cá béo như cá trích, cá mòi, cá hồi, cá thu.\n- Nên ăn ít nhất 2 phần cá mỗi tuần, trong đó 1 phần là cá béo.\n\n## Đọc nhãn thực phẩm (mỗi 100 g)\n- Nhiều chất béo: trên 17,5 g. Ít chất béo: từ 3 g trở xuống.\n- Nhiều chất béo bão hoà: trên 5 g. Ít chất béo bão hoà: từ 1,5 g trở xuống.\n- Nhãn "ít béo hơn" chỉ có nghĩa là ít hơn sản phẩm tương tự ít nhất 30%, chưa chắc đã ít năng lượng.',
 'ADAPTED', 'PENDING', 'Trang nguồn ghi hạn rà soát tiếp theo 14/04/2026 (đã quá hạn khi nhóm truy cập) – người duyệt cần mở lại trang gốc để đối chiếu.'),
('dam-tu-thit-va-thuc-pham-khac', 'Nguồn đạm: ăn thịt thế nào cho hợp lý', 'NUTRITION',
 'Đạm có thể đến từ thịt, cá, trứng, đậu đỗ; nên hạn chế thịt đỏ và thịt chế biến sẵn, chọn phần nạc và nấu ít dầu mỡ.',
 '## Nhiều nguồn đạm\nMột chế độ ăn cân bằng có thể lấy đạm từ thịt, cá, trứng hoặc các nguồn không phải động vật như đậu, đỗ. Thịt gà, lợn, cừu, bò đều giàu đạm; thịt đỏ còn cung cấp sắt, kẽm và vitamin nhóm B, và thịt là một trong những nguồn vitamin B12 chính.\n\n## Hạn chế thịt đỏ và thịt chế biến sẵn\n- Ăn quá nhiều thịt đỏ và thịt chế biến sẵn có thể làm tăng nguy cơ ung thư đại trực tràng; thịt chế biến sẵn còn thường nhiều muối.\n- Nếu đang ăn hơn 90 g (khối lượng đã nấu) thịt đỏ hoặc thịt chế biến mỗi ngày, nên giảm xuống còn 70 g. Hôm nào ăn nhiều thì các hôm sau ăn ít lại để trung bình không quá 70 g mỗi ngày.\n- Thịt chế biến sẵn gồm xúc xích, thịt xông khói, giăm bông, salami, thịt hộp, pa-tê.\n\n## Chọn và nấu lành mạnh hơn\n- Chọn phần nạc; thấy càng nhiều phần trắng thì càng nhiều mỡ.\n- Bỏ da gà, da gà tây; cắt mỡ thấy được trước khi nấu.\n- Nướng vỉ thay vì chiên; không thêm dầu mỡ khi không cần.\n- Giảm bớt thịt trong món hầm, cà ri, thay một phần bằng rau, đậu đỗ, tinh bột.\n\n## An toàn thực phẩm\nKhông rửa thịt sống vì nước bắn ra làm vi khuẩn lan sang bề mặt khác. Gia cầm, thịt lợn, nội tạng, thịt xay, xúc xích phải nấu chín hẳn bên trong.\n\n## Lưu ý\nGymFlow không đưa ra lượng đạm cá nhân hoá theo cân nặng. Người có nhu cầu đặc biệt hoặc đang mang thai nên hỏi chuyên gia dinh dưỡng; người mang thai cần tránh gan và các sản phẩm từ gan.',
 'ADAPTED', 'PENDING', NULL),
('phong-chan-thuong-khi-chay', 'Phòng và xử lý chấn thương thường gặp khi chạy', 'RECOVERY',
 'Năm chấn thương hay gặp ở người chạy bộ, dấu hiệu nhận biết, cách xử lý ban đầu, khi nào cần đi khám và cách phòng tránh.',
 '## Nguyên tắc chung\nHãy lắng nghe cơ thể: không chạy khi đang đau, chỉ chạy lại khi đã hồi phục đủ. Bài viết không dùng để chẩn đoán.\n\n## Năm chấn thương thường gặp\n- Đau gối: đau ở trước, quanh hoặc sau xương bánh chè. Chườm đá bọc khăn ẩm tối đa 20 phút, vài lần mỗi ngày. Đau dữ dội hoặc sưng thì đi khám ngay; đau nhẹ mà sau 1 tuần không hết thì gặp bác sĩ hoặc chuyên viên vật lý trị liệu.\n- Đau gân gót (Achilles): đau, sưng ở sau cổ chân hoặc gót, có thể nặng hơn vào buổi sáng. Đi khám nếu sau 2–3 tuần không hết; đau nhói đột ngột có thể là đứt gân, cần khám ngay.\n- Đau ống quyển: đau âm ỉ phía trước cẳng chân. Chườm đá bọc khăn trong vài ngày đầu, nghỉ vài tuần rồi mới chạy lại từ từ.\n- Đau gót, lòng bàn chân: thường do tăng quãng chạy đột ngột, chạy dốc hoặc giày mòn, không đỡ chân. Lăn chai nước đá dưới lòng bàn chân khoảng 15–20 phút.\n- Căng cơ đùi sau hoặc bắp chân: đau đột ngột như bị đá vào. Dừng chạy ngay, chườm đá tối đa 20 phút vài lần mỗi ngày, kê cao chân.\n\nLuôn bọc đá trong khăn, không đặt đá trực tiếp lên da.\n\n## Phòng tránh\n- Giày: nên được tư vấn chọn giày ở cửa hàng chạy bộ; giày phù hợp cho người mới không nhất thiết phải đắt.\n- Khởi động 5–10 phút bằng đi bộ nhanh hoặc chạy nhẹ; thả lỏng 5–10 phút bằng chạy chậm hoặc đi bộ.\n- Tăng từ từ: chạy một bài tương tự ít nhất 3–4 lần rồi mới tăng tốc độ hoặc quãng đường.\n- Tập thêm các bài tăng sức mạnh quanh gối như Squat tựa tường, Chùng chân tại chỗ trong thư viện bài tập.',
 'ADAPTED', 'PENDING', 'Trang nguồn ghi hạn rà soát tiếp theo 25/11/2025 (đã quá hạn khi nhóm truy cập) – người duyệt cần mở lại trang gốc để đối chiếu.')
AS n
ON DUPLICATE KEY UPDATE slug = articles.slug;

INSERT IGNORE INTO article_sources (article_id, source_id)
SELECT a.id, s.id FROM articles a JOIN content_sources s ON
    (a.slug = 'tinh-bot-va-chat-xo' AND s.code IN ('NHS_STARCHY', 'NHS_EATWELL'))
 OR (a.slug = 'chat-beo-nen-chon' AND s.code = 'NHS_FAT')
 OR (a.slug = 'dam-tu-thit-va-thuc-pham-khac' AND s.code IN ('NHS_MEAT', 'NHS_EATWELL'))
 OR (a.slug = 'phong-chan-thuong-khi-chay' AND s.code IN ('NHS_RUN_INJURY', 'NHS_KNEE_RUN'));
