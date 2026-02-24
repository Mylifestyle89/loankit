import type { FieldCatalogItem } from "@/lib/report/config-schema";

export type GroupedTreeNode = {
  parent: string;
  children: Array<{ fullPath: string; subgroup: string; fields: FieldCatalogItem[] }>;
};

export type ImportRow = {
  label_vi: string;
  group: string;
  rawType: string;
  rowNumber: number;
};

export type ImportMode = "append" | "overwrite";
export type MissingGroupDecision = "create_once" | "create_all" | "stop";

export type UseCaseError = {
  code: "NO_DATA" | "INVALID_HEADER" | "NO_ROWS" | "MISSING_GROUP_ABORTED";
  message: string;
  details?: Record<string, unknown>;
};

export type UseCaseResult<T> = { ok: true; data: T } | { ok: false; error: UseCaseError };

export function normalizeGroupPath(raw: string): string {
  return raw
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function normalizeImportedType(raw: string): FieldCatalogItem["type"] | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (["string", "chuỗi", "chuoi", "text", "chuoi ky tu"].includes(v)) return "text";
  if (["number", "số", "so", "numeric", "int", "float"].includes(v)) return "number";
  if (["percent", "phần trăm", "phan tram", "%", "ty le"].includes(v)) return "percent";
  if (["date", "ngày", "ngay", "ngay thang", "datetime"].includes(v)) return "date";
  if (["table", "bảng", "bang", "noi dung dai"].includes(v)) return "table";
  return null;
}

function collectKnownGroupPaths(catalog: FieldCatalogItem[]): Set<string> {
  const known = new Set<string>();
  for (const field of catalog) {
    const normalized = normalizeGroupPath(field.group ?? "");
    if (!normalized) continue;
    const parts = normalized.split("/");
    for (let i = 1; i <= parts.length; i += 1) {
      known.add(parts.slice(0, i).join("/"));
    }
  }
  return known;
}

export function parseCsvImportRows(fileText: string): UseCaseResult<ImportRow[]> {
  const lines = fileText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { ok: false, error: { code: "NO_DATA", message: "File không có dữ liệu." } };
  }

  const headerLine = lines[0];
  const commaParts = headerLine.split(",").length;
  const semicolonParts = headerLine.split(";").length;
  const delimiter = semicolonParts > 1 && semicolonParts >= commaParts ? ";" : ",";
  const header = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
  const idxName = header.findIndex((h) => h === "tên field" || h === "ten field" || h === "label" || h === "label_vi");
  const idxGroup = header.findIndex((h) => h === "nhóm" || h === "nhom" || h === "group");
  const idxType = header.findIndex((h) => h === "loại" || h === "loai" || h === "type");
  if (idxName === -1 || idxGroup === -1 || idxType === -1) {
    return { ok: false, error: { code: "INVALID_HEADER", message: "Header phải có 3 cột: Tên field / Nhóm / Loại." } };
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(delimiter).map((c) => c.trim());
    rows.push({
      label_vi: cols[idxName] ?? "",
      group: cols[idxGroup] ?? "",
      rawType: cols[idxType] ?? "",
      rowNumber: i + 1,
    });
  }
  return { ok: true, data: rows };
}

export function parseXlsxImportRows(rowsRaw: Record<string, unknown>[]): UseCaseResult<ImportRow[]> {
  if (rowsRaw.length === 0) {
    return { ok: false, error: { code: "NO_DATA", message: "File không có dữ liệu." } };
  }
  return {
    ok: true,
    data: rowsRaw.map((row, idx) => ({
      label_vi:
        (row["Tên field"] as string) ||
        (row["ten field"] as string) ||
        (row["Label"] as string) ||
        (row["label_vi"] as string) ||
        "",
      group: (row["Nhóm"] as string) || (row["nhom"] as string) || (row["group"] as string) || "",
      rawType: (row["Loại"] as string) || (row["loai"] as string) || (row["type"] as string) || "",
      rowNumber: idx + 2,
    })),
  };
}

async function ensureGroupExists(
  row: ImportRow,
  normalizedGroupPath: string,
  knownGroupPaths: Set<string>,
  skipFurtherPromptsRef: { value: boolean },
  resolveMissingGroup: (payload: {
    rowNumber: number;
    missingPath: string;
    level: "parent" | "subgroup";
  }) => Promise<MissingGroupDecision>,
): Promise<UseCaseResult<null>> {
  const segments = normalizedGroupPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { ok: false, error: { code: "MISSING_GROUP_ABORTED", message: "Group không hợp lệ." } };
  }

  for (let depth = 1; depth <= segments.length; depth += 1) {
    const pathAtDepth = segments.slice(0, depth).join("/");
    if (knownGroupPaths.has(pathAtDepth)) continue;
    if (!skipFurtherPromptsRef.value) {
      const decision = await resolveMissingGroup({
        rowNumber: row.rowNumber,
        missingPath: pathAtDepth,
        level: depth === 1 ? "parent" : "subgroup",
      });
      if (decision === "stop") {
        return {
          ok: false,
          error: {
            code: "MISSING_GROUP_ABORTED",
            message: `Đã dừng import tại dòng ${row.rowNumber}.`,
            details: { rowNumber: row.rowNumber, missingPath: pathAtDepth },
          },
        };
      }
      if (decision === "create_all") {
        skipFurtherPromptsRef.value = true;
      }
    }
    knownGroupPaths.add(pathAtDepth);
  }
  return { ok: true, data: null };
}

export async function processImportRows(params: {
  currentCatalog: FieldCatalogItem[];
  rows: ImportRow[];
  mode: ImportMode;
  resolveMissingGroup: (payload: {
    rowNumber: number;
    missingPath: string;
    level: "parent" | "subgroup";
  }) => Promise<MissingGroupDecision>;
  buildFieldKey: (args: { group: string; labelVi: string; existingKeys: string[] }) => string;
}): Promise<UseCaseResult<{ nextCatalog: FieldCatalogItem[]; importedCount: number; overwrittenCount: number }>> {
  const nextCatalog = [...params.currentCatalog];
  const existingKeys = nextCatalog.map((f) => f.field_key);
  const imported: FieldCatalogItem[] = [];
  let overwrittenCount = 0;
  const knownGroupPaths = collectKnownGroupPaths(nextCatalog);
  const skipFurtherPromptsRef = { value: false };
  const existingFieldIdentity = new Map<string, number>();

  nextCatalog.forEach((f, index) => {
    existingFieldIdentity.set(
      `${normalizeGroupPath(f.group ?? "").toLowerCase()}|${(f.label_vi ?? "").toLowerCase()}`,
      index,
    );
  });

  for (const row of params.rows) {
    const label_vi = String(row.label_vi ?? "").trim();
    const group = normalizeGroupPath(String(row.group ?? ""));
    const rawType = String(row.rawType ?? "").trim();
    if (!label_vi || !group || !rawType) continue;

    const type = normalizeImportedType(rawType);
    if (!type) continue;

    const groupCheck = await ensureGroupExists(
      row,
      group,
      knownGroupPaths,
      skipFurtherPromptsRef,
      params.resolveMissingGroup,
    );
    if (!groupCheck.ok) return groupCheck;

    const identityKey = `${group.toLowerCase()}|${label_vi.toLowerCase()}`;
    const existingIndex = existingFieldIdentity.get(identityKey);
    if (existingIndex != null) {
      if (params.mode === "overwrite") {
        const prev = nextCatalog[existingIndex];
        nextCatalog[existingIndex] = {
          ...prev,
          label_vi,
          group,
          type,
        };
        overwrittenCount += 1;
      }
      continue;
    }

    const field_key = params.buildFieldKey({ group, labelVi: label_vi, existingKeys });
    existingKeys.push(field_key);

    const newItem: FieldCatalogItem = {
      field_key,
      label_vi,
      group,
      type,
      required: false,
      normalizer: "",
      examples: [],
    };
    imported.push(newItem);
    nextCatalog.push(newItem);
    existingFieldIdentity.set(identityKey, nextCatalog.length - 1);
  }

  if (imported.length === 0 && overwrittenCount === 0) {
    return { ok: false, error: { code: "NO_ROWS", message: "Không import được field nào từ file." } };
  }

  return {
    ok: true,
    data: {
      nextCatalog,
      importedCount: imported.length,
      overwrittenCount,
    },
  };
}

export function buildGroupedFieldTree(params: {
  visibleFieldCatalog: FieldCatalogItem[];
  customGroups: string[];
  searchTerm: string;
}): GroupedTreeNode[] {
  const normalizedQuery = params.searchTerm.trim().toLowerCase();
  const groupedFieldMap = new Map<string, FieldCatalogItem[]>();

  for (const item of params.visibleFieldCatalog) {
    if (normalizedQuery) {
      const inLabel = item.label_vi.toLowerCase().includes(normalizedQuery);
      const inKey = item.field_key.toLowerCase().includes(normalizedQuery);
      const inGroup = item.group.toLowerCase().includes(normalizedQuery);
      if (!inLabel && !inKey && !inGroup) continue;
    }
    const list = groupedFieldMap.get(item.group) ?? [];
    groupedFieldMap.set(item.group, [...list, item]);
  }

  const tree = new Map<string, Array<{ fullPath: string; subgroup: string; fields: FieldCatalogItem[] }>>();
  const baseGroupPaths = new Set<string>([
    ...groupedFieldMap.keys(),
    ...params.customGroups.map((group) => group.trim()).filter(Boolean),
  ]);

  for (const groupPath of baseGroupPaths) {
    if (normalizedQuery && !groupPath.toLowerCase().includes(normalizedQuery) && !groupedFieldMap.has(groupPath)) {
      continue;
    }
    const fields = groupedFieldMap.get(groupPath) ?? [];
    const parts = groupPath
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const parent = parts[0] ?? groupPath;
    const subgroup = parts.slice(1).join("/");
    const siblings = tree.get(parent) ?? [];
    tree.set(parent, [...siblings, { fullPath: groupPath, subgroup, fields }]);
  }

  return Array.from(tree.entries())
    .map(([parent, children]) => ({
      parent,
      children: [...children].sort((a, b) => {
        if (!a.subgroup && b.subgroup) return -1;
        if (a.subgroup && !b.subgroup) return 1;
        return a.subgroup.localeCompare(b.subgroup, "vi");
      }),
    }))
    .sort((a, b) => a.parent.localeCompare(b.parent, "vi"));
}

