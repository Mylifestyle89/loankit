/**
 * Seed script: populate LoanProduct table with Agribank credit products.
 *
 * Run: npx tsx prisma/seed-loan-products.ts
 */
import { prisma } from "../src/lib/prisma";

const PRODUCTS = [
  { code: "KHCN-VLD-TL",  name: "Cho vay bổ sung VLĐ ngắn hạn KHCN - từng lần",   customer_type: "individual", loan_method: "tung_lan",  sort_order: 1 },
  { code: "KHCN-VLD-HM",  name: "Cho vay bổ sung VLĐ ngắn hạn KHCN - hạn mức",    customer_type: "individual", loan_method: "han_muc",   sort_order: 2 },
  { code: "KHCN-TDH-KD",  name: "Cho vay đầu tư TSCĐ trung dài hạn KHCN",         customer_type: "individual", loan_method: "trung_dai", sort_order: 3 },
  { code: "KHCN-TD",      name: "Cho vay tiêu dùng KHCN",                           customer_type: "individual", loan_method: "tieu_dung", sort_order: 4 },
  { code: "KHCN-TD-KBD",  name: "Cho vay tiêu dùng không có TSBĐ",                  customer_type: "individual", loan_method: "trung_dai", sort_order: 5 },
  { code: "KHCN-TD-TC",   name: "Cho vay tiêu dùng thấu chi",                       customer_type: "individual", loan_method: "tieu_dung", sort_order: 6 },
  { code: "KHCN-CC",      name: "Cho vay cầm cố giấy tờ có giá",                    customer_type: "individual", loan_method: "tieu_dung", sort_order: 7 },
  { code: "KHDN-VLD",     name: "Cho vay bổ sung VLĐ KHDN",                         customer_type: "corporate",  loan_method: "han_muc",   sort_order: 8 },
  { code: "KHDN-TDH",     name: "Cho vay đầu tư TSCĐ trung dài hạn KHDN",          customer_type: "corporate",  loan_method: "trung_dai", sort_order: 9 },
] as const;

async function main() {
  console.log("Seeding loan products...");

  for (const p of PRODUCTS) {
    await prisma.loanProduct.upsert({
      where: { code: p.code },
      update: { name: p.name, customer_type: p.customer_type, loan_method: p.loan_method, sort_order: p.sort_order },
      create: { ...p, is_active: true },
    });
    console.log(`  ✓ ${p.code}: ${p.name}`);
  }

  console.log(`Done. ${PRODUCTS.length} products seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
