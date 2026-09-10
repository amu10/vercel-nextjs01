import { NextResponse } from 'next/server';
import { deleteNote } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** DELETE /api/notes/:id */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const noteId = Number(id);

  if (!Number.isInteger(noteId)) {
    return NextResponse.json({ error: 'id 必须是整数' }, { status: 400 });
  }

  try {
    const deleted = await deleteNote(noteId);
    if (deleted === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: noteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
