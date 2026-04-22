/**
 * KHCN report service — generateKhcnReport + generateKhcnDisbursementReport.
 * Data building delegated to khcn-report-data-builder.ts.
 */
import JSZip from "jszip";

import { docxEngine } from "@/lib/docx-engine";
import { fmtDateCompact } from "@/lib/report/report-date-utils";

import { buildKhcnReportData } from "./khcn-report-data-builder";
import {
  KHCN_DISBURSEMENT_TEMPLATES,
  type KhcnDisbursementTemplateKey,
} from "./khcn-disbursement-template-config";
import { flattenUncPlaceholders, buildBangKeItems } from "./khcn-report-helpers";

/** Template keys that render 1 DOCX per beneficiary (zip if multiple) */
const UNC_TEMPLATE_KEYS: ReadonlySet<KhcnDisbursementTemplateKey> = new Set([
  "unc",
  "unc_a4",
]);

/** Replace filesystem-unsafe chars in filename segments */
function safeFilenameSegment(s: string): string {
  return s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "unnamed";
}

export { buildKhcnReportData };

export type KhcnReportResult = { buffer: Buffer; filename: string; contentType: string };

export async function generateKhcnReport(
  customerId: string,
  templatePath: string,
  templateLabel: string,
  loanId?: string,
  overrides?: Record<string, string>,
  collateralIds?: string[],
): Promise<KhcnReportResult> {
  const data = await buildKhcnReportData(customerId, loanId, overrides, undefined, collateralIds);
  flattenUncPlaceholders(data, overrides);

  const buffer = await docxEngine.generateDocxBuffer(templatePath, data);

  const customerName = String(data["Tên khách hàng"] ?? "KHCN");
  const filename = `${customerName}_${templateLabel}_${fmtDateCompact(new Date())}.docx`;

  return {
    buffer,
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

export async function generateKhcnDisbursementReport(
  customerId: string,
  templateKey: KhcnDisbursementTemplateKey,
  loanId?: string,
  disbursementId?: string,
  overrides?: Record<string, string>,
): Promise<KhcnReportResult> {
  const template = KHCN_DISBURSEMENT_TEMPLATES[templateKey];
  const data = await buildKhcnReportData(customerId, loanId, overrides, disbursementId);

  const customerName = String(data["Tên khách hàng"] ?? "KHCN");
  const dateStr = fmtDateCompact(new Date());
  const docxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  // Multi-beneficiary UNC: generate 1 DOCX per beneficiary, bundle as zip
  const uncLines = Array.isArray(data.UNC) ? (data.UNC as Array<Record<string, unknown>>) : [];
  if (UNC_TEMPLATE_KEYS.has(templateKey) && uncLines.length > 1) {
    const zip = new JSZip();
    for (let i = 0; i < uncLines.length; i++) {
      flattenUncPlaceholders(data, overrides, i);
      const docxBuffer = await docxEngine.generateDocxBuffer(template.path, data);
      const beneficiaryName = safeFilenameSegment(
        String(uncLines[i]["Khách hàng thụ hưởng"] ?? `beneficiary_${i + 1}`),
      );
      zip.file(`${template.label}_${beneficiaryName}.docx`, docxBuffer);
    }
    const zipBuffer = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
    return {
      buffer: zipBuffer,
      filename: `${customerName}_${template.label}_${dateStr}.zip`,
      contentType: "application/zip",
    };
  }

  // Single beneficiary (or non-UNC template) — flatten first line and generate 1 DOCX
  flattenUncPlaceholders(data, overrides);

  if (templateKey === "bang_ke_mua_hang") {
    const bangKeItems = await buildBangKeItems(loanId, disbursementId);
    data["BANG_KE"] = bangKeItems;
  }

  const buffer = await docxEngine.generateDocxBuffer(template.path, data);
  const filename = `${customerName}_${template.label}_${dateStr}.docx`;

  return { buffer, filename, contentType: docxContentType };
}
