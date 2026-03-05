import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { toHttpError } from "@/core/errors/app-error";
import { beneficiaryService } from "@/services/beneficiary.service";

export const runtime = "nodejs";

/** Header aliases for fuzzy matching */
const NAME_ALIASES = ["đơn vị thụ hưởng", "don vi thu huong", "ten", "name", "khách hàng"];
const ACCOUNT_ALIASES = ["số tài khoản", "so tai khoan", "account", "stk"];
const BANK_ALIASES = ["ngân hàng thụ hưởng", "ngan hang", "bank", "ngân hàng"];

function matchHeader(header: string, aliases: string[]): boolean {
  const normalized = header.toLowerCase().trim();
  return aliases.some((a) => normalized.includes(a));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: loanId } = await params;
    const contentType = req.headers.get("content-type") ?? "";

    let items: { name: string; accountNumber?: string; bankName?: string }[];

    if (contentType.includes("application/json")) {
      // JSON payload (client-side parsed)
      const body = await req.json();
      items = Array.isArray(body.items) ? body.items : [];
    } else {
      // Multipart file upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        return NextResponse.json({ ok: false, error: "Empty spreadsheet." }, { status: 400 });
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
      if (rows.length === 0) {
        return NextResponse.json({ ok: false, error: "No data rows found." }, { status: 400 });
      }

      const headers = Object.keys(rows[0]);
      const nameCol = headers.find((h) => matchHeader(h, NAME_ALIASES));
      const accountCol = headers.find((h) => matchHeader(h, ACCOUNT_ALIASES));
      const bankCol = headers.find((h) => matchHeader(h, BANK_ALIASES));

      if (!nameCol) {
        return NextResponse.json(
          { ok: false, error: `Cannot find name column. Headers: ${headers.join(", ")}` },
          { status: 400 },
        );
      }

      items = rows.map((row) => ({
        name: String(row[nameCol] ?? "").trim(),
        accountNumber: accountCol ? String(row[accountCol] ?? "").trim() : undefined,
        bankName: bankCol ? String(row[bankCol] ?? "").trim() : undefined,
      }));
    }

    const result = await beneficiaryService.bulkCreate(loanId, items);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to import beneficiaries.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
