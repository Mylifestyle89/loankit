/**
 * KHCN report helpers — pure utility functions used by khcn-report.service.ts:
 * - mergeKhcnPriorContractAliases: sync HĐ cũ placeholders across template variants
 * - flattenUncPlaceholders: expand first UNC beneficiary into flat UNC.* keys
 * - buildBangKeItems: query disbursement invoices for Bảng kê mua hàng loop
 */
import { prisma } from "@/lib/prisma";
import { fmtN } from "@/lib/report/format-number-vn";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";

// ── HĐ cũ: cùng nội dung, nhiều tên placeholder trong mẫu biểu ──

export function mergeKhcnPriorContractAliases(data: Record<string, unknown>): void {
  const pick = (keys: string[]) => {
    for (const k of keys) {
      const v = String(data[k] ?? "").trim();
      if (v) return v;
    }
    return "";
  };
  const so = pick(["PA.Số HĐTD cũ", "PA.HĐ cũ Số", "HĐTD.Số HĐ cũ"]);
  const ngay = pick(["PA.Ngày HĐTD cũ", "PA.HĐ cũ Ngày", "HĐTD.Ngày HĐ cũ"]);
  const setIfEmpty = (key: string, val: string) => {
    if (!val || String(data[key] ?? "").trim()) return;
    data[key] = val;
  };
  if (so) {
    setIfEmpty("PA.Số HĐTD cũ", so);
    setIfEmpty("PA.HĐ cũ Số", so);
    setIfEmpty("HĐTD.Số HĐ cũ", so);
  }
  if (ngay) {
    setIfEmpty("PA.Ngày HĐTD cũ", ngay);
    setIfEmpty("PA.HĐ cũ Ngày", ngay);
    setIfEmpty("HĐTD.Ngày HĐ cũ", ngay);
  }
}

// ── Flatten first beneficiary into UNC.* flat placeholders ──

export function flattenUncPlaceholders(
  data: Record<string, unknown>,
  overrides?: Record<string, string>,
  lineIndex = 0,
): void {
  if (!Array.isArray(data.UNC) || data.UNC.length === 0) return;
  const b = data.UNC[lineIndex] as Record<string, unknown> | undefined;
  if (!b) return;
  data["UNC.STT"] = b["STT"] ?? 1;
  data["UNC.Khách hàng thụ hưởng"] = b["Khách hàng thụ hưởng"] ?? "";
  // Alias tên cũ trong một số mẫu / panel tham chiếu
  data["UNC.Tên người nhận"] = data["UNC.Khách hàng thụ hưởng"];
  data["UNC.Địa chỉ"] = b["Địa chỉ"] ?? "";
  data["UNC.Số tài khoản"] = b["Số tài khoản"] ?? "";
  data["UNC.Nơi mở tài khoản"] = b["Nơi mở tài khoản"] ?? "";
  data["UNC.Ngân hàng"] = data["UNC.Nơi mở tài khoản"];
  // Per-beneficiary amount takes precedence over GN total (so multi-UNC loop shows per-line)
  const uncAmount = overrides?.["UNC.Số tiền"] || b["Số tiền"] || data["GN.Số tiền nhận nợ"] || "";
  data["UNC.Số tiền"] = fmtN(uncAmount);
  // Parse raw number for bằng chữ — strip VN thousands separators first
  const rawUnc = Number(String(uncAmount).replace(/\./g, "").replace(/,/g, "."));
  data["UNC.ST bằng chữ"] = overrides?.["UNC.ST bằng chữ"] || (b["ST bằng chữ"] as string) || (Number.isFinite(rawUnc) && rawUnc > 0 ? numberToVietnameseWords(rawUnc) : "");
  data["UNC.Nội dung"] = b["Nội dung"] ?? overrides?.["UNC.Nội dung"] ?? "";

  // Indexed UNC.Mặt hàng N / Số lượng N / Đơn giá N / Thành tiền N (backward compat)
  const uncArr = data.UNC as Array<Record<string, unknown>>;
  for (let i = 0; i < uncArr.length; i++) {
    const idx = i + 1;
    data[`UNC.Mặt hàng ${idx}`] = uncArr[i]["Khách hàng thụ hưởng"] ?? "";
    data[`UNC.Số lượng ${idx}`] = "";
    data[`UNC.Đơn giá ${idx}`] = "";
    data[`UNC.Thành tiền ${idx}`] = uncArr[i]["Số tiền"] ?? "";
    data[`UNC.Địa chỉ ${idx}`] = uncArr[i]["Địa chỉ"] ?? "";
    data[`UNC.Ngân hàng ${idx}`] = uncArr[i]["Nơi mở tài khoản"] ?? "";
  }
}

// ── Build BANG_KE items from disbursement beneficiary lines ──

export async function buildBangKeItems(loanId?: string, disbursementId?: string) {
  if (!loanId) return [];
  const where = disbursementId
    ? { id: disbursementId, loanId }
    : { loanId };
  const disb = await prisma.disbursement.findFirst({
    where,
    orderBy: { disbursementDate: "desc" },
    include: {
      beneficiaryLines: {
        include: { invoices: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!disb) return [];

  // Flatten: each row = 1 item, with seller info from beneficiary line
  const items: Array<Record<string, unknown>> = [];
  for (const bl of disb.beneficiaryLines) {
    if (bl.invoiceStatus === "bang_ke" && bl.invoices.length > 0) {
      for (const inv of bl.invoices) {
        items.push({
          STT: items.length + 1,
          "Người bán": bl.beneficiaryName,
          "Địa chỉ NB": bl.address ?? "",
          "Mặt hàng": inv.supplierName,
          "Số lượng": fmtN(inv.qty),
          "Đơn giá": fmtN(inv.unitPrice),
          "Thành tiền": fmtN(inv.amount),
        });
      }
    } else {
      // Non-bang_ke: beneficiary = single item row
      items.push({
        STT: items.length + 1,
        "Người bán": bl.beneficiaryName,
        "Địa chỉ NB": bl.address ?? "",
        "Mặt hàng": bl.beneficiaryName,
        "Số lượng": "",
        "Đơn giá": "",
        "Thành tiền": fmtN(bl.amount),
      });
    }
  }
  return items;
}
