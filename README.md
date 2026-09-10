# Next.js + Neon（Vercel Postgres）最小可运行示例

Next.js 15（App Router）+ TypeScript，用 Neon 官方驱动 `@neondatabase/serverless` 直连数据库，包含建表、列表、新增、删除，以及一组 REST 接口。

> Vercel 上的 "Postgres" 现在就是 Neon 原生集成，`@vercel/postgres` 已废弃，本项目直接用 Neon SDK。

## 目录结构

```
.
├── app/
│   ├── page.tsx              # 首页：服务端渲染笔记列表 + 表单
│   ├── actions.ts            # Server Actions：新增 / 删除 / 建表
│   ├── globals.css
│   ├── layout.tsx
│   └── api/
│       ├── init/route.ts     # POST 一键建表
│       └── notes/
│           ├── route.ts      # GET 列表 / POST 新增
│           └── [id]/route.ts # DELETE 删除
├── lib/db.ts                 # 全部 SQL 收敛在此，仅服务端可用
├── db/schema.sql             # 建表脚本（与 lib/db.ts 中的 CREATE_TABLE_SQL 同步）
├── scripts/init-db.mjs       # npm run db:init，本地建表
└── .env.example
```

## 一、本地跑起来

```bash
npm install
cp .env.example .env.local     # 填入 DATABASE_URL
npm run db:init                # 建表（幂等）
npm run dev                    # http://localhost:3000
```

连接串在 Neon 控制台的 Connection details 里复制（务必选 **Pooled connection**），长这样：

```
postgres://user:xxxx@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

> 没配 `DATABASE_URL` 时首页不会报错，而是显示配置指引；表不存在时会给出「一键建表」按钮。

## 二、部署到 Vercel

1. 推送代码到 Git 仓库，在 Vercel 里 Import Project，框架预设自动识别为 Next.js。
2. 进入项目 → **Storage** → **Create Database** → 选择 **Postgres**（现为 Neon）→ 选区域后创建。
3. 在数据库页面点 **Connect** → 选择你的项目，Vercel 会自动注入 `POSTGRES_URL`、`POSTGRES_PRISMA_URL` 等环境变量。
4. **重新部署**（Redeploy）一次，让新变量生效。
5. 访问 `POST /api/init` 建表：

   ```bash
   curl -X POST https://<你的域名>/api/init
   ```

然后打开首页即可增删改查。

## 三、接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/notes` | 返回最近 50 条 |
| POST | `/api/notes` | body `{"title":"x","content":"y"}` |
| DELETE | `/api/notes/:id` | 按 id 删除 |
| POST | `/api/init` | 幂等建表 |

```bash
curl -X POST https://<你的域名>/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"来自 curl","content":"hello"}'
```

## 四、Neon 驱动的几个注意点

和已废弃的 `@vercel/postgres` 相比，Neon 官方驱动有三处差异，改代码时容易踩：

1. **返回值是行数组本身**，不是 `{ rows }`：
   ```ts
   const rows = await sql`SELECT * FROM notes`;   // rows 就是数组
   ```
2. **没有 `rowCount`**。DELETE / UPDATE 想判断影响行数，用 `RETURNING`：
   ```ts
   const rows = await sql`DELETE FROM notes WHERE id = ${id} RETURNING id`;
   const deleted = rows.length;
   ```
3. **一次只能执行一条语句**。建表脚本要拆开逐条跑（`scripts/init-db.mjs` 已按分号拆分）。需要事务时用 `neon(...).transaction([...])`。

另外，连接串优先读 `DATABASE_URL`（Neon 集成注入），兜底读 `POSTGRES_URL`（旧集成），两种环境都能直接跑。

## 五、几个关键点

- **不用管连接池**：Neon HTTP 驱动没有长连接概念，每次调用就是一次 HTTP 请求，天然适合 Serverless / Edge，别自己 `new Pool()`。
- **只用 `sql` 模板标签**：`sql\`SELECT * FROM notes WHERE id = ${id}\`` 会自动做参数化查询，防 SQL 注入；要动态拼标识符（表名、列名）时才用 `sql(字符串)` 形式。
- **不要缓存**：页面和路由都加了 `export const dynamic = 'force-dynamic'`，避免读到构建期的旧数据。写入后用 `revalidatePath('/')` 刷新。
- **冷启动**：Neon 的 serverless 实例会缩容到 0，首次请求可能慢几百毫秒；生产环境可在 Neon 控制台开启最小实例数。
- **本地连线上库**：连接串带 `?sslmode=require`，本地直连同样可用，注意 Neon 的 IP 允许列表（默认不限制）。
- **换 ORM**：Drizzle 直接配 `drizzle-orm/neon-http` + 本项目的 `@neondatabase/serverless`；Prisma 用 `DATABASE_URL` 作为 `datasource.url`，池化连接记得加 `?pgbouncer=true`，并配一个 `DIRECT_URL` 给迁移用。

## 六、数据模型

```sql
CREATE TABLE notes (
  id          SERIAL       PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```
