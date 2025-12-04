import React, { useEffect, useState } from 'react'
import useSocket from '../../src/hooks/useSocket'

import { withAuth } from '../../lib/withAuth';
export default function LiveChat() {
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')

  const socketRef = useSocket({ token: 'admin-demo' })

  useEffect(() => {
    fetch('/api/admin/conversations').then(r => r.json()).then(d => setConversations(d.data || []))
  }, [])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    function onMessage(msg) {
      if (activeConv && msg.conversationId === activeConv.id) {
        setMessages(prev => {
          // dedupe by message id to avoid duplicates caused by ack + broadcast
          if (prev.find(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    }

    socket?.on('message:new', onMessage)
    return () => socket?.off('message:new', onMessage)
  }, [socketRef, activeConv])

  async function openConversation(conv) {
    setActiveConv(conv)
    const res = await fetch(`/api/admin/conversations/${conv.id}/messages`)
    const body = await res.json()
    setMessages(body.data || [])
    const socket = socketRef.current
    if (socket) {
      if (socket.connected) {
        socket.emit('join:conversation', { conversationId: conv.id }, (ack) => {
          // optional ack handling
        })
      } else {
        // use once to avoid adding multiple connect listeners over time
        socket.once('connect', () => {
          socket.emit('join:conversation', { conversationId: conv.id }, (ack) => {})
        })
      }
    }
  }

  function sendMessage() {
    if (!text || !activeConv) return
    const socket = socketRef.current
    if (!socket) return
    const doSend = () => {
      socket.emit('message:send', { conversationId: activeConv.id, content: text }, (ack) => {
        if (ack && ack.success) {
          // add acked message if not already present; message:new may arrive later
          setMessages(prev => {
            if (prev.find(m => m.id === ack.message.id)) return prev
            return [...prev, ack.message]
          })
          setText('')
        }
      })
    }
    if (socket.connected) doSend()
    else socket.once('connect', doSend)
  }

  return (
    <div style={{display: 'flex', height: '100vh'}}>
      <aside style={{width: 320, borderRight: '1px solid #ddd', padding: 12}}>
        <h3>Conversations</h3>
        {conversations.map(c => (
          <div key={c.id} style={{padding: 8, borderBottom: '1px solid #eee', cursor: 'pointer'}} onClick={() => openConversation(c)}>
            <strong>{c.subject || c.id}</strong>
            <div style={{fontSize: 12, color: '#666'}}>{c.status}</div>
          </div>
        ))}
      </aside>
      <main style={{flex: 1, padding: 12}}>
        {activeConv ? (
          <>
            <h3>{activeConv.subject || activeConv.id}</h3>
            <div style={{height: '70vh', overflow: 'auto', border: '1px solid #eee', padding: 8}}>
              {messages.map(m => (
                <div key={m.id} style={{marginBottom: 8}}>
                  <div style={{fontSize: 12, color: '#888'}}>{m.sender?.name || m.senderId} • {new Date(m.createdAt).toLocaleString()}</div>
                  <div>{m.content}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop: 8}}>
              <input value={text} onChange={e => setText(e.target.value)} style={{width: '80%', padding: 8}} />
              <button onClick={sendMessage} style={{padding: '8px 12px', marginLeft: 8}}>Send</button>
            </div>
          </>
        ) : (
          <div>Select a conversation</div>
        )}
      </main>
    </div>
  )
}

export const getServerSideProps = withAuth();

