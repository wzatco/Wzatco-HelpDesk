/**
 * Agent Presence Context
 * Manages agent status (online, away, busy, offline) and presence updates
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAgentAuth } from './AgentAuthContext';
import { useAgentSocket } from '../hooks/useAgentSocket';
import { agentFetch } from '../lib/utils/agent-fetch';

const AgentPresenceContext = createContext();

export function AgentPresenceProvider({ children }) {
  const { user } = useAgentAuth();
  const { socket, isConnected } = useAgentSocket();
  
  const [presenceStatus, setPresenceStatus] = useState('offline'); // online, away, busy, offline
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef(null); // Use ref instead of state to avoid re-renders

  /**
   * Update presence status on server
   */
  const updatePresence = useCallback(async (status) => {
    if (!user?.id) return;

    try {
      const response = await agentFetch('/api/agent/presence', {
        method: 'POST',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setPresenceStatus(status);
        setLastSeenAt(new Date());
        
        // Emit socket event for real-time updates
        if (socket && isConnected) {
          socket.emit('presence:update', { status });
        }
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user, socket, isConnected]);

  /**
   * Set status to online
   */
  const setOnline = useCallback(() => {
    updatePresence('online');
    setIsIdle(false);
  }, [updatePresence]);

  /**
   * Set status to away
   */
  const setAway = useCallback(() => {
    updatePresence('away');
    setIsIdle(true);
  }, [updatePresence]);

  /**
   * Set status to busy
   */
  const setBusy = useCallback(() => {
    updatePresence('busy');
    setIsIdle(false);
  }, [updatePresence]);

  /**
   * Set status to offline
   */
  const setOffline = useCallback(() => {
    updatePresence('offline');
    setIsIdle(false);
  }, [updatePresence]);

  /**
   * Handle user activity (reset idle timer)
   * Uses refs and functional updates to avoid infinite loops
   */
  const handleActivity = useCallback(() => {
    // Clear existing idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // If user was away, set back to online
    setPresenceStatus((currentStatus) => {
      if (currentStatus === 'away') {
        // Call updatePresence directly to avoid dependency on setOnline
        updatePresence('online').then(() => {
          setIsIdle(false);
        });
      }
      return currentStatus;
    });

    // Set new idle timer (5 minutes of inactivity = away)
    const timer = setTimeout(() => {
      setPresenceStatus((currentStatus) => {
        if (currentStatus === 'online') {
          // Call updatePresence directly to avoid dependency on setAway
          updatePresence('away').then(() => {
            setIsIdle(true);
          });
        }
        return currentStatus;
      });
    }, 5 * 60 * 1000); // 5 minutes

    idleTimerRef.current = timer;
  }, [updatePresence]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial activity
    handleActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [user]); // Only depend on user - handleActivity is stable due to useCallback

  // Set online when socket connects
  useEffect(() => {
    if (isConnected && user) {
      setOnline();
    } else if (!isConnected && user) {
      setOffline();
    }
  }, [isConnected, user, setOnline, setOffline]);

  // Update last seen periodically
  useEffect(() => {
    if (presenceStatus !== 'offline') {
      const interval = setInterval(() => {
        setLastSeenAt(new Date());
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [presenceStatus]);

  // Fetch initial presence status
  useEffect(() => {
    if (user?.id) {
      const fetchPresence = async () => {
        try {
          const response = await agentFetch('/api/agent/profile');
          if (response.ok) {
            const data = await response.json();
            if (data.data?.presenceStatus) {
              setPresenceStatus(data.data.presenceStatus);
            }
            if (data.data?.lastSeenAt) {
              setLastSeenAt(new Date(data.data.lastSeenAt));
            }
          }
        } catch (error) {
          console.error('Error fetching presence:', error);
        }
      };

      fetchPresence();
    }
  }, [user?.id]);

  const value = {
    presenceStatus,
    lastSeenAt,
    isIdle,
    setOnline,
    setAway,
    setBusy,
    setOffline,
    updatePresence,
    handleActivity
  };

  return (
    <AgentPresenceContext.Provider value={value}>
      {children}
    </AgentPresenceContext.Provider>
  );
}

export function useAgentPresence() {
  const context = useContext(AgentPresenceContext);
  if (!context) {
    throw new Error('useAgentPresence must be used within an AgentPresenceProvider');
  }
  return context;
}

