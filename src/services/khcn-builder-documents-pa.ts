/**
 * KHCN builder: loan plan documents (Tài liệu liên quan PA) data.
 */
import { type Data } from "./khcn-builder-collateral-helpers";

export function buildDocumentsPAData(
  customer: Record<string, unknown>,
  data: Data,
): void {
  // Parse documents array
  let documents: Array<{
    document_type: string;
    number: string;
    issuing_authority: string;
    issue_date: string;
    notes: string;
  }> = [];

  try {
    documents = JSON.parse((customer.documents_pa_json as string) || "[]");
  } catch {
    documents = [];
  }

  // Build loop array [#TLPA]...[/TLPA] with indexed fields
  const tlpaArray = documents.map((doc, i) => ({
    STT: i + 1,
    "Loại tài liệu": doc.document_type ?? "",
    "Số tài liệu": doc.number ?? "",
    "Cơ quan cấp": doc.issuing_authority ?? "",
    "Ngày cấp": doc.issue_date ?? "",
    "Ghi chú": doc.notes ?? "",
    // Aliases for templates that use "TLPA." prefix
    "TLPA.Loại tài liệu": doc.document_type ?? "",
    "TLPA.Số tài liệu": doc.number ?? "",
    "TLPA.Cơ quan cấp": doc.issuing_authority ?? "",
    "TLPA.Ngày cấp": doc.issue_date ?? "",
    "TLPA.Ghi chú": doc.notes ?? "",
  }));

  data["TLPA"] = tlpaArray;

  // Flat fields for first document (backward compat)
  if (documents.length > 0) {
    const first = documents[0];
    data["TLPA.Loại tài liệu"] = first.document_type ?? "";
    data["TLPA.Số tài liệu"] = first.number ?? "";
    data["TLPA.Cơ quan cấp"] = first.issuing_authority ?? "";
    data["TLPA.Ngày cấp"] = first.issue_date ?? "";
    data["TLPA.Ghi chú"] = first.notes ?? "";
  }

  // Count
  data["TLPA.Số lượng"] = documents.length;
}
