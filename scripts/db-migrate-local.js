const path = require("path");
const { spawnSync } = require("child_process");

const localDbPath = path.resolve(process.cwd(), "dev.db");
const localDbUrl = `file:${localDbPath}`;

console.log(`[db:migrate:local] DATABASE_URL=${localDbUrl}`);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: localDbUrl,
  },
});

if (result.error) {
  console.error("[db:migrate:local] Failed:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
