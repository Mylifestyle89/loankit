/**
 * XLSX template: "Dựng nhà kính trồng hoa Cát tường" (trung dài hạn)
 *
 * Tab 1: Chi phí - Doanh thu (user edits) — bảng chi tiết đầy đủ
 * Tab 2: Thông tin vay (user edits) — meta, nhà kính, Agribank/TCTD
 * Tab 3: Bảng trả nợ (formulas) — preview 10 năm
 * Tab 4: Data (formulas → parser reads) — Type A flat Row1=headers, Row2=values
 *
 * Run: node scripts/create-nha-kinh-template.js
 */
const XLSX = require("xlsx");
const TV = (c) => "'Thông tin vay'!" + c;
const CP = (c) => "'Chi phí - Doanh thu'!" + c;

// ══════════════════════════════════════════════════════════════════
// Tab 1: Chi phí - Doanh thu (user edits here)
// ══════════════════════════════════════════════════════════════════
// Col: A=STT, B=Khoản mục, C=ĐVT, D=Đơn giá, E=SL/sào (định mức), F=SL thực tế, G=Thành tiền
const cpRows = [
  ["PHƯƠNG ÁN DỰNG NHÀ KÍNH TRỒNG HOA CÁT TƯỜNG", "", "", "", "", "", ""],
  ["Định mức trên 1 sào (1,000 m2). Nhập số sào vào ô B3 để tự nhân diện tích.", "", "", "", "", "", ""],
  ["Số sào đất:", 10, "", "", "", "", ""],
  // Row 4 (idx 3): headers
  ["STT", "KHOẢN MỤC", "Đơn vị tính", "Đơn giá", "SL/sào (định mức)", "Số lượng thực tế", "Thành tiền"],
  // Row 5 (idx 4): Tổng chi phí
  ["I", "TỔNG CHI PHÍ", "", "", "", "", null],
  // Cost items (rows 6-18): Col E = định mức/sào, F = auto, G = auto
  [1, "Xử lý đất", "m2", 16000, 1000, null, null],
  [2, "Cây giống", "cây", 2200, 35000, null, null],
  [3, "Phân hữu cơ", "m3", 1500000, 15, null, null],
  [4, "Phân vô cơ", "", 0, 0, null, null],
  ["-", "Đạm", "kg", 18000, 67, null, null],
  ["-", "Lân", "kg", 4000, 225, null, null],
  ["-", "KaLi", "kg", 18000, 74, null, null],
  ["-", "Phân vi sinh", "kg", 10000, 300, null, null],
  ["-", "NPK", "kg", 20000, 40, null, null],
  [5, "Vôi", "kg", 2000, 100, null, null],
  [6, "Thuốc BVTV", "lít", 1500000, 18, null, null],
  [7, "Chi phí tưới", "giờ", 70000, 100, null, null],
  [8, "Công lao động", "công", 300000, 100, null, null],
  // Row 19-20: empty rows for user
  [9, "", "", 0, 0, null, null],
  [10, "", "", 0, 0, null, null],
  // Row 21: Cộng CPTT
  ["", "CỘNG CHI PHÍ TRỰC TIẾP", "", "", "", "", null],
  // Row 22: Khấu hao nhà kính
  ["", "Khấu hao nhà kính", "", "", "", "", null],
  // Row 23: Lãi vay NH
  ["", "Lãi vay NH", "đ", null, null, null, null],
  // Row 24: Chi phí gián tiếp
  ["", "CHI PHÍ GIÁN TIẾP", "", "", "", "", null],
  // Row 25: empty
  ["", "", "", "", "", "", ""],
  // Row 26: Thu nhập header
  ["II", "THU NHẬP", "", "", "", "", null],
  // Row 27: Sản lượng (định mức/sào, auto scale)
  [1, "Sản lượng", "kg", "", 4000, null, ""],
  // Row 28: Giá bán
  [2, "Giá bán", "đ/kg", 70000, "", "", null],
  // Row 29: empty
  ["", "", "", "", "", "", ""],
  // Row 30: Lãi/Lỗ
  ["III", "LÃI (+) / LỖ (-)", "đ", "", "", "", null],
];

const ws1 = XLSX.utils.aoa_to_sheet(cpRows);
ws1["!cols"] = [{wch:5}, {wch:28}, {wch:10}, {wch:14}, {wch:16}, {wch:16}, {wch:18}];

// Formulas: F = E × $B$3 (số sào), G = D × F
for (let r = 6; r <= 20; r++) {
  ws1["F" + r] = { t: "n", f: "E" + r + "*$B$3" };
  ws1["G" + r] = { t: "n", f: "D" + r + "*F" + r };
}
// Cộng CPTT (G21)
ws1["G21"] = { t: "n", f: "SUM(G6:G20)" };
// Khấu hao nhà kính (G22) = đơn giá × số sào / số năm KH
ws1["G22"] = { t: "n", f: "IF(" + TV("B11") + ">0," + TV("B8") + "*$B$3/" + TV("B11") + ",0)" };
// Lãi vay (D23=rate, E23=loan, G23=lãi)
ws1["D23"] = { t: "n", f: TV("B6") + "/100" };
ws1["F23"] = { t: "n", f: TV("B5") };
ws1["G23"] = { t: "n", f: "D23*F23*" + TV("B7") + "/12" };
// Chi phí gián tiếp (G24)
ws1["G24"] = { t: "n", f: "G22+G23" };
// Tổng chi phí (G5)
ws1["G5"] = { t: "n", f: "G21+G24" };
// Sản lượng: F27 = E27 × $B$3 (scale theo sào)
ws1["F27"] = { t: "n", f: "E27*$B$3" };
// Doanh thu (G26) = SL thực tế × giá bán
ws1["G28"] = { t: "n", f: "F27*D28" };
ws1["G26"] = { t: "n", f: "G28" };
// Lãi/Lỗ (G30)
ws1["G30"] = { t: "n", f: "G26-G5" };

// ══════════════════════════════════════════════════════════════════
// Tab 2: Thông tin vay (user edits here)
// ══════════════════════════════════════════════════════════════════
const tvRows = [
  ["THÔNG TIN VAY VỐN", "", ""],
  ["Nhập giá trị vào cột B", "", ""],
  ["", "", ""],
  // ── Vay ──
  ["Trường thông tin", "Giá trị", "Ghi chú"],
  ["Số tiền vay", 2000000000, "VNĐ"],                     // B5
  ["Lãi suất vay", 9.8, "%/năm"],                          // B6
  ["Thời hạn vay", 36, "tháng"],                            // B7
  // ── Nhà kính ──
  ["Đơn giá nhà kính/sào", 270000000, "VNĐ/sào"],         // B8
  ["Số sào đất", null, "sào (= tab Chi phí ô B3)"],          // B9 → linked
  ["Thành tiền nhà kính", null, "= Đơn giá × Số sào"],    // B10
  ["Số năm khấu hao", 8, "năm"],                           // B11
  ["Khấu hao/năm", null, "= Thành tiền / Số năm KH"],    // B12
  ["Lãi suất ưu đãi", 7.5, "%/năm (năm đầu)"],           // B13
  ["", "", ""],
  // ── Tóm tắt (auto) ──
  ["TÓM TẮT TÀI CHÍNH", "", ""],                           // row 15
  ["Tổng nhu cầu vốn", null, "= Thành tiền nhà kính"],    // B16
  ["Vốn đối ứng", null, "= TNcV - Số tiền vay"],          // B17
  ["Tỷ lệ vốn đối ứng", null, "%"],                        // B18
  ["Mục đích vay", "Dựng nhà kính trồng hoa Cát tường", ""], // B19
  ["Tổng doanh thu dự kiến", null, "từ tab Chi phí"],     // B20
  ["Tổng chi phí dự kiến", null, "từ tab Chi phí"],       // B21
  ["Lợi nhuận dự kiến", null, ""],                         // B22
  ["Thu nhập để trả nợ", null, "= LN + Khấu hao"],        // B23
  ["Số gốc phải trả/năm", null, ""],                       // B24
  ["TN còn lại sau khi trả nợ", null, ""],                 // B25
  ["", "", ""],
  // ── HĐ thi công ──
  ["HỢP ĐỒNG THI CÔNG", "", ""],
  ["Số HĐ thi công", "", "Nhập số hợp đồng"],             // B28
  ["Ngày HĐ thi công", "", "DD/MM/YYYY"],                  // B29
  ["Địa chỉ đất NN", "", ""],                               // B30
  ["", "", ""],
  // ── Dư nợ Agribank ──
  ["DƯ NỢ TẠI AGRIBANK", "", ""],
  ["Chi nhánh", "", ""],                                     // B33
  ["Dư nợ ngắn hạn", "", "VNĐ"],                           // B34
  ["Dư nợ trung dài hạn", "", "VNĐ"],                      // B35
  ["Mục đích ngắn hạn", "", ""],                            // B36
  ["Mục đích trung dài hạn", "", ""],                       // B37
  ["Nguồn trả nợ", "", ""],                                 // B38
  ["", "", ""],
  // ── Dư nợ TCTD khác ──
  ["DƯ NỢ TẠI TCTD KHÁC", "", ""],
  ["Tên TCTD", "", ""],                                     // B41
  ["Dư nợ ngắn hạn", "", "VNĐ"],                           // B42
  ["Dư nợ trung dài hạn", "", "VNĐ"],                      // B43
  ["Mục đích ngắn hạn", "", ""],                            // B44
  ["Mục đích trung dài hạn", "", ""],                       // B45
  ["Nguồn trả nợ", "", ""],                                 // B46
];

const ws2 = XLSX.utils.aoa_to_sheet(tvRows);
ws2["!cols"] = [{wch:26}, {wch:24}, {wch:30}];

// Formulas
ws2["B9"]  = { t: "n", f: CP("B3") };                       // Số sào → from Chi phí B3
ws2["B10"] = { t: "n", f: "B8*B9" };                       // Thành tiền nhà kính
ws2["B12"] = { t: "n", f: "IF(B11>0,B10/B11,0)" };        // Khấu hao/năm
ws2["B16"] = { t: "n", f: "B10" };                          // Tổng nhu cầu vốn
ws2["B17"] = { t: "n", f: "B16-B5" };                       // Vốn đối ứng
ws2["B18"] = { t: "n", f: "IF(B16>0,B17/B16,0)" };         // Tỷ lệ
ws2["B20"] = { t: "n", f: CP("G26") };                      // Tổng doanh thu
ws2["B21"] = { t: "n", f: CP("G5") };                       // Tổng chi phí
ws2["B22"] = { t: "n", f: CP("G30") };                      // Lợi nhuận
ws2["B23"] = { t: "n", f: "B22+B12" };                      // Thu nhập trả nợ
ws2["B24"] = { t: "n", f: "IF(B7>0,ROUND(B5/(B7/12),0),0)" }; // Gốc/năm
ws2["B25"] = { t: "n", f: "B23-B24" };                      // TN còn lại

// ══════════════════════════════════════════════════════════════════
// Tab 3: Bảng trả nợ (formulas)
// ══════════════════════════════════════════════════════════════════
const tnRows = [
  ["BẢNG TRẢ NỢ THEO NĂM", "", "", "", "", ""],
  ["Tự động tính từ Thông tin vay", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["Năm", "Thu nhập trả nợ", "Dư nợ đầu kỳ", "Gốc trả", "Lãi trả", "TN còn lại"],
];
for (let y = 1; y <= 10; y++) tnRows.push(["Năm " + y, null, null, null, null, null]);
tnRows.push([]);
tnRows.push(["Cộng", "", null, null, "", ""]);

const ws3 = XLSX.utils.aoa_to_sheet(tnRows);
ws3["!cols"] = [{wch:8}, {wch:18}, {wch:18}, {wch:18}, {wch:18}, {wch:18}];

const yearsF = "CEILING(" + TV("B7") + "/12,1)";
for (let y = 1; y <= 10; y++) {
  const r = y + 4;
  // B: Thu nhập trả nợ
  ws3["B" + r] = { t: "n", f: "IF(" + y + ">" + yearsF + ",\"\"," + TV("B23") + ")" };
  // C: Dư nợ đầu kỳ
  if (y === 1) {
    ws3["C" + r] = { t: "n", f: TV("B5") };
  } else {
    ws3["C" + r] = { t: "n", f: "IF(" + y + ">" + yearsF + ",\"\",C" + (r-1) + "-D" + (r-1) + ")" };
  }
  // D: Gốc trả
  ws3["D" + r] = { t: "n", f: "IF(" + y + ">" + yearsF + ",\"\",IF(" + y + "=" + yearsF + ",C" + r + ",ROUND(" + TV("B5") + "/" + yearsF + ",0)))" };
  // E: Lãi trả (năm 1 = LS ưu đãi, sau = LS chuẩn)
  const rateF = y === 1 ? TV("B13") + "/100" : TV("B6") + "/100";
  ws3["E" + r] = { t: "n", f: "IF(" + y + ">" + yearsF + ",\"\",ROUND(C" + r + "*" + rateF + ",0))" };
  // F: TN còn lại
  ws3["F" + r] = { t: "n", f: "IF(" + y + ">" + yearsF + ",\"\",B" + r + "-D" + r + "-E" + r + ")" };
}
// Cộng row (row 15)
ws3["C15"] = { t: "n", f: "SUM(C5:C14)" };
ws3["D15"] = { t: "n", f: "SUM(D5:D14)" };

// ══════════════════════════════════════════════════════════════════
// Tab 4: Data (Type A — parser reads this)
// Row 1 = headers, Row 2 = values (formulas linking to other tabs)
// ══════════════════════════════════════════════════════════════════
const headers = [
  // Cost items _DG/_SL/_TT
  "Xử lý đất_DG", "Xử lý đất_SL", "Xử lý đất_TT",
  "Cây giống_DG", "Cây giống_SL", "Cây giống_TT",
  "Phân hữu cơ_DG", "Phân hữu cơ_SL", "Phân hữu cơ_TT",
  "Phân vô cơ_DG", "Phân vô cơ_SL", "Phân vô cơ_TT",
  "Đạm_DG", "Đạm_SL", "Đạm_TT",
  "Lân_DG", "Lân_SL", "Lân_TT",
  "KaLi_DG", "KaLi_SL", "KaLi_TT",
  "Phân vi sinh_DG", "Phân vi sinh_SL", "Phân vi sinh_TT",
  "NPK_DG", "NPK_SL", "NPK_TT",
  "Vôi_DG", "Vôi_SL", "Vôi_TT",
  "Thuốc BVTV_DG", "Thuốc BVTV_SL", "Thuốc BVTV_TT",
  "Chi phí tưới_DG", "Chi phí tưới_SL", "Chi phí tưới_TT",
  "Công lao động_DG", "Công lao động_SL", "Công lao động_TT",
  // Meta fields
  "Số tiền vay", "Lãi suất vay", "Thời hạn vay", "Số vòng quay",
  "Vốn đối ứng", "Tỷ lệ vốn đối ứng", "Mục đích vay",
  "Tổng doanh thu dự kiến", "Tổng chi phí dự kiến",
  "Lợi nhuận dự kiến", "Sản lượng", "Thu nhập",
  "Số sào đất", "Số sào đất NN",
  "Số năm khấu hao", "Đơn giá nhà kính",
  "Lãi suất ưu đãi", "Số HĐ thi công", "Ngày HĐ thi công",
  "Địa chỉ đất NN",
  "Tổng nhu cầu vốn", "Lãi vay NH", "Khấu hao nhà kính",
  "Cộng chi phí trực tiếp", "Cộng chi phí gián tiếp",
  "Thu nhập để trả nợ", "Số gốc phải trả", "Thu nhập còn lại sau khi trả nợ",
  "Số hợp đồng thi công", "Ngày hợp đồng thi công",
];

// Source formulas for each header
const cpD = (r) => CP("D" + r); // đơn giá
const cpF = (r) => CP("F" + r); // SL thực tế (after scale)
const cpG = (r) => CP("G" + r); // thành tiền
const costRows = [6,7,8,9,10,11,12,13,14,15,16,17,18]; // rows in Chi phí tab

const formulas = [];
// Cost items: 13 items × 3 (DG/SL/TT)
for (const r of costRows) {
  formulas.push(cpD(r), cpF(r), cpG(r));
}
// Meta fields
formulas.push(
  TV("B5"),   // Số tiền vay
  TV("B6"),   // Lãi suất vay (number, parser parseRate)
  TV("B7"),   // Thời hạn vay
  "1",        // Số vòng quay (fixed 1 for trung_dai)
  TV("B17"),  // Vốn đối ứng
  TV("B18"),  // Tỷ lệ
  TV("B19"),  // Mục đích vay
  TV("B20"),  // Tổng doanh thu
  TV("B21"),  // Tổng chi phí
  TV("B22"),  // Lợi nhuận
  CP("F27"),  // Sản lượng (SL thực tế after scale)
  CP("D28"),  // Thu nhập (đơn giá bán)
  CP("B3"),   // Số sào đất (from Chi phí B3)
  CP("B3"),   // Số sào đất NN (same)
  TV("B11"),  // Số năm khấu hao
  TV("B8"),   // Đơn giá nhà kính
  TV("B13"),  // Lãi suất ưu đãi
  TV("B28"),  // Số HĐ thi công
  TV("B29"),  // Ngày HĐ thi công
  TV("B30"),  // Địa chỉ đất NN
  TV("B16"),  // Tổng nhu cầu vốn
  CP("G23"),  // Lãi vay NH
  CP("G22"),  // Khấu hao nhà kính
  CP("G21"),  // Cộng CPTT
  CP("G24"),  // Cộng CP gián tiếp
  TV("B23"),  // Thu nhập trả nợ
  TV("B24"),  // Gốc phải trả
  TV("B25"),  // TN còn lại
  TV("B28"),  // Số HĐ thi công (duplicate for compat)
  TV("B29"),  // Ngày HĐ (duplicate)
);

const ws4 = XLSX.utils.aoa_to_sheet([headers]);
ws4["!cols"] = headers.map(() => ({ wch: 16 }));

// Row 2: formulas
for (let c = 0; c < formulas.length; c++) {
  const col = XLSX.utils.encode_col(c);
  ws4[col + "2"] = { t: "n", f: formulas[c] };
}
ws4["!ref"] = "A1:" + XLSX.utils.encode_col(headers.length - 1) + "2";

// ── Build workbook ──
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws4, "Data");              // Sheet1 — parser reads this
XLSX.utils.book_append_sheet(wb, ws1, "Chi phí - Doanh thu"); // Sheet2 — user edits
XLSX.utils.book_append_sheet(wb, ws2, "Thông tin vay");        // Sheet3 — user edits
XLSX.utils.book_append_sheet(wb, ws3, "Bảng trả nợ");         // Sheet4 — auto

const outPath = "report_assets/KHCN templates/Phương án vay vốn xlsx/TEMPLATE-nha-kinh-cat-tuong.xlsx";
XLSX.writeFile(wb, outPath);
console.log("Created:", outPath);
console.log("Tabs:", wb.SheetNames.join(", "));
