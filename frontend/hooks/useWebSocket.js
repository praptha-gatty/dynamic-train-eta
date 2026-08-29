import { useEffect, useState } from 'react';
import { wsService } from '../services/websocket.js';

export function useWebSocket(trainNumber, journeyDate, onTrainUpdate) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    wsService.connect();

    const unsubscribeConn = wsService.on('connection_change', ({ connected }) => {
      setIsConnected(connected);
    });

    const unsubscribeUpdate = wsService.on('train_update', (data) => {
      if (onTrainUpdate) {
        onTrainUpdate(data);
      }
    });

    return () => {
      unsubscribeConn();
      unsubscribeUpdate();
    };
  }, [onTrainUpdate]);

  useEffect(() => {
    if (trainNumber && journeyDate) {
      wsService.subscribe(trainNumber, journeyDate);
    }
    return () => {
      wsService.unsubscribe();
    };
  }, [trainNumber, journeyDate]);

  return { isConnected };
}
