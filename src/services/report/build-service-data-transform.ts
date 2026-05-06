/**
 * Data transformation helpers — flatten asset properties, process repeater arrays,
 * add label_vi aliases, and produce the merged flat file.
 */
import { docxEngine } from "@/lib/docx-engine";
import { REPORT_MERGED_FLAT_FILE } from "@/lib/report/constants";
import { mergeFlatWithManualValues } from "@/lib/report/manual-values";

import { safeWriteJson, slugifyVi } from "./build-service-helpers";
import { resolveValuesForLoan } from "./values-resolver";

// ---------------------------------------------------------------------------
// Asset property flattening
// ---------------------------------------------------------------------------

/**
 * Flatten AssetProperties [{Key,Value}] in each array item to direct key→value pairs.
 * E.g. {Title: "X", AssetProperties: [{Key: "Họ và tên", Value: "A"}]}
 * → {Title: "X", "Họ và tên": "A"}
 */
export function flattenAssetProperties(items: unknown[]): Record<string, unknown>[] {
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((obj) => {
      const flat: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === "AssetProperties" && Array.isArray(v)) {
          for (const prop of v) {
            if (prop && typeof prop === "object" && "Key" in prop) {
              const key = String((prop as Record<string, unknown>).Key);
              flat[key] = (prop as Record<string, unknown>).Value;
            }
          }
        } else {
          flat[k] = v;
        }
      }
      return flat;
    });
}

// ---------------------------------------------------------------------------
// Repeater array processing
// ---------------------------------------------------------------------------

/**
 * Process all array values in mergedFlat:
 * 1. Flatten AssetProperties in each item
 * 2. Overlay scalar manual values from field_catalog into array items
 * 3. Add Vietnamese slug aliases for arrays (from Title of first item)
 * 4. Within each item, add label_vi aliases from field_catalog
 */
export function processRepeaterArrays(
  mergedFlat: Record<string, unknown>,
  fieldCatalog: Array<{ field_key: string; label_vi: string; group: string }>,
): void {
  // Build map: group slug → list of {field_key, label_vi, suffix}
  const groupFieldMap = new Map<string, Array<{ field_key: string; label_vi: string; suffix: string }>>();
  for (const f of fieldCatalog) {
    if (!f.group || !f.label_vi) continue;
    const slug = slugifyVi(f.group);
    if (!groupFieldMap.has(slug)) groupFieldMap.set(slug, []);
    // Extract the part after the prefix (e.g., "BLĐ.Chức danh" → "Chức danh")
    const dotIdx = f.label_vi.indexOf(".");
    const suffix = dotIdx >= 0 ? f.label_vi.slice(dotIdx + 1).trim() : f.label_vi.trim();
    groupFieldMap.get(slug)!.push({ field_key: f.field_key, label_vi: f.label_vi, suffix });
  }

  for (const [key, val] of Object.entries(mergedFlat)) {
    if (!Array.isArray(val) || val.length === 0) continue;
    const first = val[0];
    if (!first || typeof first !== "object" || Array.isArray(first)) continue;

    // 1. Flatten AssetProperties
    const hasAssetProps = val.some(
      (item) => item && typeof item === "object" && "AssetProperties" in (item as Record<string, unknown>),
    );
    const flatItems = hasAssetProps ? flattenAssetProperties(val) : (val as Record<string, unknown>[]);
    mergedFlat[key] = flatItems;

    // 2. Add slug alias from Title field OR array key name
    const firstFlat = flatItems[0] as Record<string, unknown> | undefined;
    const title = firstFlat && typeof firstFlat === "object" ? firstFlat.Title : undefined;
    let arraySlug = "";
    if (title && typeof title === "string") {
      arraySlug = slugifyVi(title);
    }
    // Fallback: slugify the array key name itself (e.g., "Người có liên quan" → "Nguoi_co_lien_quan")
    if (!arraySlug) {
      arraySlug = slugifyVi(key);
    }
    if (arraySlug && !(arraySlug in mergedFlat) && arraySlug !== key) {
      mergedFlat[arraySlug] = flatItems;
    }

    // 3. Overlay scalar manual values from field_catalog into array items
    //    E.g., user fills custom.ban_lanh_dao.bld_chuc_danh = "Phó GĐ"
    //    → overlay "Chức danh" = "Phó GĐ" into first array item
    const fieldEntries = arraySlug ? groupFieldMap.get(arraySlug) : undefined;
    if (fieldEntries) {
      for (const item of flatItems) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        for (const { field_key, suffix } of fieldEntries) {
          // Try scalar value from mergedFlat first
          const manualVal = mergedFlat[field_key];
          if (manualVal !== undefined && manualVal !== null && manualVal !== "") {
            rec[suffix] = manualVal;
          }
        }
      }
    }

    // 4. Within each item, add label_vi aliases and suffix aliases
    //    Map from item's field_key (e.g., "custom.nguoi_co_lien_quan.nlq_ma_khach_hang")
    //    → suffix ("Mã khách hàng") AND label_vi ("NLQ.Mã khách hàng")
    if (fieldEntries) {
      for (const item of flatItems) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        for (const { field_key, label_vi, suffix } of fieldEntries) {
          // Resolve value: prefer suffix (from step 3), then field_key in item
          const val = rec[suffix] ?? rec[field_key];
          if (val !== undefined) {
            if (!(suffix in rec)) rec[suffix] = val;
            if (!(label_vi in rec)) rec[label_vi] = val;
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Label alias injection
// ---------------------------------------------------------------------------

/**
 * Add label_vi → value aliases to flat data so docxtemplater can resolve
 * both technical keys (e.g. [A.credit.rating_agribank]) and Vietnamese
 * labels (e.g. [Xếp hạng tại Agribank]) pasted from the PlaceholderSidebar.
 */
export function addLabelViAliases(
  mergedFlat: Record<string, unknown>,
  fieldCatalog: Array<{ field_key: string; label_vi: string; group: string }>,
): void {
  // Process repeater arrays first (flatten AssetProperties, add aliases)
  processRepeaterArrays(mergedFlat, fieldCatalog);

  // Then add scalar aliases
  for (const field of fieldCatalog) {
    if (!field.label_vi) continue;
    const val = mergedFlat[field.field_key];
    // Only add alias for non-array values (arrays are handled by processRepeaterArrays)
    if (val !== undefined && !Array.isArray(val) && !(field.label_vi in mergedFlat)) {
      mergedFlat[field.label_vi] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// Merged flat file production
// ---------------------------------------------------------------------------

/**
 * After the Python pipeline regenerates report_draft_flat.json with BK data,
 * this function immediately merges manual_values.json on top so that
 * user-entered data (including repeater arrays) is never lost.
 * The merged result is written to report_merged_flat.json.
 */
export async function produceMergedFlat(
  fieldCatalog: Array<{ field_key: string; label_vi: string; group: string }>,
  loanId?: string | null,
): Promise<void> {
  try {
    const baseFlat = await docxEngine.readJson<Record<string, unknown>>("report_assets/generated/report_draft_flat.json");
    // Phase 4: DB-first via valuesService(loanId) when available, FS fallback gated.
    const manualValues = await resolveValuesForLoan(loanId ?? null);
    const mergedFlat = mergeFlatWithManualValues(baseFlat, manualValues);
    addLabelViAliases(mergedFlat, fieldCatalog);
    await safeWriteJson(REPORT_MERGED_FLAT_FILE, mergedFlat);
  } catch (e) {
    console.error("[Build] Failed to produce merged flat file after build:", e);
  }
}
