import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Potential paths to locate .env file
const potentialEnvPaths = [
  path.resolve(__dirname, '../../.env'),       // dynamic-train-eta/.env
  path.resolve(__dirname, '../.env'),          // backend/.env
  path.resolve(process.cwd(), '.env'),         // current working directory .env
  path.resolve(process.cwd(), '../.env')       // parent directory .env
];

let envLoaded = false;
for (const envPath of potentialEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  
  // Database / Supabase / PostgreSQL pool
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional().default('https://rwkcsfdmfhaxsaetzuzj.supabase.co'),
  SUPABASE_ANON_KEY: z.string().min(1).optional().default('sb_publishable_i4cahjdwkuyHW0Ir4_vvEA_cRCmZp1b'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // External APIs
  RAILRADAR_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  
  // Server & Security
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(500),
  
  // WebSocket / Realtime
  WS_ENABLED: z.string().transform(v => v !== 'false').default('true'),
  WS_PING_INTERVAL: z.coerce.number().int().positive().default(25000),
  WS_PING_TIMEOUT: z.coerce.number().int().positive().default(20000),
  
  // In-Memory Cache
  CACHE_TTL_MS: z.coerce.number().int().positive().default(30000), // 30s
  CACHE_MAX_ITEMS: z.coerce.number().int().positive().default(1000),
  
  // Background Worker
  BACKGROUND_SYNC_ENABLED: z.string().transform(v => v === 'true').default('false'),
  BACKGROUND_SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(300000), // 5 min
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.flatten().fieldErrors, null, 2));
  throw new Error('Environment configuration validation failed');
}

export const config = parsedEnv.data;
export default config;
