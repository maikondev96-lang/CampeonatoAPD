import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ufzcgblgitpqbfjptsji.supabase.co';
const supabaseAnonKey = 'sb_publishable_LUWw2ucS8M7j5PLj8WBJaw_xJtvbmMD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
