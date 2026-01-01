// Agent Page - My Callbacks
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AgentLayout from '../../../components/agent/universal/AgentLayout';
import PageHead from '../../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Phone, Calendar, Clock, Mail, User, CheckCircle2, XCircle, RefreshCw, MessageSquare, Filter, Loader2 } from 'lucide-react';
import { agentFetch } from '../../../lib/utils/agent-fetch';
import NotificationToast from '../../../components/ui/NotificationToast';

export default function AgentCallbacksPage() {
  const router = useRouter();
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState({ type: null, message: '' });

  useEffect(() => {
    fetchCallbacks();
  }, [statusFilter]);

  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      const response = await agentFetch(`/api/agent/callbacks?status=${statusFilter}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setCallbacks(data.callbacks || []);
      } else {
        showNotification('error', data.message || 'Failed to load callbacks');
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      showNotification('error', 'Failed to load callbacks');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800', label: 'Approved' },
      completed: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800', label: 'Cancelled' },
      denied: { color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-800', label: 'Denied' },
      rescheduled: { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800', label: 'Rescheduled' }
    };

    const badge = badges[status] || badges.pending;
    return (
      <Badge className={`${badge.color} border font-medium px-2.5 py-0.5 rounded-lg`}>
        {badge.label}
      </Badge>
    );
  };

  const handleMarkDone = async (callbackId) => {
    try {
      const response = await agentFetch(`/api/agent/callbacks/${callbackId}/complete`, {
        method: 'PATCH'
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showNotification('success', 'Callback marked as completed');
        fetchCallbacks();
      } else {
        showNotification('error', data.message || 'Failed to mark callback as done');
      }
    } catch (error) {
      console.error('Error marking callback as done:', error);
      showNotification('error', 'Failed to mark callback as done');
    }
  };

  const filteredCallbacks = callbacks.filter(callback => {
    if (statusFilter === 'all') return true;
    return callback.status === statusFilter;
  });

  const statusCounts = {
    all: callbacks.length,
    pending: callbacks.filter(c => c.status === 'pending').length,
    approved: callbacks.filter(c => c.status === 'approved').length,
    completed: callbacks.filter(c => c.status === 'completed').length,
    cancelled: callbacks.filter(c => c.status === 'cancelled').length
  };

  return (
    <AgentLayout>
      <PageHead title="My Callbacks" />
      <NotificationToast notification={notification} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-none mx-auto space-y-6 p-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
                    <Phone className="w-8 h-8" />
                    My Callbacks
                  </h1>
                  <p className="text-violet-100 dark:text-violet-200 text-base sm:text-lg">Manage your assigned callback requests</p>
                </div>
                <Button
                  onClick={fetchCallbacks}
                  variant="outline"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-11 px-4 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Callbacks List */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Assigned Callbacks ({filteredCallbacks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400" />
              </div>
            ) : filteredCallbacks.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-500 opacity-50" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">No callbacks found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCallbacks.map((callback) => (
                  <div
                    key={callback.id}
                    className="p-5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {callback.customerName}
                          </h3>
                          {getStatusBadge(callback.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span className="truncate">{callback.customerEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span>{callback.countryCode} {callback.phoneNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span>{formatDateTime(callback.scheduledTime)}</span>
                          </div>
                          {callback.rescheduledTime && (
                            <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              <span>Rescheduled: {formatDateTime(callback.rescheduledTime)}</span>
                            </div>
                          )}
                        </div>

                        {/* Reason Display */}
                        {callback.reason && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong className="font-semibold">📝 Reason for Callback:</strong> {callback.reason}
                            </p>
                          </div>
                        )}

                        {/* Notes Display */}
                        {callback.notes && (
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              <strong className="font-semibold">Notes:</strong> {callback.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4 flex-shrink-0 flex-wrap">
                        {callback.status !== 'completed' && callback.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkDone(callback.id)}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Done
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AgentLayout>
  );
}

