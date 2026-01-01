import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Users, Search, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import AgentAdminCard from './AgentAdminCard';

/**
 * TransferTicketModal - Modal for transferring tickets to agents or admins
 * Two-page flow: (1) Select agent/admin, (2) Enter transfer reason
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.ticketId - Ticket ID being transferred
 * @param {Function} props.onTransferComplete - Callback after successful transfer
 * @param {string} props.currentAgentId - Current agent's ID (for API call)
 */
export default function TransferTicketModal({
    isOpen,
    onClose,
    ticketId,
    onTransferComplete,
    currentAgentId
}) {
    const [page, setPage] = useState('selection'); // 'selection' | 'reason'
    const [agents, setAgents] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState(null); // { id, name, type }
    const [transferReason, setTransferReason] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');

    // Fetch agents and admins when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAvailableAssignees();
            // Reset state when modal opens
            setPage('selection');
            setSelectedAssignee(null);
            setTransferReason('');
            setSearchQuery('');
            setError('');
        }
    }, [isOpen]);

    const fetchAvailableAssignees = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/agent/available-assignees');

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAgents(data.agents || []);
                    setAdmins(data.admins || []);
                } else {
                    setError('Failed to load available assignees');
                }
            } else {
                setError('Failed to fetch assignees');
            }
        } catch (error) {
            console.error('Error fetching assignees:', error);
            setError('Error loading assignees');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAssignee = (assignee) => {
        setSelectedAssignee(assignee);
        setPage('reason'); // Move to reason page
    };

    const handleBackToSelection = () => {
        setPage('selection');
        setSelectedAssignee(null);
        setTransferReason('');
        setError('');
    };

    const handleTransfer = async () => {
        if (!transferReason.trim()) {
            setError('Please enter a reason for the transfer');
            return;
        }

        if (!selectedAssignee) {
            setError('No assignee selected');
            return;
        }

        try {
            setTransferring(true);
            setError('');

            const response = await fetch('/api/agent/tickets/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticketId,
                    transferToId: selectedAssignee.id,
                    transferToType: selectedAssignee.type,
                    reason: transferReason.trim(),
                    agentId: currentAgentId,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Success! Call callback and close modal
                if (onTransferComplete) {
                    onTransferComplete(data);
                }
                onClose();
            } else {
                setError(data.message || 'Failed to transfer ticket');
            }
        } catch (error) {
            console.error('Error transferring ticket:', error);
            setError('An error occurred while transferring the ticket');
        } finally {
            setTransferring(false);
        }
    };

    // Filter agents and admins based on search query
    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        {page === 'reason' && (
                            <button
                                onClick={handleBackToSelection}
                                disabled={transferring}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {page === 'selection' ? 'Transfer Ticket' : 'Transfer Reason'}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                {page === 'selection'
                                    ? 'Select an agent or admin to transfer this ticket to'
                                    : `Transferring to ${selectedAssignee?.name}`
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={transferring}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {page === 'selection' ? (
                        <>
                            {/* Search */}
                            <div className="mb-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search agents or admins..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 h-11"
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <span className="ml-3 text-slate-600 dark:text-slate-400">Loading assignees...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Agents Section */}
                                    {filteredAgents.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Agents ({filteredAgents.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {filteredAgents.map(agent => (
                                                    <AgentAdminCard
                                                        key={agent.id}
                                                        id={agent.id}
                                                        name={agent.name}
                                                        department={agent.department?.name}
                                                        openTicketCount={agent.openTicketCount}
                                                        isSelected={false}
                                                        onClick={handleSelectAssignee}
                                                        type="agent"
                                                        avatarUrl={agent.avatarUrl}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Admins Section */}
                                    {filteredAdmins.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Admins ({filteredAdmins.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {filteredAdmins.map(admin => (
                                                    <AgentAdminCard
                                                        key={admin.id}
                                                        id={admin.id}
                                                        name={admin.name}
                                                        role={admin.role}
                                                        openTicketCount={admin.openTicketCount}
                                                        isSelected={false}
                                                        onClick={handleSelectAssignee}
                                                        type="admin"
                                                        avatarUrl={admin.avatarUrl}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Results */}
                                    {filteredAgents.length === 0 && filteredAdmins.length === 0 && (
                                        <div className="text-center py-12">
                                            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-600 dark:text-slate-400">
                                                {searchQuery ? 'No assignees found matching your search' : 'No assignees available'}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        // Reason Page
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Reason for Transfer <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={transferReason}
                                    onChange={(e) => setTransferReason(e.target.value)}
                                    placeholder="Please provide a reason for transferring this ticket..."
                                    rows={6}
                                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    disabled={transferring}
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    This reason will be visible to the recipient and logged in the ticket activity.
                                </p>
                            </div>

                            {/* Transfer Summary */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    Transfer Summary
                                </h4>
                                <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                    <p><span className="font-medium">Ticket:</span> #{ticketId}</p>
                                    <p><span className="font-medium">Transfer to:</span> {selectedAssignee?.name}</p>
                                    <p><span className="font-medium">Type:</span> {selectedAssignee?.type === 'agent' ? 'Agent' : 'Admin'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {page === 'reason' && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            variant="outline"
                            onClick={handleBackToSelection}
                            disabled={transferring}
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleTransfer}
                            disabled={transferring || !transferReason.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {transferring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {transferring ? 'Transferring...' : 'Transfer Ticket'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
