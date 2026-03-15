-- Seed: collateral.land_type (Loại đất cho multi-land-type rows)
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.land_type', 'Đất ở tại nông thôn', 1),
  (gen_random_uuid(), 'collateral.land_type', 'Đất ở tại đô thị', 2),
  (gen_random_uuid(), 'collateral.land_type', 'Đất trồng cây hàng năm', 3),
  (gen_random_uuid(), 'collateral.land_type', 'Đất trồng cây lâu năm', 4),
  (gen_random_uuid(), 'collateral.land_type', 'Đất nuôi trồng thủy sản', 5),
  (gen_random_uuid(), 'collateral.land_type', 'Đất nông nghiệp', 6),
  (gen_random_uuid(), 'collateral.land_type', 'Đất thương mại dịch vụ', 7),
  (gen_random_uuid(), 'collateral.land_type', 'Đất sản xuất kinh doanh', 8)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.brand (Nhãn hiệu xe phổ biến)
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.brand', 'Toyota', 1),
  (gen_random_uuid(), 'collateral.brand', 'Honda', 2),
  (gen_random_uuid(), 'collateral.brand', 'Hyundai', 3),
  (gen_random_uuid(), 'collateral.brand', 'KIA', 4),
  (gen_random_uuid(), 'collateral.brand', 'Mazda', 5),
  (gen_random_uuid(), 'collateral.brand', 'Ford', 6),
  (gen_random_uuid(), 'collateral.brand', 'Mitsubishi', 7),
  (gen_random_uuid(), 'collateral.brand', 'VinFast', 8)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.color (Màu sơn phổ biến)
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.color', 'Trắng', 1),
  (gen_random_uuid(), 'collateral.color', 'Đen', 2),
  (gen_random_uuid(), 'collateral.color', 'Bạc', 3),
  (gen_random_uuid(), 'collateral.color', 'Xám', 4),
  (gen_random_uuid(), 'collateral.color', 'Đỏ', 5),
  (gen_random_uuid(), 'collateral.color', 'Xanh', 6)
ON CONFLICT (field_key, label) DO NOTHING;

-- Seed: collateral.owner_id_type (Loại giấy tờ chủ sở hữu)
INSERT INTO "dropdown_options" (id, field_key, label, sort_order) VALUES
  (gen_random_uuid(), 'collateral.owner_id_type', 'CCCD', 1),
  (gen_random_uuid(), 'collateral.owner_id_type', 'CMND', 2),
  (gen_random_uuid(), 'collateral.owner_id_type', 'Hộ chiếu', 3)
ON CONFLICT (field_key, label) DO NOTHING;
