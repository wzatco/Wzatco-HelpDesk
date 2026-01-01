import { useState, useEffect } from 'react';

/**
 * Hook to track who is currently viewing a ticket
 * Provides concurrent viewer detection for tickets
 * 
 * @param {Object} socket - Socket.IO instance
 * @param {string} ticketId - Ticket ID being viewed
 * @param {Object} currentUser - Current user object { id, name, type }
 * @returns {Object} { viewers: Array, hasOtherViewers: boolean, viewerCount: number }
 */
export function useTicketViewers(socket, ticketId, currentUser) {
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    if (!socket || !ticketId || !currentUser) {
      return;
    }

    // Join the ticket viewing room
    socket.emit('ticket:view:join', {
      ticketId,
      userId: currentUser.id,
      userName: currentUser.name,
      userType: currentUser.type
    });

    // Listen for viewer updates
    socket.on('ticket:viewers:update', (data) => {
      if (data.ticketId === ticketId) {
        setViewers(data.viewers || []);
      }
    });

    // Cleanup on unmount or ticket change
    return () => {
      socket.emit('ticket:view:leave', {
        ticketId,
        userId: currentUser.id
      });
      socket.off('ticket:viewers:update');
    };
  }, [socket, ticketId, currentUser?.id]);

  // Calculate metrics
  const otherViewers = viewers.filter(v => v.userId !== currentUser?.id);
  const hasOtherViewers = otherViewers.length > 0;
  const viewerCount = viewers.length;

  return {
    viewers,
    hasOtherViewers,
    viewerCount,
    otherViewers
  };
}
