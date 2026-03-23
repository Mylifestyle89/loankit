/**
 * KHCN placeholder registry — static list of all template placeholders
 * grouped by category. Used for reference panel with copy-to-clipboard.
 */

export type PlaceholderGroup = {
  label: string;
  prefix?: string;
  items: string[];
  /** Loop array name (for table rows in templates) */
  loop?: string;
};

/** All KHCN template placeholder groups */
export const KHCN_PLACEHOLDER_GROUPS: PlaceholderGroup[] = [
  {
    label: "Ngày tháng",
    items: ["Ngày", "Tháng", "Năm", "năm"],
  },
  {
    label: "Khách hàng",
    items: [
      "Tên khách hàng", "TÊN KHÁCH HÀNG", "Mã khách hàng",
      "Địa chỉ", "CCCD", "Ngày cấp CCCD", "Nơi cấp CCCD",
      "CMND", "CMND cũ", "Ngày cấp", "Nơi cấp",
      "Năm sinh", "Giới tính", "Danh xưng", "Tên gọi in hoa",
      "Số điện thoại", "Điện thoại", "Nơi thường trú",
      "Tình trạng hôn nhân", "Họ tên vợ/chồng", "CCCD vợ/chồng",
      "Số tài khoản", "Nơi mở tài khoản",
      "Tên sản phẩm TTTD", "Mã sản phẩm TTTD",
      "Loại giấy tờ tùy thân",
    ],
  },
  {
    label: "Chi nhánh & Nhân viên",
    items: [
      "Tên chi nhánh/PGD", "TÊN CHI NHÁNH/PGD", "Mã CN",
      "Địa chỉ trụ sở", "Địa danh", "Địa bàn", "Fax", "Mã số thuế CN",
      "Tên người dùng", "Người kiểm soát",
      "Người phê duyệt", "Chức vụ NPD", "Danh xưng NPD",
    ],
  },
  {
    label: "Hợp đồng tín dụng (HĐTD)",
    prefix: "HĐTD",
    items: [
      "HĐTD.Số HĐ tín dụng", "HĐTD.Ngày ký HĐTD",
      "HĐTD.Số tiền vay", "HĐTD.STvay bằng chữ", "HĐTD.Bằng chữ",
      "HĐTD.Mục đích vay", "HĐTD.Thời hạn vay", "HĐTD.Hạn trả cuối",
      "HĐTD.Lãi suất vay", "HĐTD.Lãi suất quá hạn", "HĐTD.Lãi suất chậm trả",
      "HĐTD.Phương thức cho vay", "HĐTD.Định kỳ trả gốc", "HĐTD.Định kỳ trả lãi",
      "HĐTD.Lý do đáp ứng/không đáp ứng TCMBLM",
      "HĐTD.Tổng giá trị TSBĐ", "HĐTD.Tổng nghĩa vụ bảo đảm",
      "HĐTD.TGTTSBĐ bằng chữ", "HĐTD.TNVBĐ bằng chữ",
      "HĐTD.Tổng nghĩa vụ bảo đảm tối đa", "HĐTD.TNVBĐTĐ bằng chữ",
      "HĐTD.Chương trình cho vay 1", "HĐTD.Chương trình cho vay 2",
      "HĐTD.Chương trình cho vay 3", "HĐTD.Chương trình cho vay 4",
      "HĐTD.Tài chính minh bạch, LM", "HĐTD.Giấy tờ ủy quyền",
      "HĐTD.Tổng nhu cầu vốn", "HĐTD.Vốn đối ứng", "HĐTD.Tỷ lệ vốn đối ứng",
      "HĐTD.Tr.đó: Vốn bằng tiền", "HĐTD.Vốn bằng sức lao động",
      "HĐTD.Xếp hạng khách hàng", "HĐTD.Nhóm nợ", "HĐTD.Kỳ chấm điểm",
      "HĐTD.Dư nợ của KH và NLQ tại Agribank", "HĐTD.Dư nợ tại TCTD khác",
      "HĐTD.Doanh thu dự kiến", "HĐTD.Chi phí dự kiến", "HĐTD.Lợi nhuận dự kiến",
      "HĐTD.Số HĐ cũ", "HĐTD.Ngày HĐ cũ",
    ],
  },
  {
    label: "Giải ngân (GN)",
    prefix: "GN",
    items: [
      "GN.Dư nợ hiện tại", "GN.Số tiền nhận nợ",
      "GN.STNN bằng chữ", "GN.Mục đích",
      "GN.Tổng dư nợ", "GN.DNHT bằng chữ", "GN.TDN bằng chữ",
      "GN.Tài liệu chứng minh", "GN.Tiền mặt",
    ],
  },
  {
    label: "Ủy nhiệm chi (UNC)",
    loop: "UNC",
    items: [
      "UNC.STT",
      "UNC.Khách hàng thụ hưởng",
      "UNC.Tên người nhận",
      "UNC.Địa chỉ",
      "UNC.Số tài khoản",
      "UNC.Nơi mở tài khoản",
      "UNC.Ngân hàng",
      "UNC.Số tiền",
      "UNC.ST bằng chữ",
      "UNC.Nội dung",
    ],
  },
  {
    label: "TSBĐ tổng hợp",
    loop: "TSBD",
    items: [
      "Tổng giá trị TSBĐ", "Tổng giá trị TSBĐ bằng chữ",
      "Tổng nghĩa vụ bảo đảm",
    ],
  },
  {
    label: "Quyền sử dụng đất (SĐ)",
    prefix: "SĐ",
    items: [
      "SĐ.Tên TSBĐ", "SĐ.Số seri", "SĐ.Cấp ngày", "SĐ.Cơ quan cấp",
      "SĐ.Số vào sổ", "SĐ.Địa chỉ đất",
      "SĐ.Diện tích đất", "SĐ.DTĐ bằng chữ",
      "SĐ.Hình thức sở hữu", "SĐ.Mục đích sử dụng",
      "SĐ.Thời hạn sử dụng", "SĐ.Sử dụng chung", "SĐ.Sử dụng riêng",
      "SĐ.Loại đất 1", "SĐ.DT đất 1", "SĐ.Đơn giá đất 1", "SĐ.Thành tiền đất 1",
      "SĐ.Loại đất 2", "SĐ.DT đất 2", "SĐ.Đơn giá đất 2", "SĐ.Thành tiền đất 2",
      "SĐ.Loại đất 3", "SĐ.DT đất 3", "SĐ.Đơn giá đất 3", "SĐ.Thành tiền đất 3",
      "SĐ.Số thửa", "SĐ.Số tờ bản đồ", "SĐ.Nguồn gốc",
      "SĐ.Kết cấu nhà", "SĐ.Số tầng", "SĐ.Diện tích XD", "SĐ.Diện tích sàn",
      "SĐ.Cấp nhà ở", "SĐ.Loại nhà ở",
      "SĐ.DT định giá nhà", "SĐ.Đơn giá nhà", "SĐ.Thành tiền nhà",
      "SĐ.Giá trị nhà", "SĐ.Giá trị XD ban đầu",
      "SĐ.Năm hoàn thành XD", "SĐ.Hình thức sở hữu nhà",
      "SĐ.Công trình XD khác", "SĐ.GT công trình XD khác",
      "SĐ.Giấy tờ quyền bề mặt",
      "SĐ.Số HĐ thế chấp", "SĐ.Ngày ký HĐTC", "SĐ.Tên HĐ thế chấp",
      "SĐ.Văn bản sửa đổi", "SĐ.Ngày sửa đổi",
      "SĐ.Tổng giá trị TS", "SĐ.TGTTS bằng chữ",
      "SĐ.Nghĩa vụ bảo đảm", "SĐ.NVBĐ bằng chữ",
      "SĐ.Thời hạn XĐ lại GTTS", "SĐ.Ghi chú",
      "SĐ.Tổng giá trị tất cả TS", "SĐ.Tổng GTTS bằng chữ",
      "SĐ.Tổng NVBĐ", "SĐ.Tổng NVBĐ bằng chữ",
    ],
  },
  {
    label: "Chủ sở hữu TSBĐ (ĐSH)",
    prefix: "ĐSH",
    items: [
      "ĐSH.Tên chủ sở hữu", "ĐSH.CMND", "ĐSH.CMND cũ", "ĐSH.Ngày cấp",
      "ĐSH.Nơi cấp", "ĐSH.Địa chỉ",
    ],
  },
  {
    label: "Động sản (ĐS)",
    prefix: "ĐS",
    items: [
      "ĐS.Tên TSBĐ", "ĐS.Nhãn hiệu", "ĐS.Biển kiểm soát",
      "ĐS.Số khung", "ĐS.Số máy", "ĐS.Màu sơn",
      "ĐS.Năm sản xuất", "ĐS.Nơi đăng ký",
      "ĐS.Giá trị TSBĐ", "ĐS.GTTSBĐ bằng chữ",
      "ĐS.Nghĩa vụ bảo đảm", "ĐS.NVBĐ bằng chữ",
      "ĐS.Tổng giá trị tất cả TS", "ĐS.Tổng GTTS bằng chữ",
      "ĐS.Tổng NVBĐ", "ĐS.Tổng NVBĐ bằng chữ",
    ],
  },
  {
    label: "Tiết kiệm (TK)",
    prefix: "TK",
    items: [
      "TK.Tên TSBĐ", "TK.Số sổ/seri", "TK.Ngày gửi", "TK.Ngày đáo hạn",
      "TK.Số tiền gửi", "TK.Lãi suất",
      "TK.Giá trị TSBĐ", "TK.GTTSBĐ bằng chữ",
      "TK.Nghĩa vụ bảo đảm", "TK.NVBĐ bằng chữ",
      "TK.Tổng giá trị tất cả TS", "TK.Tổng GTTS bằng chữ",
      "TK.Tổng NVBĐ", "TK.Tổng NVBĐ bằng chữ",
    ],
  },
  {
    label: "TS khác (TSK)",
    prefix: "TSK",
    items: [
      "TSK.Tên TSBĐ", "TSK.Mô tả",
      "TSK.Giá trị TSBĐ", "TSK.GTTSBĐ bằng chữ",
      "TSK.Nghĩa vụ bảo đảm", "TSK.NVBĐ bằng chữ",
      "TSK.Tổng giá trị tất cả TS", "TSK.Tổng GTTS bằng chữ",
      "TSK.Tổng NVBĐ", "TSK.Tổng NVBĐ bằng chữ",
    ],
  },
  {
    label: "Đồng vay (TV)",
    prefix: "TV",
    loop: "TV",
    items: [
      "TV.STT", "TV.Danh xưng", "TV.Họ và tên",
      "TV.Loại giấy tờ tùy thân", "TV.CMND",
      "TV.Ngày cấp", "TV.Nơi cấp", "TV.Địa chỉ",
    ],
  },
  {
    label: "Người liên quan (NLQ)",
    prefix: "NLQ",
    loop: "NLQ",
    items: [
      "NLQ.Tên tổ chức/Cá nhân", "NLQ.Số ĐKKD/CMND",
      "NLQ.Địa chỉ", "NLQ.Mối liên quan", "NLQ.Dư nợ tại Agribank",
    ],
  },
  {
    label: "Tín dụng Agribank (VBA)",
    loop: "VBA",
    items: [
      "VBA.STT", "VBA.Số HĐTD", "VBA.Dư nợ", "VBA.Nhóm nợ",
      "VBA.Tổng dư nợ", "VBA.Dư nợ ngắn hạn", "VBA.Dư nợ trung dài hạn",
      "VBA.Mục đích ngắn hạn", "VBA.Mục đích trung dài hạn", "VBA.Nguồn trả nợ",
    ],
  },
  {
    label: "Tín dụng khác (TCTD)",
    prefix: "TCTD",
    items: [
      "TCTD.Tên TCTD", "TCTD.Nhóm nợ", "TCTD.Thời hạn vay", "TCTD.Dư nợ",
      "TCTD.Tổng dư nợ", "TCTD.Dư nợ ngắn hạn", "TCTD.Dư nợ trung dài hạn",
      "TCTD.Mục đích ngắn hạn", "TCTD.Mục đích trung dài hạn", "TCTD.Nguồn trả nợ",
    ],
  },
  {
    label: "Phương án vay (PA)",
    prefix: "PA",
    loop: "PA_CHIPHI, PA_DOANHTHU",
    items: [
      "PA.Tên phương án", "PA.Mục đích vay", "PA.Thời hạn vay",
      "PA.Lãi suất vay", "PA.Lãi vay", "PA.Lãi vay NH",
      "PA.Số tiền vay", "PA.Số tiền vay bằng chữ",
      "PA.Tổng nhu cầu vốn", "PA.Tổng nhu cầu vốn bằng chữ",
      "PA.Vốn đối ứng", "PA.Tỷ lệ vốn đối ứng", "PA.Tỷ lệ vốn tự có",
      "PA.Tổng chi phí trực tiếp", "PA.Tổng chi phí gián tiếp", "PA.Tổng chi phí",
      "PA.Tổng doanh thu dự kiến", "PA.Tổng chi phí dự kiến", "PA.Lợi nhuận dự kiến",
      "PA.Thu nhập", "PA.Sản lượng", "PA.Vòng quay vốn",
      "PA.Số sào đất", "PA.Địa chỉ đất NN",
      "PA.Số tiền hợp đồng cung ứng", "PA.Số tiền đặt cọc",
      "PA.Số HĐTD cũ",
      "PA.Ngày HĐTD cũ",
      "PA.HĐ cũ Số",
      "PA.HĐ cũ Ngày",
      "PA.Dư nợ cũ",
      "HĐTD.Số HĐ cũ",
      "HĐTD.Ngày HĐ cũ",
    ],
  },
  {
    label: "Khấu hao & Nhà kính",
    prefix: "PA",
    items: [
      "PA.Khấu hao nhà kính", "PA.Số năm khấu hao",
      "PA.Đơn giá nhà kính/sào", "PA.Số sào đất",
      "PA.Số HĐ thi công", "PA.Ngày HĐ thi công",
    ],
  },
  {
    label: "Bảng trả nợ theo năm",
    prefix: "PA_TRANO",
    loop: "PA_TRANO",
    items: [
      "PA_TRANO.Năm", "PA_TRANO.Thu nhập trả nợ",
      "PA_TRANO.Dư nợ", "PA_TRANO.Gốc trả",
      "PA_TRANO.Lãi trả", "PA_TRANO.TN còn lại",
    ],
  },
  {
    label: "Đánh giá tín dụng",
    prefix: "HĐTD",
    items: [
      "HĐTD.Tính hợp pháp", "HĐTD.Thị trường NVL",
      "HĐTD.Thị trường tiêu thụ SP", "HĐTD.Năng lực về nhân công",
      "HĐTD.Năng lực về máy móc", "HĐTD.Các yếu tố khác",
    ],
  },
  {
    label: "Phí trả nợ trước hạn",
    prefix: "HDTD",
    items: [
      "HDTD.Phí vay trả trong ngày", "HDTD.Min vay trả trong ngày", "HDTD.Max vay trả trong ngày",
      "HDTD.Phí trả trước năm 1", "HDTD.Min trả trước năm 1", "HDTD.Max trả trước năm 1",
      "HDTD.Phí trả trước năm 2", "HDTD.Min trả trước năm 2", "HDTD.Max trả trước năm 2",
      "HDTD.Phí trả trước năm 3+", "HDTD.Min trả trước năm 3+", "HDTD.Max trả trước năm 3+",
    ],
  },
];
