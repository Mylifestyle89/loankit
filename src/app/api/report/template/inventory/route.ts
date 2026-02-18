import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { loadState, readAliasFile, updateTemplateInventory } from "@/lib/report/fs-store";
import { parseDocxPlaceholderInventory, suggestAliasForPlaceholder } from "@/lib/report/template-parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { template_id?: string };
    if (!body.template_id) {
      return NextResponse.json({ ok: false, error: "template_id is required." }, { status: 400 });
    }

    const state = await loadState();
    const template = state.template_profiles.find((item) => item.id === body.template_id);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Template not found." }, { status: 404 });
    }

    const inventory = await parseDocxPlaceholderInventory(template.docx_path);
    const inventoryFile = `report_assets/config/inventories/${template.id}.json`;
    await fs.writeFile(path.join(process.cwd(), inventoryFile), JSON.stringify(inventory, null, 2), "utf-8");
    await updateTemplateInventory(template.id, inventoryFile);

    const activeVersion = state.mapping_versions.find((item) => item.id === state.active_mapping_version_id);
    const aliasMap = activeVersion ? await readAliasFile(activeVersion.alias_json_path) : {};
    const fieldKeys = state.field_catalog.map((item) => item.field_key);
    const suggestions = inventory.placeholders.map((placeholder) => ({
      placeholder,
      current_alias: aliasMap[placeholder] ?? null,
      suggestions: suggestAliasForPlaceholder(placeholder, fieldKeys),
    }));

    return NextResponse.json({
      ok: true,
      inventory_path: inventoryFile,
      inventory,
      suggestions,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to build inventory." },
      { status: 500 },
    );
  }
}
