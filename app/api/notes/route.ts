import { NextResponse } from 'next/server';
import { createNote, isDbConfigured, listNotes } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/notes —— 返回最近 50 条 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'DATABASE_URL 未配置' },
      { status: 500 }
    );
  }

  try {
    const notes = await listNotes();
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/notes —— body: { "title": "...", "content": "..." } */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'DATABASE_URL 未配置' },
      { status: 500 }
    );
  }

  let body: { title?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim();
  const content = String(body.content ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title 不能为空' }, { status: 400 });
  }

  try {
    const note = await createNote(title, content);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
