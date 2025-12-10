import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function useSocket({ token } = {}) {
  const socketRef = useRef(null)

  useEffect(() => {
    // Create client pointing at the Socket.IO path matching server.js configuration
    // Server is configured with path: '/api/widget/socket' in server.js
    const socket = io({
      path: '/api/widget/socket',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      rememberUpgrade: true,
      upgrade: true
    })
    
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[useSocket] connected', socket.id)
      console.log('socket path:', socket.io.opts.path)
    })
    socket.on('disconnect', () => {
      console.log('[useSocket] disconnected')
    })
    socket.on('connect_error', (err) => {
      console.error('[useSocket] connect_error', err)
    })
    socket.on('error', (err) => {
      console.error('[useSocket] error', err)
    })

    return () => {
      try { socket.disconnect() } catch (e) {}
    }
  }, [token])

  return socketRef
}
