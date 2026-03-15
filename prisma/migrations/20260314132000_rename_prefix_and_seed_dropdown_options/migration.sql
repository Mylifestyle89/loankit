-- Rename existing flat keys to prefixed keys
UPDATE "dropdown_options" SET field_key = 'branch.' || field_key
WHERE field_key IN ('approver_title', 'approver_name', 'appraiser', 'relationship_officer')
  AND field_key NOT LIKE '%.%';

-- Seed: collateral.certificate_name
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.certificate_name', 'Giấy chứng nhận quyền sử dụng đất', 1),
  (gen_random_uuid(), 'collateral.certificate_name', 'Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất', 2),
  (gen_random_uuid(), 'collateral.certificate_name', 'Giấy chứng nhận quyền sở hữu nhà ở và quyền sử dụng đất ở', 3)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.name (Tên TSBĐ)
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.name', 'Quyền sử dụng đất', 1),
  (gen_random_uuid(), 'collateral.name', 'Quyền sử dụng đất và tài sản gắn liền với đất', 2),
  (gen_random_uuid(), 'collateral.name', 'Căn hộ chung cư', 3),
  (gen_random_uuid(), 'collateral.name', 'Tài sản gắn liền với đất', 4)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.house_type (Loại nhà ở)
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.house_type', 'Nhà ở', 1),
  (gen_random_uuid(), 'collateral.house_type', 'Nhà ở riêng lẻ', 2),
  (gen_random_uuid(), 'collateral.house_type', 'Căn hộ chung cư', 3)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.mortgage_name (Tên HĐ thế chấp)
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.mortgage_name', 'Hợp đồng thế chấp quyền sử dụng đất', 1),
  (gen_random_uuid(), 'collateral.mortgage_name', 'Hợp đồng thế chấp quyền sử dụng đất và tài sản gắn liền với đất', 2),
  (gen_random_uuid(), 'collateral.mortgage_name', 'Hợp đồng thế chấp phương tiện giao thông', 3),
  (gen_random_uuid(), 'collateral.mortgage_name', 'Hợp đồng thế chấp tài sản gắn liền với đất', 4)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.land_purpose
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.land_purpose', 'Đất ở tại nông thôn', 1),
  (gen_random_uuid(), 'collateral.land_purpose', 'Đất ở tại đô thị', 2),
  (gen_random_uuid(), 'collateral.land_purpose', 'Đất nông nghiệp', 3),
  (gen_random_uuid(), 'collateral.land_purpose', 'Đất thương mại dịch vụ', 4)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.house_structure
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.house_structure', 'Bê tông cốt thép', 1),
  (gen_random_uuid(), 'collateral.house_structure', 'Bán kiên cố', 2),
  (gen_random_uuid(), 'collateral.house_structure', 'Tạm', 3)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.ownership_form
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.ownership_form', 'Sở hữu riêng', 1),
  (gen_random_uuid(), 'collateral.ownership_form', 'Sở hữu chung', 2)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: credit_agri.debt_group
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'credit_agri.debt_group', 'Nhóm 1 (Đủ tiêu chuẩn)', 1),
  (gen_random_uuid(), 'credit_agri.debt_group', 'Nhóm 2 (Cần chú ý)', 2),
  (gen_random_uuid(), 'credit_agri.debt_group', 'Nhóm 3 (Dưới tiêu chuẩn)', 3),
  (gen_random_uuid(), 'credit_agri.debt_group', 'Nhóm 4 (Nghi ngờ)', 4),
  (gen_random_uuid(), 'credit_agri.debt_group', 'Nhóm 5 (Có khả năng mất vốn)', 5)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: credit_other.debt_group
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'credit_other.debt_group', 'Nhóm 1 (Đủ tiêu chuẩn)', 1),
  (gen_random_uuid(), 'credit_other.debt_group', 'Nhóm 2 (Cần chú ý)', 2),
  (gen_random_uuid(), 'credit_other.debt_group', 'Nhóm 3 (Dưới tiêu chuẩn)', 3),
  (gen_random_uuid(), 'credit_other.debt_group', 'Nhóm 4 (Nghi ngờ)', 4),
  (gen_random_uuid(), 'credit_other.debt_group', 'Nhóm 5 (Có khả năng mất vốn)', 5)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: co_borrower.id_type
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'co_borrower.id_type', 'CCCD', 1),
  (gen_random_uuid(), 'co_borrower.id_type', 'CMND', 2),
  (gen_random_uuid(), 'co_borrower.id_type', 'Hộ chiếu', 3)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: co_borrower.relationship
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'co_borrower.relationship', 'Vợ/Chồng', 1),
  (gen_random_uuid(), 'co_borrower.relationship', 'Cha/Mẹ', 2),
  (gen_random_uuid(), 'co_borrower.relationship', 'Con', 3),
  (gen_random_uuid(), 'co_borrower.relationship', 'Anh/Chị/Em', 4)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.house_level
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.house_level', 'Cấp I', 1),
  (gen_random_uuid(), 'collateral.house_level', 'Cấp II', 2),
  (gen_random_uuid(), 'collateral.house_level', 'Cấp III', 3),
  (gen_random_uuid(), 'collateral.house_level', 'Cấp IV', 4)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.insurance_status
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.insurance_status', 'Đã mua', 1),
  (gen_random_uuid(), 'collateral.insurance_status', 'Chưa mua', 2)
ON CONFLICT (field_key, label) DO NOTHING;
