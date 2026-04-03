/**
 * Template service — state management, template profiles, and field-template CRUD.
 * Composed from sub-modules; re-exports as `templateService` object for backward compat.
 */
import { ValidationError } from "@/core/errors/app-error";
import {
  loadState,
  saveState,
  setActiveTemplate as fsSetActiveTemplate,
} from "@/lib/report/fs-store";

import {
  listFieldTemplates,
  createFieldTemplate,
  updateFieldTemplate,
  attachTemplateToCustomer,
} from "./template-field-operations.service";
import {
  registerTemplateProfile,
  removeTemplateProfile,
  buildTemplateInventory,
  saveTemplateDocx,
  listStateBackups,
  getStateBackupContent,
} from "./template-profile-operations.service";

export const templateService = {
  async getState() {
    return loadState();
  },

  async loadRuns() {
    const state = await loadState();
    return state.run_logs;
  },

  async getTemplates() {
    const state = await loadState();
    return {
      templates: state.template_profiles,
      activeTemplateId: state.active_template_id,
    };
  },

  async setActiveTemplate(templateId: string) {
    if (!templateId) throw new ValidationError("template_id is required.");
    const state = await fsSetActiveTemplate(templateId);
    return {
      templates: state.template_profiles,
      activeTemplateId: state.active_template_id,
    };
  },

  async openBackupFolder() {
    const { docxEngine } = await import("@/lib/docx-engine");
    const backupDir = await docxEngine.openBackupFolder();
    return { backupDir };
  },

  // ── Field template operations ──
  listFieldTemplates,
  createFieldTemplate,
  updateFieldTemplate,
  attachTemplateToCustomer,

  // ── Profile operations ──
  buildTemplateInventory,
  saveTemplateDocx,
  registerTemplateProfile,
  removeTemplateProfile,
  listStateBackups,
  getStateBackupContent,
};
