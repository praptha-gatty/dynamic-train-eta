/**
 * Supabase Client Initialization and Connection Management.
 */

import { createClient } from '@supabase/supabase-js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const supabaseUrl = config.SUPABASE_URL;
const supabaseAnonKey = config.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

/**
 * Tests database connectivity by performing a lightweight query.
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('trains')
      .select('train_number')
      .limit(1);

    if (error) {
      logger.warn(`Supabase connection test failed: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.warn(`Supabase connection error: ${error.message}`);
    return false;
  }
}

export default supabase;