import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import PageHead from '../../../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Calendar, Clock, User, RefreshCw, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';

export default function AdminLeavesPage() {
  const [activeLeaves, setActiveLeaves] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningAgent, setReturningAgent] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [agentToReturn, setAgentToReturn] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/leaves');
      const data = await response.json();

      if (response.ok && data.success) {
        setActiveLeaves(data.activeLeaves || []);
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceReturnClick = (agent) => {
    setAgentToReturn(agent);
    setShowConfirmModal(true);
  };

  const handleForceReturnConfirm = async () => {
    if (!agentToReturn) return;

    try {
      setReturningAgent(agentToReturn.id);
      const response = await fetch('/api/admin/agents/leave-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentToReturn.id,
          status: 'ACTIVE',
        }),
      });

      if (response.ok) {
        setShowConfirmModal(false);
        setAgentToReturn(null);
        await fetchLeaves(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to force return');
      }
    } catch (error) {
      console.error('Error forcing return:', error);
      alert('Failed to force return');
    } finally {
      setReturningAgent(null);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'ON_LEAVE') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400">
          On Leave
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400">
        Returned
      </Badge>
    );
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatDateTime = (date) => {
    if (!date) return '—';
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  const getExpectedReturnStatus = (leaveTo) => {
    if (!leaveTo) return { text: 'Indefinite', variant: 'outline' };
    const endDate = new Date(leaveTo);
    if (isPast(endDate)) {
      return { text: 'Overdue', variant: 'destructive' };
    }
    if (isFuture(endDate)) {
      const daysLeft = differenceInDays(endDate, new Date());
      return { text: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, variant: 'default' };
    }
    return { text: 'Today', variant: 'default' };
  };

  return (
    <AdminLayout>
      <PageHead
        title="Agent Leave Management"
        description="View active leaves and leave history for all agents"
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Agent Leave Management
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Monitor active leaves and view leave history
              </p>
            </div>
            <Button onClick={fetchLeaves} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Active Leaves Section */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Active Leaves ({activeLeaves.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                </div>
              ) : activeLeaves.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No active leaves</p>
                    <p className="text-xs mt-1">All agents are currently active</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Agent</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Leave From</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLeaves.map((agent) => {
                      const returnStatus = getExpectedReturnStatus(agent.leaveTo);
                      return (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="font-medium text-sm">{agent.name}</div>
                                {agent.email && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {agent.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {agent.department ? (
                              <Badge variant="outline" className="text-xs">
                                {agent.department.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(agent.leaveFrom)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="text-sm">
                                {agent.leaveTo ? formatDate(agent.leaveTo) : 'Indefinite'}
                              </div>
                              {agent.leaveTo && (
                                <Badge variant={returnStatus.variant} className="text-xs">
                                  {returnStatus.text}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400">
                              On Leave
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleForceReturnClick(agent)}
                              disabled={returningAgent === agent.id}
                              className="text-xs"
                            >
                              {returningAgent === agent.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  Returning...
                                </>
                              ) : (
                                'Force Return'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Leave History Section */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Leave History ({history.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No leave history</p>
                    <p className="text-xs mt-1">Leave records will appear here</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Agent</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="font-medium text-sm">{leave.agentName}</div>
                              {leave.agentEmail && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {leave.agentEmail}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {leave.department ? (
                            <Badge variant="outline" className="text-xs">
                              {leave.department.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDateTime(leave.startDate)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDateTime(leave.endDate)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {leave.durationDays} day{leave.durationDays !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Force Return Confirmation Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showConfirmModal && agentToReturn && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !returningAgent) {
              setShowConfirmModal(false);
              setAgentToReturn(null);
            }
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-amber-200 dark:border-amber-900/50 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Force Return from Leave</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">This action will change the agent's status</p>
                </div>
                <button
                  onClick={() => {
                    if (!returningAgent) {
                      setShowConfirmModal(false);
                      setAgentToReturn(null);
                    }
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                  disabled={returningAgent}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                      Warning: This action will make the agent's profile active
                    </p>
                    <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
                      <li>The agent's status will be changed from "On Leave" to "Active"</li>
                      <li>The agent will be able to receive new ticket assignments</li>
                      <li>This action will be recorded in the leave history</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  <span className="font-medium">Agent:</span> {agentToReturn.name}
                </p>
                {agentToReturn.email && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {agentToReturn.email}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setAgentToReturn(null);
                  }}
                  disabled={returningAgent}
                  className="border-slate-300 dark:border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleForceReturnConfirm}
                  disabled={returningAgent}
                  className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white"
                >
                  {returningAgent ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Returning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Force Return
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
}

