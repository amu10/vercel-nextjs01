import { initDbAction, addNoteAction, deleteNoteAction } from './actions';
import { isDbConfigured, listNotes, type Note } from '@/lib/db';

// 每次访问都查库，不做静态缓存
export const dynamic = 'force-dynamic';

function formatTime(value: Note['created_at']): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('zh-CN', { hour12: false });
}

export default async function Home() {
  // 1. 连接串没配：直接给出配置指引，不去碰数据库
  if (!isDbConfigured()) {
    return (
      <main>
        <h1>Next.js + Vercel Postgres</h1>
        <p className="subtitle">代码已经就绪，还差一步：把数据库连接串接进来。</p>
        <div className="banner">
          未检测到 <code>DATABASE_URL</code>。请复制 <code>.env.example</code> 为{' '}
          <code>.env.local</code>，填入 Neon 的连接串（Pooled connection）后重启{' '}
          <code>npm run dev</code>。
          部署到 Vercel 时，只要在项目里绑定 Neon / Postgres 存储，变量会自动注入，无需手动配置。
        </div>
      </main>
    );
  }

  // 2. 查库，失败时区分「表不存在」和「其他错误」
  let notes: Note[] = [];
  let errorMessage: string | null = null;
  let tableMissing = false;

  try {
    notes = await listNotes();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    tableMissing = /does not exist|relation/i.test(errorMessage);
  }

  return (
    <main>
      <h1>笔记</h1>
      <p className="subtitle">Next.js 15 App Router 直连 Vercel Postgres，数据实时读写。</p>

      {errorMessage && (
        <div className="banner">
          查询失败：{errorMessage}
          {tableMissing && (
            <form action={initDbAction} style={{ marginTop: 12 }}>
              <button type="submit">一键建表</button>
            </form>
          )}
        </div>
      )}

      {!errorMessage && (
        <div className="card">
          <form className="note-form" action={addNoteAction}>
            <input name="title" placeholder="标题" maxLength={255} required />
            <textarea name="content" placeholder="内容（可留空）" />
            <button type="submit">添加</button>
          </form>
        </div>
      )}

      <div className="card">
        {notes.length === 0 ? (
          <p className="empty">还没有数据，先在上面添加一条。</p>
        ) : (
          notes.map((note) => (
            <div className="note" key={note.id}>
              <div className="row">
                <h3>{note.title}</h3>
                <form action={deleteNoteAction}>
                  <input type="hidden" name="id" value={note.id} />
                  <button className="link" type="submit">
                    删除
                  </button>
                </form>
              </div>
              {note.content && <p>{note.content}</p>}
              <time>{formatTime(note.created_at)}</time>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
