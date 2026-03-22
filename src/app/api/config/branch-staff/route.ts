import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const CONFIG_KEY = "branch_staff_config";

type BranchStaffConfig = {
  active_branch_id: string | null;
  relationship_officer: string | null;
  appraiser: string | null;
  approver_name: string | null;
  approver_title: string | null;
};

/** GET /api/config/branch-staff — get global branch & staff config */
export async function GET() {
  try {
    const row = await prisma.reportConfig.findUnique({ where: { key: CONFIG_KEY } });
    const config: BranchStaffConfig = row
      ? JSON.parse(row.valueJson)
      : { active_branch_id: null, relationship_officer: null, appraiser: null, approver_name: null, approver_title: null };
    return NextResponse.json({ ok: true, config });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** PUT /api/config/branch-staff — merge partial update, save & sync to all customers */
export async function PUT(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = await req.json() as Partial<BranchStaffConfig>;

    // Load existing config and merge with partial update
    const existing = await prisma.reportConfig.findUnique({ where: { key: CONFIG_KEY } });
    const prev: BranchStaffConfig = existing
      ? JSON.parse(existing.valueJson)
      : { active_branch_id: null, relationship_officer: null, appraiser: null, approver_name: null, approver_title: null };
    const config: BranchStaffConfig = {
      active_branch_id: body.active_branch_id !== undefined ? body.active_branch_id : prev.active_branch_id,
      relationship_officer: body.relationship_officer !== undefined ? body.relationship_officer : prev.relationship_officer,
      appraiser: body.appraiser !== undefined ? body.appraiser : prev.appraiser,
      approver_name: body.approver_name !== undefined ? body.approver_name : prev.approver_name,
      approver_title: body.approver_title !== undefined ? body.approver_title : prev.approver_title,
    };

    // Save global config
    await prisma.reportConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, valueJson: JSON.stringify(config) },
      update: { valueJson: JSON.stringify(config) },
    });

    // Sync to ALL existing customers
    await prisma.customer.updateMany({
      data: {
        active_branch_id: config.active_branch_id,
        relationship_officer: config.relationship_officer,
        appraiser: config.appraiser,
        approver_name: config.approver_name,
        approver_title: config.approver_title,
      },
    });

    return NextResponse.json({ ok: true, config });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
