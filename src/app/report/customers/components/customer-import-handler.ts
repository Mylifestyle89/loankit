/** Handles file import logic for .bk, .xlsx/.xls, and .json customer files */

type ImportResult = {
  customers: number;
  templates: number;
  loans?: number;
  disbursements?: number;
  invoices?: number;
};

type ImportOutcome = { success: string } | { error: string };

export async function handleCustomerImport(file: File): Promise<ImportOutcome> {
  const isBk = file.name.endsWith(".bk");
  const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

  if (isBk) {
    return importBkFile(file);
  }
  return importJsonOrXlsx(file, isXlsx);
}

/** Import .bk file: parse clients, save each individually */
async function importBkFile(file: File): Promise<ImportOutcome> {
  const formData = new FormData();
  formData.append("bkFile", file);
  const bkRes = await fetch("/api/report/import/bk", { method: "POST", body: formData });
  const bkData = (await bkRes.json()) as {
    status: string; message?: string;
    clients?: { status: string; values: Record<string, unknown>; assetGroups?: Record<string, Record<string, string>[]> }[];
  };
  if (bkData.status === "error") return { error: bkData.message || "Import .bk failed" };

  const clientList = (bkData.clients ?? []).filter((c) => c.status !== "error");
  if (clientList.length === 0) return { error: "Không tìm thấy khách hàng hợp lệ trong file .bk" };

  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  const names: string[] = [];

  for (const client of clientList) {
    const name = (client.values?.["A.general.customer_name"] as string) || "Không rõ tên";
    try {
      const saveRes = await fetch("/api/customers/from-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: client.values, assetGroups: client.assetGroups }),
      });
      const saveData = (await saveRes.json()) as { ok: boolean; error?: string; created?: boolean };
      if (!saveData.ok) { errors.push(saveData.error || "Lưu thất bại"); continue; }
      if (saveData.created) created++; else updated++;
      names.push(name);
    } catch {
      errors.push("Lỗi lưu khách hàng");
    }
  }

  const parts: string[] = [];
  if (created > 0) parts.push(`tạo mới ${created}`);
  if (updated > 0) parts.push(`cập nhật ${updated}`);
  if (errors.length > 0) parts.push(`${errors.length} lỗi`);
  const nameInfo = names.length <= 5 ? `: ${names.join(", ")}` : "";
  return { success: `Import .bk: ${parts.join(", ")} (tổng ${clientList.length} khách hàng${nameInfo}).` };
}

/** Import JSON or XLSX file via /api/report/import-data */
async function importJsonOrXlsx(file: File, isXlsx: boolean): Promise<ImportOutcome> {
  let res: Response;
  if (isXlsx) {
    const formData = new FormData();
    formData.append("file", file);
    res = await fetch("/api/report/import-data", { method: "POST", body: formData });
  } else {
    const text = await file.text();
    const parsed = JSON.parse(text);
    res = await fetch("/api/report/import-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
  }

  const data = (await res.json()) as { ok: boolean; error?: string; imported?: ImportResult };
  if (!data.ok) return { error: data.error || "Import failed" };

  const imp = data.imported!;
  const parts = [`${imp.customers} khách hàng`, `${imp.templates} mẫu dữ liệu`];
  if (imp.loans) parts.push(`${imp.loans} khoản vay`);
  if (imp.disbursements) parts.push(`${imp.disbursements} giải ngân`);
  if (imp.invoices) parts.push(`${imp.invoices} hoá đơn`);
  return { success: `Đã import thành công: ${parts.join(", ")}.` };
}
