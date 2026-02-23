/**
 * Chuẩn hóa tên alias để so sánh trùng (bỏ khoảng trắng thừa, bỏ dấu hai chấm thừa cuối).
 */
export function normalizeAliasKey(key: string): string {
  return key.trim().replace(/:+$/, "").toLowerCase();
}

/**
 * Nhóm các key trong alias map theo tên đã chuẩn hóa.
 * Trả về map: normalizedKey -> danh sách key gốc (chỉ nhóm có từ 2 key trở lên).
 */
export function getDuplicateAliasGroups(aliasMap: Record<string, unknown>): Record<string, string[]> {
  const byNormalized: Record<string, string[]> = {};
  for (const key of Object.keys(aliasMap)) {
    const n = normalizeAliasKey(key);
    if (!byNormalized[n]) byNormalized[n] = [];
    byNormalized[n].push(key);
  }
  const duplicates: Record<string, string[]> = {};
  for (const [norm, keys] of Object.entries(byNormalized)) {
    if (keys.length > 1) duplicates[norm] = keys;
  }
  return duplicates;
}

export function hasDuplicateAliases(aliasMap: Record<string, unknown>): boolean {
  return Object.keys(getDuplicateAliasGroups(aliasMap)).length > 0;
}
