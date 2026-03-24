/**
 * CLI script: validate KHCN template registries against DOCX files.
 * Run: npx tsx scripts/validate-khcn-templates.ts
 *
 * Exit code 0 = pass, 1 = has errors (blocks build).
 */
import { validateKhcnTemplates } from "../src/lib/report/khcn-template-validator";

// ANSI color codes (no external dependency)
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function icon(severity: string): string {
  if (severity === "error") return `${RED}✘${RESET}`;
  if (severity === "warning") return `${YELLOW}⚠${RESET}`;
  return `${DIM}ℹ${RESET}`;
}

console.log(`\n${BOLD}[KHCN Template Validator]${RESET}`);
console.log("Scanning templates...\n");

const report = validateKhcnTemplates();
const { stats, issues } = report;

// Print stats
console.log(`  Templates checked:   ${stats.templatesChecked}`);
console.log(`  Tags scanned:        ${stats.tagsScanned}`);
console.log(`  Placeholders in reg: ${stats.placeholdersRegistered}`);
console.log("");

// Print issues
if (issues.length === 0) {
  console.log(`${GREEN}✔ All checks passed — no issues found.${RESET}\n`);
} else {
  for (const issue of issues) {
    const loc = issue.file ? ` ${DIM}← ${issue.file}${RESET}` : "";
    console.log(`  ${icon(issue.severity)} ${BOLD}${issue.code}${RESET}: ${issue.message}${loc}`);
  }
  console.log("");
}

// Summary
const parts: string[] = [];
if (stats.errors > 0) parts.push(`${RED}${stats.errors} error(s)${RESET}`);
if (stats.warnings > 0) parts.push(`${YELLOW}${stats.warnings} warning(s)${RESET}`);
if (stats.infos > 0) parts.push(`${DIM}${stats.infos} info(s)${RESET}`);
if (parts.length > 0) {
  console.log(`Summary: ${parts.join(", ")}`);
} else {
  console.log(`${GREEN}Summary: clean${RESET}`);
}
console.log("");

// Exit code: fail only on errors (warnings are non-blocking)
if (stats.errors > 0) {
  console.log(`${RED}Build blocked — fix errors above before deploying.${RESET}\n`);
  process.exit(1);
}
