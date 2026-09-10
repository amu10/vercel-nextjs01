import { NextResponse } from 'next/server';
import { initDb, isDbConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** POST /api/init —— 幂等建表，部署后调一次即可 */
export async function POST() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'DATABASE_URL 未配置' },
      { status: 500 }
    );
  }

  try {
    await initDb();
    return NextResponse.json({ ok: true, message: 'notes 表已就绪' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
