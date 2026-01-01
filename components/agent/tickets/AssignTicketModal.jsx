import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { X, Users, Search } from 'lucide-react';
import { agentFetch } from '../../../lib/utils/agent-fetch';

export function AssignTicketModal({ 
  isOpen, 
  onClose, 
  ticketId, 
  onAssignSuccess 
}) {
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [reason, setReason] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await agentFetch('/api/agent/agents');
      const data = await response.json();
      if (response.ok) {
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgentId || !reason.trim()) {
      alert('Please select an agent and provide a reason');
      return;
    }

    try {
      setAssigning(true);
      const response = await agentFetch(`/api/agent/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          reason: reason.trim()
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        onAssignSuccess();
        onClose();
        setSelectedAgentId(null);
        setReason('');
      } else {
        alert(data.error || 'Failed to assign ticket');
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      alert('Failed to assign ticket');
    } finally {
      setAssigning(false);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Assign Ticket to Agent
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select an agent and provide a reason for assignment
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Agents List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading agents...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No agents found</div>
            ) : (
              filteredAgents.map((agent) => {
                const initials = agent.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAgentId === agent.id
                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {agent.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {agent.email}
                      </p>
                    </div>
                    {selectedAgentId === agent.id && (
                      <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Reason for Assignment <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for assigning this ticket..."
              className="w-full min-h-[100px] px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This reason will be logged in the ticket activity history
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={assigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedAgentId || !reason.trim() || assigning}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {assigning ? 'Assigning...' : 'Assign Ticket'}
          </Button>
        </div>
      </div>
    </div>
  );
}

