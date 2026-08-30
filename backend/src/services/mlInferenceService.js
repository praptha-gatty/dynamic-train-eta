/**
 * Machine Learning Inference Bridge (Node.js <-> Python Random Forest).
 * Connects the Node.js backend with trained scikit-learn Random Forest models in the ml/ directory.
 * Supports both HTTP inference microservice (port 8000 / 5001) and direct Python child process execution.
 * Falls back gracefully to physics-based estimation if ML is offline.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_SCRIPT_PATH = path.resolve(__dirname, '../../../ml/inference/predict_single.py');
const ML_HTTP_URL = process.env.ML_INFERENCE_URL || 'http://127.0.0.1:8000/api/predict-single';

/**
 * Executes Python Random Forest inference on the given feature payload.
 * @param {object} features
 * @param {number} features.current_delay
 * @param {number} features.effective_speed
 * @param {number} features.station_sequence
 * @param {number} features.distance_from_origin_km
 * @param {number} features.distance_remaining_km
 * @param {number} [features.hour_of_day]
 * @param {number} [features.day_of_week]
 * @param {number} [features.is_weekend]
 * @returns {Promise<{ success: boolean, predictedAddedDelay?: number, model?: string, error?: string }>}
 */
export async function runMLInference(features) {
  // 1. First attempt: Check if FastAPI ML microservice is running
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 350);

    const httpRes = await fetch(ML_HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (httpRes.ok) {
      const data = await httpRes.json();
      if (data.status === 'success' && Number.isFinite(data.predicted_added_delay_minutes)) {
        return {
          success: true,
          predictedAddedDelay: Number(data.predicted_added_delay_minutes),
          model: data.model || 'RandomForestRegressor (HTTP)',
          source: 'ml_http_service'
        };
      }
    }
  } catch {
    // ML HTTP service offline or timed out - proceed to child process fallback
  }

  // 2. Second attempt: Run predict_single.py via Python CLI if file exists
  if (fs.existsSync(PYTHON_SCRIPT_PATH)) {
    try {
      const result = await new Promise((resolve, reject) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const pyProc = spawn(pythonCmd, [PYTHON_SCRIPT_PATH], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 1200
        });

        let outputData = '';
        let errorData = '';

        pyProc.stdout.on('data', (chunk) => {
          outputData += chunk.toString();
        });

        pyProc.stderr.on('data', (chunk) => {
          errorData += chunk.toString();
        });

        pyProc.on('error', (err) => {
          reject(err);
        });

        pyProc.on('close', (code) => {
          if (code === 0 && outputData.trim()) {
            try {
              const parsed = JSON.parse(outputData.trim());
              resolve(parsed);
            } catch (jsonErr) {
              reject(jsonErr);
            }
          } else {
            reject(new Error(errorData || `Python process exited with code ${code}`));
          }
        });

        pyProc.stdin.write(JSON.stringify(features));
        pyProc.stdin.end();
      });

      if (result && result.status === 'success' && Number.isFinite(result.predicted_added_delay_minutes)) {
        return {
          success: true,
          predictedAddedDelay: Number(result.predicted_added_delay_minutes),
          model: result.model || 'RandomForestRegressor (Local)',
          source: 'ml_python_bridge'
        };
      }
    } catch (procErr) {
      logger.debug(`ML child process inference skipped: ${procErr.message}`);
    }
  }

  // 3. Graceful fallback indication
  return {
    success: false,
    source: 'kinematic_physics_fallback'
  };
}
