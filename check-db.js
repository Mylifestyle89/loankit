const {PrismaBetterSqlite3}=require('@prisma/adapter-better-sqlite3');
const {PrismaClient}=require('@prisma/client');
const path = require('path');
const url = 'file:' + path.resolve(__dirname, 'dev.db');
const a=new PrismaBetterSqlite3({url});
const p=new PrismaClient({adapter:a});

async function main() {
  // Delete existing admin user and related records
  await p.$queryRawUnsafe("DELETE FROM session WHERE userId='ptcd11g9dF8tjSAuvsVDNccL2BHzUYav'");
  await p.$queryRawUnsafe("DELETE FROM account WHERE userId='ptcd11g9dF8tjSAuvsVDNccL2BHzUYav'");
  await p.$queryRawUnsafe("DELETE FROM user WHERE id='ptcd11g9dF8tjSAuvsVDNccL2BHzUYav'");
  console.log('Deleted old admin user');
  const users = await p.$queryRawUnsafe("SELECT id, email FROM user");
  console.log('Remaining users:', users);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
