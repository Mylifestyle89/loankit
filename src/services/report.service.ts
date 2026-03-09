/**
 * Report service facade — re-exports all sub-services as a single object
 * so that 43+ API route files continue importing `reportService` unchanged.
 */
import { templateService } from "./report/template.service";
import { fieldValuesService } from "./report/field-values.service";
import { mappingService } from "./report/mapping.service";
import { masterTemplateService } from "./report/master-template.service";
import { mappingInstanceService } from "./report/mapping-instance.service";
import { buildService } from "./report/build.service";
import { dataIoService } from "./report/data-io.service";
import { snapshotService } from "./report/snapshot.service";

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

export const reportService = {
  ...templateService,
  ...fieldValuesService,
  ...mappingService,
  ...masterTemplateService,
  ...mappingInstanceService,
  ...buildService,
  ...dataIoService,
  ...snapshotService,
};
