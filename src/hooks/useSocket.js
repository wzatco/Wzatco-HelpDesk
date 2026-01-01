/**
 * useSocket Hook - Singleton Wrapper
 * Returns the singleton Socket.IO instance instead of creating new connections
 * This fixes the "multiple connections per page" issue
 */
import { useRef, useEffect, useState } from 'react';
import { getAgentSocket } from '../../lib/agentSocket';

export default function useSocket() {
  // Use useRef to return the SAME object reference on every render
  const socketRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only run on client-side (not during SSR)
    setIsClient(true);
    
    // Get or create socket singleton
    const socket = getAgentSocket();
    socketRef.current = socket;
    
    console.log('🔧 useSocket: Initialized', { 
      socketExists: !!socket, 
      connected: socket?.connected,
      id: socket?.id 
    });

    // Auto-connect if not already connected
    if (socket && !socket.connected) {
      console.log('🔌 useSocket: Auto-connecting socket...');
      socket.connect();
    }
  }, []);

  // Return the SAME ref object every time (stable reference)
  return socketRef; 
}
