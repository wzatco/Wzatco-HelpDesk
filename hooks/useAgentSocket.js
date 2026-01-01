/**
 * React hook for Agent Socket.IO
 * Provides easy access to agent socket functionality
 */

import { useEffect, useState, useRef } from 'react';
import { useAgentAuth } from '../contexts/AgentAuthContext';
import { getAgentSocket } from '../lib/agentSocket';

export function useAgentSocket() {
  const { token, isAuthenticated } = useAgentAuth();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnectionStatus('disconnected');
      return;
    }

    // Get socket instance
    const socket = getAgentSocket();
    socketRef.current = socket;

    // Connect with token
    socket.connect(token);

    // Listen to connection status changes
    const handleStatusChange = (status) => {
      setConnectionStatus(status);
    };

    socket.onConnectionStatusChange(handleStatusChange);

    // Start heartbeat
    socket.startHeartbeat(30000); // 30 seconds

    // Cleanup on unmount
    return () => {
      socket.offConnectionStatusChange(handleStatusChange);
      socket.stopHeartbeat();
      // Don't disconnect on unmount - keep connection alive across route changes
      // socket.disconnect();
    };
  }, [token, isAuthenticated]);

  return {
    socket: socketRef.current,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting' || connectionStatus === 'reconnecting',
    isDisconnected: connectionStatus === 'disconnected' || connectionStatus === 'error' || connectionStatus === 'failed'
  };
}

