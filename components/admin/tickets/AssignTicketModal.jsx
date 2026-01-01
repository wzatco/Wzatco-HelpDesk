import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

export function AssignTicketModal({ isOpen, onClose, onAssign, ticketNumber }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsersData();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      const [agentsRes, usersRes] = await Promise.all([
        fetch('/api/admin/agents'),
        fetch('/api/admin/users')
      ]);

      const [agentsData, usersData] = await Promise.all([
        agentsRes.json(),
        usersRes.json()
      ]);

      if (agentsRes.ok) {
        setAgents(agentsData.agents || []);
      }
      
      if (usersRes.ok) {
        // Filter only admin users
        const allUsers = usersData.users || [];
        const adminUsers = allUsers.filter(user => user.type === 'admin');
        setAdmins(adminUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch(`/api/admin/tickets/${ticketNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: selectedUser.id })
      });

      if (response.ok) {
        onAssign?.(selectedUser);
        onClose();
      } else {
        const error = await response.json();
        console.error('Error assigning ticket:', error);
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }
  };

  const allUsers = [
    ...admins.map(admin => ({ ...admin, type: 'admin' })),
    ...agents.map(agent => ({ ...agent, type: 'agent' }))
  ];

  const filteredUsers = allUsers.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ margin: 0 }}>
      <div className="relative w-full max-w-2xl mx-4 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Assign Ticket</h2>
                <p className="text-sm text-slate-400">Select an agent or admin to assign</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-slate-800 border-violet-600 focus:border-violet-500 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No users found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedUser?.id === user.id
                      ? 'border-violet-600 bg-violet-950/30'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback 
                        className="text-sm font-semibold"
                        style={{
                          background: `linear-gradient(135deg, ${
                            user.type === 'admin' ? '#8b5cf6' : '#3b82f6'
                          } 0%, ${
                            user.type === 'admin' ? '#6366f1' : '#06b6d4'
                          } 100%)`
                        }}
                      >
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">{user.name}</p>
                        {selectedUser?.id === user.id && (
                          <Check className="w-4 h-4 text-violet-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          className={`text-xs ${
                            user.type === 'admin' 
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {user.type === 'admin' ? 'Admin' : 'Agent'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <kbd className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded">Esc</kbd>
            <span>Close</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedUser}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              Assign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

