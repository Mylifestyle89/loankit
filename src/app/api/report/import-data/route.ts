import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadState, saveState } from "@/lib/report/fs-store";

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        if (!data.version || !data.customers || !data.field_templates) {
            return NextResponse.json({ ok: false, error: "Định dạng file không hợp lệ" }, { status: 400 });
        }

        // 1. Nhập Khách hàng (Merge by customer_code)
        let customersImported = 0;
        for (const customer of data.customers) {
            const existing = await prisma.customer.findUnique({
                where: { customer_code: customer.customer_code }
            });

            if (existing) {
                // Cập nhật khách hàng hiện tại
                await prisma.customer.update({
                    where: { id: existing.id },
                    data: {
                        customer_name: customer.customer_name,
                        address: customer.address,
                        main_business: customer.main_business,
                        charter_capital: customer.charter_capital,
                        legal_representative_name: customer.legal_representative_name,
                        legal_representative_title: customer.legal_representative_title,
                        organization_type: customer.organization_type,
                        data_json: customer.data_json
                    }
                });
            } else {
                // Tạo mới khách hàng
                await prisma.customer.create({
                    data: {
                        customer_code: customer.customer_code,
                        customer_name: customer.customer_name,
                        address: customer.address,
                        main_business: customer.main_business,
                        charter_capital: customer.charter_capital,
                        legal_representative_name: customer.legal_representative_name,
                        legal_representative_title: customer.legal_representative_title,
                        organization_type: customer.organization_type,
                        data_json: customer.data_json
                    }
                });
            }
            customersImported++;
        }

        // 2. Nhập Mẫu trường (Field Templates) và Field Catalog (Nếu có)
        const state = await loadState();
        const existingTemplatesMap = new Map((state.field_templates || []).map((t: any) => [t.id, t]));

        for (const tpl of data.field_templates) {
            existingTemplatesMap.set(tpl.id, tpl);
        }

        state.field_templates = Array.from(existingTemplatesMap.values());
        await saveState(state);

        return NextResponse.json({ ok: true, imported: { customers: customersImported, templates: data.field_templates.length } });
    } catch (error) {
        console.error("Lỗi khi nhập dữ liệu:", error);
        return NextResponse.json({ ok: false, error: "Nhập dữ liệu thất bại" }, { status: 500 });
    }
}
