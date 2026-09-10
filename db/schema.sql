-- Vercel Postgres 建表脚本
--
-- 执行方式任选其一：
--   1) npm run db:init                 （读取 .env.local，脚本自动执行本文件）
--   2) 部署后访问 POST /api/init        （用运行时注入的连接串执行同样语句）
--   3) psql "$POSTGRES_URL" -f db/schema.sql
--
-- 内容与 lib/db.ts 里的 CREATE_TABLE_SQL 保持一致，改这边记得同步改那边。

CREATE TABLE IF NOT EXISTS notes (
  id          SERIAL       PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);

-- 首次初始化时塞一条示例数据，方便确认链路通了
INSERT INTO notes (title, content)
SELECT '第一笔记', '如果你能看到这行字，说明 Next.js 已经成功连上 Vercel Postgres。'
WHERE NOT EXISTS (SELECT 1 FROM notes);
