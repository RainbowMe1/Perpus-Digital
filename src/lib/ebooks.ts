import { getSupabaseClient } from './supabase';

export async function getEbookUrl(filePath: string, download = false) {
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const { data, error } = await getSupabaseClient()
    .storage
    .from('ebooks')
    .createSignedUrl(filePath, 60 * 60, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
