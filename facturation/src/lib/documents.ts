import { createBrowserSupabase } from './supabase/client';
import type { DocumentType } from './types';

export async function createDraft(orgId: string, type: DocumentType): Promise<string> {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.from('documents')
    .insert({ org_id: orgId, type })
    .select('id').single();
  if (error) throw error;
  await supabase.from('document_lines')
    .insert({ document_id: data.id, position: 0 });
  return data.id;
}
