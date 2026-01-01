/**
 * useSocketListener Hook
 * Automatically manages Socket.IO event listeners with proper cleanup
 * Prevents MaxListenersExceededWarning by ensuring listeners are removed
 * 
 * Usage:
 * useSocketListener('ticket:assigned', (data) => {
 *   console.log('Ticket assigned:', data);
 *   refreshTickets();
 * });
 */

import { useEffect } from 'react';
import { getAgentSocket } from '../lib/agentSocket';

export const useSocketListener = (eventName, handler, dependencies = []) => {
  const socket = getAgentSocket();

  useEffect(() => {
    if (!socket || !handler) return;

    // Attach listener
    socket.on(eventName, handler);
    console.log(`🎧 Socket listener attached: ${eventName}`);

    // AUTOMATIC CLEANUP - removes listener on unmount or dependency change
    return () => {
      socket.off(eventName, handler);
      console.log(`🔇 Socket listener removed: ${eventName}`);
    };
  }, [socket, eventName, handler, ...dependencies]);
};
