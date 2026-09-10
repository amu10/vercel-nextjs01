#!/usr/bin/env node
/**
 * 本地一键建表：npm run db:init
 *
 * 手动解析 .env.local / .env（避免为了一个脚本额外引入 dotenv 依赖），
 * 然后用 @neondatabase/serverless 执行 db/schema.sql。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const matched = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!matched) continue;
    let value = (matched[2] ?? '').trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // 已存在的环境变量优先（比如 Vercel CLI 注入的）
    if (!(matched[1] in process.env)) process.env[matched[1]] = value;
  }
}

loadEnvFile(path.join(root, '.env.local'));
loadEnvFile(path.join(root, '.env'));

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error(
    '✗ 未找到数据库连接串。请先复制 .env.example 为 .env.local 并填入 DATABASE_URL。'
  );
  process.exit(1);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(connectionString);

// Neon 的 HTTP 驱动一次只能跑一条语句，所以按分号拆开逐条执行。
// schema.sql 里没有字符串字面量包含分号的情况，简单拆分即可。
const statements = readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8')
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

try {
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`✓ 建表完成：notes（共执行 ${statements.length} 条语句）`);
} catch (error) {
  console.error('✗ 建表失败：', error.message);
  process.exit(1);
}
