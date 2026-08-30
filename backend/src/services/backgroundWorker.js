/**
 * Background Ingestion & Real-Time Sync Worker.
 * Decouples external API fetching from client read endpoints.
 * Periodically refreshes active train states, populates the LRU cache,
 * and pushes updates to active WebSocket / SSE subscribers.
 */

import config from '../config/env.js';
import logger from '../utils/logger.js';
import { getSubscriptions, broadcastTrainUpdate } from '../websocket/handlers.js';
import * as etaService from './etaService.js';
import * as trainService from './trainService.js';

let workerInterval = null;
let isProcessing = false;

/**
 * Executes a single polling and synchronization cycle.
 */
export async function runSyncCycle() {
  if (isProcessing) {
    logger.debug('Background sync cycle already in progress - skipping overlap');
    return;
  }

  isProcessing = true;
  try {
    const subscriptions = getSubscriptions();
    const activeRooms = Object.keys(subscriptions).filter(room => subscriptions[room] > 0);

    logger.debug(`Background worker running sync for ${activeRooms.length} active train room(s)`);

    for (const room of activeRooms) {
      const [trainNumber, journeyDate] = room.split(':');
      if (!trainNumber) continue;

      try {
        // Fetch or compute latest route ETA
        const routeETA = await etaService.predictRouteETA(trainNumber, journeyDate);
        if (routeETA && routeETA.predictions) {
          broadcastTrainUpdate(trainNumber, journeyDate, {
            current_location: routeETA.current_location,
            predictions_summary: {
              total_downstream_stations: routeETA.total_downstream_stations,
              next_station_eta: routeETA.predictions[0] || null,
              final_destination_eta: routeETA.predictions[routeETA.predictions.length - 1] || null
            }
          });
        }
      } catch (err) {
        logger.debug(`Background sync error for train ${trainNumber}: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error('Background sync cycle failed:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Starts the background sync worker.
 */
export function startBackgroundWorker() {
  if (workerInterval) return;

  const intervalMs = config.BACKGROUND_SYNC_INTERVAL_MS || 300000; // 5 min
  logger.info(`Starting background sync worker (interval: ${intervalMs}ms)`);

  // Initial run after 5 seconds
  setTimeout(() => {
    runSyncCycle().catch(e => logger.error('Initial background sync failed:', e));
  }, 5000);

  workerInterval = setInterval(runSyncCycle, intervalMs);
}

/**
 * Stops the background sync worker.
 */
export function stopBackgroundWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('Background sync worker stopped');
  }
}
