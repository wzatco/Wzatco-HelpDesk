import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function useSocket({ token } = {}) {
  const socketRef = useRef(null)

  useEffect(() => {
  // Create client pointing at the default Socket.IO path. Do NOT use '/api/socket' as a namespace.
  // Force websocket transport to avoid polling 404s in some Next.js dev server setups.
  const socket = io({
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    autoConnect: false,
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
    rememberUpgrade: true,
    upgrade: true
  })
    socketRef.current = socket

    // Ensure the Next.js API route has been hit so the server-side Socket.IO instance is initialized.
    // The API route (`/api/socket`) sets up the server io on first request; calling it first avoids a race.
    fetch('/api/socket').finally(() => {
      try {
        socket.connect()
      } catch (e) {
        console.error('[useSocket] connect error', e)
      }
    })

    socket.on('connect', () => {
      console.log('[useSocket] connected', socket.id)
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
