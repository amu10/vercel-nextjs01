import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * 所有数据库操作都收敛在这里，页面 / API / Server Action 只调用本文件的函数。
 * 注意：本文件只能在服务端使用（Server Component、Route Handler、Server Action），
 * 不要 import 到带有 'use client' 的组件里。
 *
 * 驱动：@neondatabase/serverless（Neon 原生集成，Vercel 当前推荐方案）
 * - neon() 走 HTTP 协议，无需长连接，适合 Serverless / Edge
 * - 返回的是行数组本身，不是 { rows }
 * - 一次只能执行一条语句（事务请用 neon 的 transaction()，本例不需要）
 */

export type Note = {
  id: number;
  title: string;
  content: string;
  created_at: string;
};

/** 取连接串：Neon 原生集成注入 DATABASE_URL，旧 Vercel Postgres 注入 POSTGRES_URL */
function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

/** 判断连接串是否已注入，未配置时页面走降级提示而不是直接报错 */
export function isDbConfigured(): boolean {
  return Boolean(getConnectionString());
}

let cached: { url: string; sql: NeonQueryFunction<false, false> } | null = null;

/** 惰性创建客户端，避免模块加载时因缺少环境变量直接崩溃 */
function getSql(): NeonQueryFunction<false, false> {
  const url = getConnectionString();
  if (!url) {
    throw new Error('DATABASE_URL 未配置');
  }
  if (!cached || cached.url !== url) {
    cached = { url, sql: neon(url) };
  }
  return cached.sql;
}

/** 建表语句，与 db/schema.sql 保持一致。幂等，可重复执行。 */
export const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS notes (
  id          SERIAL       PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;

export const CREATE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);
`;

export async function initDb(): Promise<void> {
  const sql = getSql();
  // 传字符串（非模板标签）时要用 .query()，且一次只能一条语句
  await sql.query(CREATE_TABLE_SQL);
  await sql.query(CREATE_INDEX_SQL);
}

export async function listNotes(limit = 50): Promise<Note[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, content, created_at
    FROM notes
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Note[];
  return rows;
}

export async function createNote(title: string, content: string): Promise<Note> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO notes (title, content)
    VALUES (${title}, ${content})
    RETURNING id, title, content, created_at
  `) as Note[];
  return rows[0];
}

export async function deleteNote(id: number): Promise<number> {
  const sql = getSql();
  // Neon HTTP 驱动不返回 rowCount，用 RETURNING 判断到底删没删掉
  const rows = (await sql`
    DELETE FROM notes WHERE id = ${id} RETURNING id
  `) as { id: number }[];
  return rows.length;
}
