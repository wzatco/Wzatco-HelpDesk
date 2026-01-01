/**
 * Agent Global Data Context
 * Centralized data fetching for notifications and ticket counts
 * Prevents redundant API calls across multiple components
 * Single source of truth with automatic refresh every 60 seconds
 * Listens to notificationRefreshTrigger from AgentAuthContext for real-time updates
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { agentFetch } from '../lib/utils/agent-fetch';
import { useAgentAuth } from './AgentAuthContext';

const AgentGlobalContext = createContext();

export const AgentGlobalProvider = ({ children }) => {
  const { isAuthenticated, notificationRefreshTrigger } = useAgentAuth();
  const [notifications, setNotifications] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    needReply: 0,
    claimable: 0
  });
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  const refreshGlobalData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch both in parallel to minimize latency
      const [notifRes, countRes] = await Promise.all([
        agentFetch('/api/agent/notifications'),
        agentFetch('/api/agent/tickets/counts')
      ]);
      
      const notifData = await notifRes.json();
      const countData = await countRes.json();
      
      setNotifications(notifData.notifications || []);
      setTicketCounts(countData || {
        total: 0,
        open: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        needReply: 0,
        claimable: 0
      });
    } catch (err) {
      console.error("Global data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Only depend on isAuthenticated boolean

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      hasInitialized.current = false;
      return;
    }

    // Fetch immediately on mount/authentication ONLY ONCE
    if (!hasInitialized.current) {
      refreshGlobalData();
      hasInitialized.current = true;
    }

    // Fetch every 60 seconds (One interval for the WHOLE app)
    const interval = setInterval(refreshGlobalData, 60000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, refreshGlobalData]);

  // Refresh notifications when trigger changes (real-time updates from socket events)
  useEffect(() => {
    if (notificationRefreshTrigger > 0 && isAuthenticated) {
      console.log('🔔 AgentGlobalData: Refreshing notifications due to real-time event');
      refreshGlobalData();
    }
  }, [notificationRefreshTrigger, isAuthenticated, refreshGlobalData]);

  const value = {
    notifications,
    ticketCounts,
    loading,
    refreshGlobalData // Expose for manual refresh triggers
  };

  return (
    <AgentGlobalContext.Provider value={value}>
      {children}
    </AgentGlobalContext.Provider>
  );
};

export const useAgentGlobal = () => {
  const context = useContext(AgentGlobalContext);
  if (!context) {
    throw new Error('useAgentGlobal must be used within an AgentGlobalProvider');
  }
  return context;
};
