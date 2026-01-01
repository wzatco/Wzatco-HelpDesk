/**
 * useAutoRefresh Hook
 * Global auto-refresh system using Socket.IO events
 * Automatically refreshes data when relevant events occur
 * 
 * Usage:
 * const fetchTickets = async (silent = false) => { ... };
 * useAutoRefresh(fetchTickets);
 * 
 * This will silently refresh tickets when:
 * - Tickets are created, updated, assigned, or deleted
 * - Ticket status or priority changes
 * - Agent status changes (useful for agent lists)
 */

import { useEffect, useCallback, useMemo } from 'react';
import { getAgentSocket } from '../lib/agentSocket';

/**
 * Global auto-refresh hook
 * @param {Function} refreshFunction - Function to call for refresh (should accept `silent` parameter)
 * @param {Array} additionalEvents - Optional array of additional event names to listen to
 * @param {Array} dependencies - Optional dependencies array for the refresh function
 */
export const useAutoRefresh = (refreshFunction, additionalEvents = [], dependencies = []) => {
  // Create a stable callback wrapper that calls refreshFunction with silent=true
  const handleRefresh = useCallback(() => {
    if (typeof refreshFunction === 'function') {
      console.log('🔄 System Auto-Refresh Triggered');
      try {
        refreshFunction(true); // Pass 'true' for silent mode
      } catch (error) {
        console.error('❌ Auto-refresh error:', error);
      }
    } else {
      console.warn('⚠️ useAutoRefresh: refreshFunction is not a function');
    }
  }, [refreshFunction, ...dependencies]);

  // Default events that should trigger a refresh
  const defaultEvents = useMemo(() => [
    'ticket:created',
    'ticket:updated',
    'ticket:status:changed',
    'ticket:assigned',
    'ticket:priority:changed',
    'ticket:deleted',
    'agent:status:changed',
    'message:new',
    'ticket:replied'
  ], []);

  // Combine default events with additional events (memoized for stability)
  const allEvents = useMemo(() => [...defaultEvents, ...additionalEvents], [defaultEvents, additionalEvents]);

  // Use a single useEffect to handle all events dynamically
  // This complies with Rules of Hooks while supporting dynamic event lists
  useEffect(() => {
    const socket = getAgentSocket();
    if (!socket || !handleRefresh) return;

    // Attach listeners for all events
    allEvents.forEach(event => {
      socket.on(event, handleRefresh);
      console.log(`🎧 Auto-refresh listener attached: ${event}`);
    });

    // Cleanup: Remove all listeners
    return () => {
      allEvents.forEach(event => {
        socket.off(event, handleRefresh);
        console.log(`🔇 Auto-refresh listener removed: ${event}`);
      });
    };
  }, [handleRefresh, allEvents]);

  // Return the refresh handler in case the component needs to trigger it manually
  return handleRefresh;
};

