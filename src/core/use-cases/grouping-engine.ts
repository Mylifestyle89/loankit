import { ValidationError } from "@/core/errors/app-error";

export type GroupedDataRow<T extends Record<string, unknown>> = T & {
  [repeatKey: string]: T[];
};

function toBucketKey(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function groupDataByField<T extends Record<string, unknown>>(
  rows: T[],
  groupKey: string,
  repeatKey: string,
): Array<GroupedDataRow<T>> {
  if (!Array.isArray(rows)) {
    throw new ValidationError("rows must be an array.");
  }
  if (!groupKey || !groupKey.trim()) {
    throw new ValidationError("groupKey is required.");
  }
  if (!repeatKey || !repeatKey.trim()) {
    throw new ValidationError("repeatKey is required.");
  }

  const key = groupKey.trim();
  const childKey = repeatKey.trim();
  const grouped = new Map<string, GroupedDataRow<T>>();

  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }

    const groupVal = row[key];
    const bucketKey = toBucketKey(groupVal);
    if (!bucketKey) {
      continue;
    }

    const existing = grouped.get(bucketKey);
    if (!existing) {
      const base = { ...row } as GroupedDataRow<T>;
      (base as Record<string, unknown>)[childKey] = [{ ...row }];
      grouped.set(bucketKey, base);
      continue;
    }

    const items = ((existing as Record<string, unknown>)[childKey] as T[]) ?? [];
    (existing as Record<string, unknown>)[childKey] = [...items, { ...row }];
  }

  return Array.from(grouped.values());
}
