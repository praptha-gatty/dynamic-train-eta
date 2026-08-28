import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : supabase;

export async function testConnection() {
  try {
    const { data, error } = await supabase.from('train_current_status').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      logger.warn('Supabase connection test warning:', error.message);
    } else {
      logger.info('Supabase connection established');
    }
    return true;
  } catch (err) {
    logger.error('Supabase connection failed:', err.message);
    return false;
  }
}

export function getSupabaseClient(useAdmin = false) {
  return useAdmin ? supabaseAdmin : supabase;
}