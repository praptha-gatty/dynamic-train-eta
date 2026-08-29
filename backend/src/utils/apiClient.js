import axios from 'axios';
import logger from './logger.js';

/**
 * Performs an HTTP GET request with explicit timeout limit and retry logic with exponential backoff.
 * @param {string} url 
 * @param {object} [options={}] 
 * @param {number} [options.timeout=5000] Timeout in milliseconds (default: 5s)
 * @param {number} [options.retries=3] Maximum number of retries (default: 3)
 * @param {number} [options.backoffMs=1000] Initial backoff in milliseconds (default: 1s)
 * @returns {Promise<any>} Response object or data
 */
export async function fetchWithRetry(url, options = {}) {
  const timeout = options.timeout || 5000;
  const maxRetries = options.retries !== undefined ? options.retries : 3;
  const initialBackoff = options.backoffMs || 1000;

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await axios({
        method: options.method || 'GET',
        url,
        headers: options.headers || {},
        params: options.params,
        timeout,
        data: options.data
      });
      return response;
    } catch (error) {
      attempt++;
      const isLastAttempt = attempt > maxRetries;
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;

      logger.warn(`API call failed (attempt ${attempt}/${maxRetries + 1}) to ${url}: ${errorMessage} [status: ${status || 'N/A'}]`);

      if (isLastAttempt) {
        logger.error(`API max retries reached for ${url}:`, error.message);
        throw error;
      }

      // Exponential backoff with jitter
      const backoff = initialBackoff * Math.pow(2, attempt - 1) + Math.random() * 200;
      logger.info(`Retrying in ${Math.round(backoff)}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}
