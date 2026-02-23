/**
 * Quét file alias (mặc định report_assets/placeholder_alias_2268.json) và in ra các nhóm alias trùng tên (sau chuẩn hóa).
 * Chạy: node scripts/scan-duplicate-aliases.js [đường-dẫn-file-alias]
 * Ví dụ mẫu "Pháp nhân ngắn hạn hạn mức": node scripts/scan-duplicate-aliases.js report_assets/placeholder_alias_2268.json
 */

const fs = require("fs");
const path = require("path");

function normalizeAliasKey(key) {
  return key.trim().replace(/:+$/, "").toLowerCase();
}

function getDuplicateAliasGroups(aliasMap) {
  const byNormalized = {};
  for (const key of Object.keys(aliasMap)) {
    const n = normalizeAliasKey(key);
    if (!byNormalized[n]) byNormalized[n] = [];
    byNormalized[n].push(key);
  }
  const duplicates = {};
  for (const [norm, keys] of Object.entries(byNormalized)) {
    if (keys.length > 1) duplicates[norm] = keys;
  }
  return duplicates;
}

const aliasPath = process.argv[2] || path.join(process.cwd(), "report_assets/placeholder_alias_2268.json");
const absolutePath = path.isAbsolute(aliasPath) ? aliasPath : path.join(process.cwd(), aliasPath);

if (!fs.existsSync(absolutePath)) {
  console.error("File không tồn tại:", absolutePath);
  process.exit(1);
}

const raw = fs.readFileSync(absolutePath, "utf-8");
let aliasMap;
try {
  aliasMap = JSON.parse(raw);
} catch (e) {
  console.error("JSON không hợp lệ:", e.message);
  process.exit(1);
}

const duplicates = getDuplicateAliasGroups(aliasMap);
const entries = Object.entries(duplicates);

console.log("=== Quét alias trùng (mẫu / file:", aliasPath, ") ===\n");
if (entries.length === 0) {
  console.log("Không có nhóm alias trùng tên.");
  process.exit(0);
}

console.log("Tìm thấy", entries.length, "nhóm alias trùng (chuẩn hóa: bỏ khoảng trắng thừa, bỏ dấu hai chấm cuối).\n");
entries.forEach(([normalized, keys]) => {
  console.log('Chuẩn hóa: "' + normalized + '"');
  keys.forEach((k) => console.log('  - "' + k + '"'));
  console.log("");
});

process.exit(0);
