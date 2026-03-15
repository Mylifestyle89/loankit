const XLSX = require('xlsx');
const outDir = 'report_assets/KHCN templates/Phương án vay vốn xlsx/';

/**
 * Build a universal loan plan XLSX template.
 * Row 2 contains "Số sào đất" multiplier in cell B3.
 * Cost qty = định mức per sào, Thành tiền = Đơn giá × (SL/sào × Số sào).
 * Lãi vay NH auto-calculated from loan amount × interest rate.
 */
function buildTemplate({ title, costItems, indirectCostRate, revenueItems, loanInfo }) {
  const wb = XLSX.utils.book_new();

  // === Sheet 1: Chi phí - Doanh thu ===
  // Row layout: R1=title, R2=subtitle, R3=Số sào, R4=empty, R5=header, R6+=data
  const rows = [
    [`PHƯƠNG ÁN VAY VỐN - ${title}`, '', '', '', '', ''],
    ['Định mức trên 1 sào (1,000 m2). Nhập số sào vào ô B3 để tự nhân diện tích.', '', '', '', '', ''],
    ['Số sào đất:', loanInfo.defaultAcreage || 1, '', '', '', ''],
    [],
    // Header: col A=STT, B=Khoản mục, C=ĐVT, D=Đơn giá, E=SL/sào (định mức), F=SL thực tế, G=Thành tiền
    ['STT', 'KHOẢN MỤC CHI PHÍ', 'Đơn vị tính', 'Đơn giá', 'SL/sào (định mức)', 'Số lượng thực tế', 'Thành tiền'],
  ];

  // Cost items - qty is per sào, actual qty = qty × $B$3, amount = unitPrice × actual qty
  costItems.forEach((item) => {
    const r = rows.length + 1;
    rows.push([
      item.stt || '',
      item.name,
      item.unit || '',
      item.unitPrice || '',
      item.qty || '',            // SL/sào (định mức)
      { f: `IFERROR(E${r}*$B$3,0)` },      // SL thực tế = định mức × số sào
      { f: `IFERROR(D${r}*F${r},0)` },     // Thành tiền = đơn giá × SL thực tế
    ]);
  });
  // Pad to 20 cost rows
  for (let i = costItems.length; i < 20; i++) {
    const r = rows.length + 1;
    rows.push([i + 1, '', '', '', '', { f: `IFERROR(E${r}*$B$3,0)` }, { f: `IFERROR(D${r}*F${r},0)` }]);
  }

  const totalCostRow = rows.length + 1;
  rows.push(['', 'TỔNG CHI PHÍ TRỰC TIẾP', '', '', '', '', { f: `SUM(G6:G${totalCostRow - 1})` }]);

  // Lãi vay NH = Số tiền vay × Lãi suất (ref from Sheet2)
  const indirectRow = rows.length + 1;
  rows.push([
    '', 'Chi phí gián tiếp (Lãi vay NH)', '',
    '', '', '',
    { f: `IFERROR('Thông tin vay'!B5*'Thông tin vay'!B6/100,0)` },
  ]);

  // Tổng chi phí (trực tiếp + gián tiếp)
  const totalAllCostRow = rows.length + 1;
  rows.push(['', 'TỔNG CHI PHÍ', '', '', '', '', { f: `IFERROR(G${totalCostRow}+G${indirectRow},0)` }]);
  rows.push([]);

  // Revenue header
  rows.push(['STT', 'KHOẢN MỤC DOANH THU', 'Đơn vị tính', 'Đơn giá', 'SL/sào (định mức)', 'Số lượng thực tế', 'Thành tiền']);
  const revStartRow = rows.length + 1;

  revenueItems.forEach((item, i) => {
    const r = rows.length + 1;
    rows.push([
      i + 1, item.name, item.unit || '', item.unitPrice || '', item.qty || '',
      { f: `IFERROR(E${r}*$B$3,0)` },
      { f: `IFERROR(D${r}*F${r},0)` },
    ]);
  });
  for (let i = revenueItems.length; i < 5; i++) {
    const r = rows.length + 1;
    rows.push([i + 1, '', '', '', '', { f: `IFERROR(E${r}*$B$3,0)` }, { f: `IFERROR(D${r}*F${r},0)` }]);
  }

  const totalRevRow = rows.length + 1;
  rows.push(['', 'TỔNG DOANH THU', '', '', '', '', { f: `SUM(G${revStartRow}:G${totalRevRow - 1})` }]);
  rows.push([]);
  rows.push(['', 'LÃI (+) / LỖ (-)', '', '', '', '', { f: `IFERROR(G${totalRevRow}-G${totalAllCostRow},0)` }]);
  rows.push([]);
  rows.push(['', 'Tỷ suất lợi nhuận', '', '', '', '', { f: `IFERROR(G${totalRevRow + 2}/G${totalRevRow},"")` }]);

  const ws1 = XLSX.utils.aoa_to_sheet(rows);
  ws1['!cols'] = [
    { wch: 5 },   // STT
    { wch: 35 },  // Khoản mục
    { wch: 12 },  // ĐVT
    { wch: 15 },  // Đơn giá
    { wch: 18 },  // SL/sào
    { wch: 18 },  // SL thực tế
    { wch: 18 },  // Thành tiền
  ];
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },  // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },  // Subtitle
  ];

  // === Sheet 2: Thông tin vay ===
  const sheet2 = [
    ['THÔNG TIN VAY VỐN'], ['(Nhập giá trị vào cột B)'], [],
    ['Trường thông tin', 'Giá trị', 'Ghi chú'],
    ['Số tiền vay', loanInfo.loanAmount || '', 'VNĐ'],
    ['Lãi suất vay', loanInfo.interestRate || '', '%/năm (VD: 7 = 7%)'],
    ['Thời hạn vay', loanInfo.loanMonths || '', 'tháng'],
    ['Kỳ hạn trả gốc', loanInfo.paymentPeriod || '', 'tháng'],
    ['Vòng quay vốn', loanInfo.turnoverCycles || '', 'số vòng/năm (hạn mức, VD: 2)'],
    ['Mục đích vay', loanInfo.purpose || '', 'Mô tả ngắn gọn'],
    ['Tổng nhu cầu vốn', '', 'VNĐ (= tổng chi phí trực tiếp)'],
    ['Vốn tự có (đối ứng)', '', 'VNĐ'],
    ['Tỷ lệ vốn đối ứng', '', '%'],
    ['Địa chỉ hoạt động', '', 'Địa chỉ sản xuất'],
    [],
    ['DƯ NỢ TẠI AGRIBANK'], [],
    ['Trường thông tin', 'Giá trị', 'Ghi chú'],
    ['Chi nhánh', '', 'Tên chi nhánh Agribank'],
    ['Dư nợ ngắn hạn', '', 'VNĐ'],
    ['Dư nợ trung dài hạn', '', 'VNĐ'],
    ['Mục đích ngắn hạn', '', ''],
    ['Mục đích trung dài hạn', '', ''],
    ['Nguồn trả nợ', '', ''],
    [],
    ['DƯ NỢ TẠI TCTD KHÁC'], [],
    ['Trường thông tin', 'Giá trị', 'Ghi chú'],
    ['Tên TCTD', '', ''],
    ['Dư nợ ngắn hạn', '', 'VNĐ'],
    ['Dư nợ trung dài hạn', '', 'VNĐ'],
    ['Mục đích ngắn hạn', '', ''],
    ['Mục đích trung dài hạn', '', ''],
    ['Nguồn trả nợ', '', ''],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2);
  ws2['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 30 }];

  // === Sheet 3: Tài sản mua sắm ===
  const sheet3 = [
    ['TÀI SẢN MUA SẮM TỪ VỐN VAY (nếu có)'], [],
    ['STT', 'Tên tài sản', 'Đơn vị', 'Đơn giá', 'Số lượng', 'Thành tiền'],
  ];
  for (let i = 1; i <= 10; i++) sheet3.push([i, '', '', '', '', { f: `IFERROR(D${i + 3}*E${i + 3},0)` }]);
  sheet3.push(['', 'Tổng cộng', '', '', '', { f: 'SUM(F4:F13)' }]);
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3);
  ws3['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Chi phí - Doanh thu');
  XLSX.utils.book_append_sheet(wb, ws2, 'Thông tin vay');
  XLSX.utils.book_append_sheet(wb, ws3, 'Tài sản mua sắm');
  return wb;
}

// ============================================================
// 0. TEMPLATE TRỐNG (universal)
// ============================================================
XLSX.writeFile(buildTemplate({
  title: '(NHẬP TÊN PHƯƠNG ÁN)',
  costItems: [],
  revenueItems: [],
  loanInfo: { defaultAcreage: 1 }
}), outDir + 'TEMPLATE-phuong-an-vay-von.xlsx');
console.log('OK: TEMPLATE-phuong-an-vay-von.xlsx');

// ============================================================
// 1. HOA CÁT TƯỜNG (12 tháng, vay thường)
// ============================================================
XLSX.writeFile(buildTemplate({
  title: 'TRỒNG HOA CÁT TƯỜNG',
  costItems: [
    { name: 'Xử lý đất', unit: 'm2', unitPrice: 16000, qty: 1000 },
    { name: 'Cây giống', unit: 'cây', unitPrice: 2800, qty: 35000 },
    { name: 'Phân hữu cơ', unit: 'm3', unitPrice: 1200000, qty: 15 },
    { stt: '-', name: 'Đạm', unit: 'kg', unitPrice: 18000, qty: 67 },
    { stt: '-', name: 'Lân', unit: 'kg', unitPrice: 4000, qty: 225 },
    { stt: '-', name: 'KaLi', unit: 'kg', unitPrice: 18000, qty: 74 },
    { stt: '-', name: 'Phân vi sinh', unit: 'kg', unitPrice: 10000, qty: 300 },
    { stt: '-', name: 'NPK', unit: 'kg', unitPrice: 20000, qty: 40 },
    { name: 'Vôi', unit: 'kg', unitPrice: 2000, qty: 100 },
    { name: 'Thuốc BVTV', unit: 'lít', unitPrice: 1500000, qty: 18 },
    { name: 'Chi phí tưới', unit: 'giờ', unitPrice: 70000, qty: 100 },
    { name: 'Công lao động', unit: 'công', unitPrice: 300000, qty: 100 },
  ],
  revenueItems: [{ name: 'Sản lượng hoa', unit: 'kg', unitPrice: 70000, qty: 4000 }],
  loanInfo: {
    defaultAcreage: 1,
    loanAmount: 182000000,
    interestRate: 7,
    loanMonths: 12,
    purpose: 'Trồng và chăm sóc hoa Cát tường',
  }
}), outDir + 'TEMPLATE-hoa-cat-tuong.xlsx');
console.log('OK: TEMPLATE-hoa-cat-tuong.xlsx');

// ============================================================
// 2. HOA LYLY (hạn mức, vòng quay = 2, 4 tháng/vòng)
// ============================================================
XLSX.writeFile(buildTemplate({
  title: 'TRỒNG HOA LYLY (HẠN MỨC)',
  costItems: [
    { name: 'Xử lý đất', unit: 'm2', unitPrice: 16000, qty: 1000 },
    { name: 'Giống (củ)', unit: 'củ', unitPrice: 11000, qty: 30000 },
    { name: 'Phân hữu cơ', unit: 'm3', unitPrice: 1200000, qty: 6 },
    { stt: '-', name: 'Đạm', unit: 'kg', unitPrice: 18000, qty: 32 },
    { stt: '-', name: 'Lân', unit: 'kg', unitPrice: 4000, qty: 94 },
    { stt: '-', name: 'KaLi', unit: 'kg', unitPrice: 18000, qty: 30 },
    { stt: '-', name: 'NPK', unit: 'kg', unitPrice: 20000, qty: 100 },
    { name: 'Thuốc BVTV', unit: 'lít', unitPrice: 1500000, qty: 4 },
    { name: 'Chi phí tưới', unit: 'giờ', unitPrice: 70000, qty: 20 },
    { name: 'Công lao động', unit: 'công', unitPrice: 300000, qty: 25 },
  ],
  revenueItems: [{ name: 'Sản lượng hoa', unit: 'cành', unitPrice: 17000, qty: 27000 }],
  loanInfo: {
    defaultAcreage: 1,
    loanAmount: 333000000,
    interestRate: 7,
    loanMonths: 4,
    turnoverCycles: 2,
    purpose: 'Trồng và chăm sóc hoa LyLy (hạn mức)',
  }
}), outDir + 'TEMPLATE-hoa-lyly-han-muc.xlsx');
console.log('OK: TEMPLATE-hoa-lyly-han-muc.xlsx');

// ============================================================
// 3. ỚT NGỌT (12 tháng)
// ============================================================
XLSX.writeFile(buildTemplate({
  title: 'TRỒNG ỚT NGỌT',
  costItems: [
    { name: 'Chi phí cày đất', unit: 'đ', unitPrice: 1000000, qty: 1 },
    { name: 'Cây giống', unit: 'cây', unitPrice: 10000, qty: 4000 },
    { name: 'Phân hữu cơ', unit: 'm3', unitPrice: 1200000, qty: 6 },
    { stt: '-', name: 'Đạm', unit: 'kg', unitPrice: 18000, qty: 50 },
    { stt: '-', name: 'Lân', unit: 'kg', unitPrice: 4000, qty: 100 },
    { stt: '-', name: 'KaLi', unit: 'kg', unitPrice: 18000, qty: 40 },
    { stt: '-', name: 'NPK', unit: 'kg', unitPrice: 20000, qty: 40 },
    { name: 'Vôi', unit: 'kg', unitPrice: 2000, qty: 200 },
    { name: 'Thuốc BVTV', unit: 'lít', unitPrice: 1500000, qty: 10 },
    { name: 'Chi phí tưới', unit: 'giờ', unitPrice: 70000, qty: 200 },
    { name: 'Công lao động', unit: 'công', unitPrice: 300000, qty: 120 },
    { name: 'Chói cắm', unit: 'đ', unitPrice: 5000000, qty: 1 },
  ],
  revenueItems: [{ name: 'Thu 1 vụ/12 tháng', unit: 'kg', unitPrice: 18000, qty: 12000 }],
  loanInfo: {
    defaultAcreage: 1,
    loanAmount: 109000000,
    interestRate: 7,
    loanMonths: 12,
    purpose: 'Trồng và chăm sóc ớt ngọt',
  }
}), outDir + 'TEMPLATE-ot-ngot.xlsx');
console.log('OK: TEMPLATE-ot-ngot.xlsx');
