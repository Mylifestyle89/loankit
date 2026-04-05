/**
 * KHCN report service — generateKhcnReport + generateKhcnDisbursementReport.
 * Data building delegated to khcn-report-data-builder.ts.
 */
import { docxEngine } from "@/lib/docx-engine";
import { fmtDateCompact } from "@/lib/report/report-date-utils";

import { buildKhcnReportData } from "./khcn-report-data-builder";
import {
  KHCN_DISBURSEMENT_TEMPLATES,
  type KhcnDisbursementTemplateKey,
} from "./khcn-disbursement-template-config";
import { flattenUncPlaceholders, buildBangKeItems } from "./khcn-report-helpers";

export { buildKhcnReportData };

export type KhcnReportResult = { buffer: Buffer; filename: string; contentType: string };

export async function generateKhcnReport(
  customerId: string,
  templatePath: string,
  templateLabel: string,
  loanId?: string,
  overrides?: Record<string, string>,
): Promise<KhcnReportResult> {
  const data = await buildKhcnReportData(customerId, loanId, overrides);
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

  flattenUncPlaceholders(data, overrides);

  if (templateKey === "bang_ke_mua_hang") {
    const bangKeItems = await buildBangKeItems(loanId, disbursementId);
    data["BANG_KE"] = bangKeItems;
  }

  const buffer = await docxEngine.generateDocxBuffer(template.path, data);

  const customerName = String(data["Tên khách hàng"] ?? "KHCN");
  const filename = `${customerName}_${template.label}_${fmtDateCompact(new Date())}.docx`;

  return {
    buffer,
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}
