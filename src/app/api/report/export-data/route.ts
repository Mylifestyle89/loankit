import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadState } from "@/lib/report/fs-store";

export async function GET(req: NextRequest) {
    try {
        const customers = await prisma.customer.findMany();
        const state = await loadState();

        const exportData = {
            version: "1.0",
            exported_at: new Date().toISOString(),
            customers: customers,
            field_templates: state.field_templates || [],
            field_catalog: state.field_catalog || []
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="data_export_${Date.now()}.json"`,
            },
        });
    } catch (error) {
        console.error("Lỗi khi xuất dữ liệu:", error);
        return NextResponse.json({ ok: false, error: "Failed to export data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { customerIds, templateIds } = body;

        let customers: any[] = [];
        if (Array.isArray(customerIds) && customerIds.length > 0) {
            customers = await prisma.customer.findMany({
                where: { id: { in: customerIds } }
            });
        }

        const state = await loadState();
        let field_templates: any[] = [];
        if (Array.isArray(templateIds) && templateIds.length > 0) {
            field_templates = (state.field_templates || []).filter(t => templateIds.includes(t.id));
        }

        const exportData = {
            version: "1.0",
            exported_at: new Date().toISOString(),
            customers: customers,
            field_templates: field_templates,
            field_catalog: state.field_catalog || []
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="data_export_${Date.now()}.json"`,
            },
        });
    } catch (error) {
        console.error("Lỗi khi xuất dữ liệu:", error);
        return NextResponse.json({ ok: false, error: "Failed to export data" }, { status: 500 });
    }
}
