import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://nskumyvjrfdilooofycw.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_gPgfjAWAyVB7pcA-KLJQzA_VZRfthzM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
