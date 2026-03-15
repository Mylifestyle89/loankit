// XLSX Loan Plan Parser — entry point orchestrator
// Reads XLSX buffer, detects type, delegates to Type A or B parser

import * as XLSX from "xlsx";
import { detectXlsxType } from "./xlsx-loan-plan-detector";
import { parseTypeA } from "./xlsx-loan-plan-parser-type-a";
import { parseTypeB } from "./xlsx-loan-plan-parser-type-b";
import type { XlsxParseResult } from "./xlsx-loan-plan-types";

/**
 * Parse an XLSX loan plan file from a Buffer.
 * Auto-detects structure type (A/B/C) and delegates accordingly.
 */
export function parseXlsxLoanPlan(buffer: Buffer): XlsxParseResult {
  try {
    const wb = XLSX.read(buffer, { type: "buffer" });

    if (wb.SheetNames.length === 0) {
      return {
        status: "error",
        message: "File XLSX không có sheet nào",
        detectedType: "unknown",
        costItems: [],
        revenueItems: [],
        meta: {},
        warnings: [],
      };
    }

    const detectedType = detectXlsxType(wb);

    if (detectedType === "C") {
      return {
        status: "error",
        message: "Cấu trúc file không được hỗ trợ. Vui lòng nhập thủ công hoặc sử dụng phân tích AI.",
        detectedType: "C",
        costItems: [],
        revenueItems: [],
        meta: {},
        warnings: [],
      };
    }

    return detectedType === "A" ? parseTypeA(wb) : parseTypeB(wb);
  } catch (error) {
    console.error("[XLSX Loan Plan Parser] Error:", error);
    return {
      status: "error",
      message: "Lỗi khi đọc file XLSX. Vui lòng kiểm tra file và thử lại.",
      detectedType: "unknown",
      costItems: [],
      revenueItems: [],
      meta: {},
      warnings: [],
    };
  }
}
