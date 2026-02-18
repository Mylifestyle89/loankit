import { NextRequest, NextResponse } from "next/server";

import { aliasMapSchema, mappingMasterSchema } from "@/lib/report/config-schema";
import {
  createMappingDraft,
  getActiveMappingVersion,
  loadState,
  publishMappingVersion,
  readAliasFile,
  readMappingFile,
} from "@/lib/report/fs-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await loadState();
    const activeVersion = await getActiveMappingVersion(state);
    const mapping = await readMappingFile(activeVersion.mapping_json_path);
    const aliasMap = await readAliasFile(activeVersion.alias_json_path);
    return NextResponse.json({
      ok: true,
      active_version_id: activeVersion.id,
      versions: state.mapping_versions,
      mapping,
      alias_map: aliasMap,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load mapping." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      created_by?: string;
      notes?: string;
      mapping?: unknown;
      alias_map?: unknown;
    };
    const mapping = mappingMasterSchema.parse(body.mapping);
    const aliasMap = aliasMapSchema.parse(body.alias_map);
    const { state, version } = await createMappingDraft({
      createdBy: body.created_by ?? "web-user",
      notes: body.notes,
      mapping,
      aliasMap,
    });
    return NextResponse.json({
      ok: true,
      message: "Draft mapping saved.",
      version,
      active_version_id: state.active_mapping_version_id,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save mapping draft." },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { action?: string; version_id?: string };
    if (body.action !== "publish") {
      return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
    }
    if (!body.version_id) {
      return NextResponse.json({ ok: false, error: "version_id is required." }, { status: 400 });
    }
    const state = await publishMappingVersion(body.version_id);
    return NextResponse.json({
      ok: true,
      message: "Mapping version published.",
      active_version_id: state.active_mapping_version_id,
      versions: state.mapping_versions,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to publish mapping version." },
      { status: 400 },
    );
  }
}
