// Ticket Management - Create, view, and manage tickets
'use client';

import { useState, useEffect } from 'react';
import { Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function TicketManagement({ userInfo, onBack }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    priority: 'low',
    category: '',
    description: '',
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      // TODO: Fetch from API
      // const response = await fetch(`/api/widget/tickets?email=${userInfo.email}`);
      // const data = await response.json();
      // setTickets(data.tickets || []);
      
      // For now, use localStorage
      const stored = localStorage.getItem(`widget_tickets_${userInfo.email}`);
      if (stored) {
        setTickets(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    
    const ticket = {
      id: `TKT-${Date.now()}`,
      subject: newTicket.subject,
      priority: newTicket.priority,
      category: newTicket.category,
      description: newTicket.description,
      status: 'open',
      customerEmail: userInfo.email,
      customerName: userInfo.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // TODO: Save to API
      // await fetch('/api/widget/tickets', { method: 'POST', body: JSON.stringify(ticket) });
      
      // For now, save to localStorage
      const existing = JSON.parse(localStorage.getItem(`widget_tickets_${userInfo.email}`) || '[]');
      existing.push(ticket);
      localStorage.setItem(`widget_tickets_${userInfo.email}`, JSON.stringify(existing));
      
      setTickets(existing);
      setShowCreateModal(false);
      setNewTicket({ subject: '', priority: 'low', category: '', description: '' });
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (selectedTicket) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-white text-lg font-bold mb-2">{selectedTicket.subject}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Ticket #{selectedTicket.id}</span>
                <span>•</span>
                <span>{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {selectedTicket.priority.toUpperCase()}
              </span>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Description</h4>
              <p className="text-gray-300 text-sm">{selectedTicket.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">My Tickets</h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No tickets yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            >
              Create Your First Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-pink-500 transition-all text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-medium">{ticket.subject}</h4>
                  {getStatusIcon(ticket.status)}
                </div>
                <p className="text-gray-400 text-sm mb-2 line-clamp-2">{ticket.description}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{ticket.id}</span>
                  <span>•</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Create New Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  {/* Urgent priority removed - only for agents/admins */}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <input
                  type="text"
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., Technical, Billing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  rows={4}
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

