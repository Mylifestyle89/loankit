/**
 * Template profile operations — register/remove DOCX template profiles and build inventory.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
import {
  frameworkStateSchema,
  type FieldTemplate,
} from "@/lib/report/config-schema";
import {
  loadState,
  readAliasFile,
  saveState,
  updateTemplateInventory,
} from "@/lib/report/fs-store";
import {
  parseDocxPlaceholderInventory,
  suggestAliasForPlaceholder,
} from "@/lib/report/template-parser";

import { mapDocxError } from "./_shared";

export async function registerTemplateProfile(input: { templateName: string; docxPath: string }) {
  const name = (input.templateName ?? "").trim();
  if (!name) throw new ValidationError("Tên mẫu là bắt buộc.");
  if (!input.docxPath) throw new ValidationError("Đường dẫn file DOCX là bắt buộc.");

  const state = await loadState();

  // Check for duplicate docx_path
  const existing = state.template_profiles.find((p) => p.docx_path === input.docxPath);
  if (existing) throw new ValidationError(`File này đã được đăng ký: "${existing.template_name}".`);

  const profile = {
    id: `template-${Date.now()}`,
    template_name: name,
    docx_path: input.docxPath,
    placeholder_inventory_path: "",
    active: state.template_profiles.length === 0, // auto-activate if first
  };

  state.template_profiles.push(profile);
  if (profile.active) state.active_template_id = profile.id;
  await saveState(state);

  return {
    profile,
    templates: state.template_profiles,
    activeTemplateId: state.active_template_id,
  };
}

export async function removeTemplateProfile(templateId: string) {
  if (!templateId) throw new ValidationError("template_id là bắt buộc.");

  const state = await loadState();
  const idx = state.template_profiles.findIndex((p) => p.id === templateId);
  if (idx === -1) throw new NotFoundError("Không tìm thấy template profile.");

  state.template_profiles.splice(idx, 1);

  // If removed template was active, activate the first remaining one
  if (state.active_template_id === templateId) {
    state.active_template_id = state.template_profiles[0]?.id ?? "";
  }

  await saveState(state);

  return {
    templates: state.template_profiles,
    activeTemplateId: state.active_template_id,
  };
}

export async function buildTemplateInventory(templateId: string) {
  if (!templateId) throw new ValidationError("template_id is required.");
  const state = await loadState();
  const template = state.template_profiles.find((item) => item.id === templateId);
  if (!template) throw new NotFoundError("Template not found.");

  const inventory = await parseDocxPlaceholderInventory(template.docx_path);
  const inventoryFile = `report_assets/config/inventories/${template.id}.json`;
  try {
    await docxEngine.writeJson(inventoryFile, inventory);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EROFS" && code !== "EPERM" && code !== "ENOENT") throw err;
  }
  await updateTemplateInventory(template.id, inventoryFile);

  const activeVersion = state.mapping_versions.find(
    (item) => item.id === state.active_mapping_version_id,
  );
  const aliasMap = activeVersion ? await readAliasFile(activeVersion.alias_json_path) : {};
  const fieldKeys = state.field_catalog.map((item) => item.field_key);
  const suggestions = inventory.placeholders.map((placeholder) => ({
    placeholder,
    current_alias: aliasMap[placeholder] ?? null,
    suggestions: suggestAliasForPlaceholder(placeholder, fieldKeys),
  }));
  return { inventoryPath: inventoryFile, inventory, suggestions };
}

export async function saveTemplateDocx(input: { relPath: string; buffer: Buffer; mode: "backup" | "save" }) {
  try {
    return await docxEngine.saveDocxWithBackup(input);
  } catch (error) {
    mapDocxError(error);
  }
}

/** Danh sách file backup state-config (framework_state-*.json), mới nhất trước */
export async function listStateBackups(): Promise<{ filename: string; label: string }[]> {
  const backupDir = path.join(process.cwd(), "report_assets", "backups", "state-config");
  try {
    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && e.name.endsWith(".json") && e.name.startsWith("framework_state-"))
      .map((e) => e.name)
      .sort()
      .reverse();
    return files.map((filename) => ({
      filename,
      label: filename.replace(/^framework_state-|\.json$/g, ""),
    }));
  } catch {
    return [];
  }
}

/** Đọc nội dung một file backup và trả về field_templates để import ngược vào template */
export async function getStateBackupContent(filename: string): Promise<{ field_templates: FieldTemplate[] }> {
  if (!filename || !filename.startsWith("framework_state-") || !filename.endsWith(".json")) {
    throw new ValidationError("Tên file backup không hợp lệ.");
  }
  const backupDir = path.join(process.cwd(), "report_assets", "backups", "state-config");
  const absolute = path.join(backupDir, filename);
  const raw = await fs.readFile(absolute, "utf-8");
  const parsed = frameworkStateSchema.parse(JSON.parse(raw) as unknown);
  return {
    field_templates: parsed.field_templates ?? [],
  };
}
