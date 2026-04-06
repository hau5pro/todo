import { supabase } from '../supabase/client';
import type { Settings } from '../contexts/SettingsContext';

export async function fetchCloudSettings(userId: string): Promise<Partial<Settings> | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('accent, hidden_list_ids, show_my_day, setup_done')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return {
    accent:        data.accent,
    hiddenListIds: data.hidden_list_ids,
    showMyDay:     data.show_my_day,
    setupDone:     data.setup_done,
  };
}

export async function pushCloudSettings(userId: string, s: Settings): Promise<void> {
  await supabase.from('user_settings').upsert({
    user_id:         userId,
    accent:          s.accent,
    hidden_list_ids: s.hiddenListIds,
    show_my_day:     s.showMyDay,
    setup_done:      s.setupDone,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'user_id' });
}
