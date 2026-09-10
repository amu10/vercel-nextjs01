'use server';

import { revalidatePath } from 'next/cache';
import { createNote, deleteNote, initDb } from '@/lib/db';

/** 新增笔记：表单提交后刷新首页 */
export async function addNoteAction(formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!title) return;

  await createNote(title, content);
  revalidatePath('/');
}

/** 删除笔记 */
export async function deleteNoteAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  await deleteNote(id);
  revalidatePath('/');
}

/** 一键建表：表还没建时页面会给出这个按钮 */
export async function initDbAction(): Promise<void> {
  await initDb();
  revalidatePath('/');
}
