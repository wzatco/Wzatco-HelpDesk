// Admin Page for Managing Callback Requests
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createPortal } from 'react-dom';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { withAuth } from '../../../lib/withAuth';
import { Phone, Search, Calendar, Clock, User, Mail, CheckCircle2, XCircle, UserCheck, Edit2, X, Loader2, Filter, Building2 } from 'lucide-react';

export default function CallbacksPage() {
  const router = useRouter();
  const [callbacks, setCallbacks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [selectedCallback, setSelectedCallback] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  useEffect(() => {
    setIsMounted(true);
    fetchCallbacks();
    fetchAgents();
  }, [statusFilter]);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showAssignModal || showDenyModal || showRescheduleModal) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.setAttribute('data-scroll-y', scrollY.toString());
    } else {
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-y');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
      }
    }
    
    return () => {
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-y');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
      }
    };
  }, [showAssignModal, showDenyModal, showRescheduleModal]);

  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/callbacks?status=${statusFilter}`);
      const data = await response.json();
      if (response.ok) {
        setCallbacks(data.callbacks || []);
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      showNotification('error', 'Failed to load callbacks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      const data = await response.json();
      if (response.ok) {
        // Filter active agents and ensure we have department and skills data
        const activeAgents = (data.agents || []).filter(a => a.isActive).map(agent => ({
          ...agent,
          skills: agent.skills ? (typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills) : []
        }));
        setAgents(activeAgents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleAssign = async () => {
    if (!selectedAgentId) {
      showNotification('error', 'Please select an agent');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/callbacks/${selectedCallback.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Callback assigned successfully');
        setShowAssignModal(false);
        setSelectedCallback(null);
        setSelectedAgentId('');
        fetchCallbacks();
      } else {
        showNotification('error', data.message || 'Failed to assign callback');
      }
    } catch (error) {
      console.error('Error assigning callback:', error);
      showNotification('error', 'Failed to assign callback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (callback = selectedCallback) => {
    if (!callback || !callback.id) {
      showNotification('error', 'No callback selected');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/callbacks/${callback.id}/approve`, {
        method: 'POST'
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Callback approved successfully');
        setSelectedCallback(null);
        fetchCallbacks();
      } else {
        showNotification('error', data.message || 'Failed to approve callback');
      }
    } catch (error) {
      console.error('Error approving callback:', error);
      showNotification('error', 'Failed to approve callback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeny = async () => {
    if (!denialReason.trim()) {
      showNotification('error', 'Please provide a reason for denial');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/callbacks/${selectedCallback.id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: denialReason })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Callback denied and customer notified');
        setShowDenyModal(false);
        setSelectedCallback(null);
        setDenialReason('');
        fetchCallbacks();
      } else {
        showNotification('error', data.message || 'Failed to deny callback');
      }
    } catch (error) {
      console.error('Error denying callback:', error);
      showNotification('error', 'Failed to deny callback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      showNotification('error', 'Please select both date and time');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/callbacks/${selectedCallback.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rescheduleDate, time: rescheduleTime })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Callback rescheduled and customer notified');
        setShowRescheduleModal(false);
        setSelectedCallback(null);
        setRescheduleDate('');
        setRescheduleTime('');
        fetchCallbacks();
      } else {
        showNotification('error', data.message || 'Failed to reschedule callback');
      }
    } catch (error) {
      console.error('Error rescheduling callback:', error);
      showNotification('error', 'Failed to reschedule callback');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800', label: 'Approved' },
      assigned: { color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800', label: 'Assigned' },
      denied: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800', label: 'Denied' },
      completed: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800', label: 'Completed' },
      cancelled: { color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', label: 'Cancelled' },
      missed: { color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800', label: 'Missed' },
      rescheduled: { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', label: 'Rescheduled' }
    };
    const badge = badges[status] || badges.pending;
    return <Badge className={`${badge.color} border font-medium px-2.5 py-0.5 rounded-lg`}>{badge.label}</Badge>;
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

  const filteredCallbacks = callbacks.filter(callback => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        callback.customerName?.toLowerCase().includes(query) ||
        callback.customerEmail?.toLowerCase().includes(query) ||
        callback.phoneNumber?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <AdminLayout currentPage="Callbacks">
      <PageHead title="Callback Management" />
      <Head>
        <title>Callback Management - WZATCO Admin</title>
      </Head>

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
                    Callback Management
                  </h1>
                  <p className="text-violet-100 dark:text-violet-200 text-base sm:text-lg">Manage and assign customer callback requests</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
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
                    <option value="assigned">Assigned</option>
                    <option value="denied">Denied</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Callbacks List */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Callback Requests ({filteredCallbacks.length})
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
                            {callback.rescheduleStatus === 'pending_acceptance' && (
                              <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-medium px-2.5 py-0.5 rounded-lg">Reschedule Pending</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                              <span className="truncate">{callback.customerEmail}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                              <span>{callback.phoneNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                              <span>{formatDateTime(callback.scheduledTime)}</span>
                            </div>
                            {callback.agent && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <UserCheck className="w-4 h-4 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                                <span>Assigned to: <span className="font-medium text-slate-900 dark:text-white">{callback.agent.name}</span></span>
                              </div>
                            )}
                            {callback.rescheduledTime && (
                              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <span>Rescheduled: {formatDateTime(callback.rescheduledTime)}</span>
                              </div>
                            )}
                          </div>

                          {callback.reason && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong className="font-semibold">📝 Reason for Callback:</strong> {callback.reason}
                              </p>
                            </div>
                          )}

                          {callback.denialReason && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-sm text-red-700 dark:text-red-300">
                                <strong className="font-semibold">Denial Reason:</strong> {callback.denialReason}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4 flex-shrink-0 flex-wrap">
                          {callback.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCallback(callback);
                                  handleApprove(callback);
                                }}
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                                disabled={submitting}
                              >
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </div>
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCallback(callback);
                                  setShowDenyModal(true);
                                }}
                                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                              >
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                  <XCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                                Deny
                              </Button>
                            </>
                          )}
                          
                          {/* Assign Agent button - show for pending and approved statuses if not assigned */}
                          {(callback.status === 'pending' || (callback.status === 'approved' && !callback.agentId)) && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCallback(callback);
                                setShowAssignModal(true);
                              }}
                              className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                            >
                              <UserCheck className="w-4 h-4" />
                              Assign Agent
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCallback(callback);
                              setRescheduleDate(new Date(callback.scheduledTime).toISOString().split('T')[0]);
                              setRescheduleTime('');
                              setShowRescheduleModal(true);
                            }}
                            className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 border-2 border-slate-300 dark:border-slate-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Reschedule
                          </Button>
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

      {/* Assign Agent Modal */}
      {isMounted && showAssignModal && selectedCallback && typeof window !== 'undefined' && document.body && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAssignModal(false);
              setSelectedCallback(null);
              setSelectedAgentId('');
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assign Agent</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedCallback(null);
                  setSelectedAgentId('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                  Select an Agent
                </label>
                <div className="space-y-3 max-h-[400px] overflow-y-auto hide-scrollbar">
                  {agents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No active agents available</p>
                    </div>
                  ) : (
                    agents.map((agent) => {
                      let skills = [];
                      try {
                        if (agent.skills) {
                          if (Array.isArray(agent.skills)) {
                            skills = agent.skills;
                          } else if (typeof agent.skills === 'string') {
                            skills = JSON.parse(agent.skills);
                          }
                        }
                      } catch (e) {
                        console.error('Error parsing skills:', e);
                        skills = [];
                      }
                      
                      return (
                        <div
                          key={agent.id}
                          onClick={() => setSelectedAgentId(agent.id)}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedAgentId === agent.id
                              ? 'border-violet-500 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0">
                              {agent.name?.charAt(0) || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">{agent.name}</h3>
                                {selectedAgentId === agent.id && (
                                  <div className="w-5 h-5 rounded-full bg-violet-600 dark:bg-violet-500 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  </div>
                                )}
                              </div>
                              {agent.department && (
                                <div className="mb-2 flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 text-xs font-medium">
                                    {agent.department.name || agent.department}
                                  </Badge>
                                </div>
                              )}
                              {skills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {skills.slice(0, 3).map((skill, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {skills.length > 3 && (
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium">
                                      +{skills.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                              {skills.length === 0 && !agent.department && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No additional information</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={handleAssign}
                  disabled={!selectedAgentId || submitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Assign
                </Button>
                <Button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedCallback(null);
                    setSelectedAgentId('');
                  }}
                  className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-2.5 rounded-xl font-medium transition-all"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Deny Modal */}
      {isMounted && showDenyModal && selectedCallback && typeof window !== 'undefined' && document.body && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDenyModal(false);
              setSelectedCallback(null);
              setDenialReason('');
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deny Callback Request</h2>
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setSelectedCallback(null);
                  setDenialReason('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Reason for Denial *
                </label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                  placeholder="Enter the reason for denying this callback request..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleDeny}
                  disabled={!denialReason.trim() || submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Deny & Notify Customer
                </Button>
                <Button
                  onClick={() => {
                    setShowDenyModal(false);
                    setSelectedCallback(null);
                    setDenialReason('');
                  }}
                  className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-2.5 rounded-xl font-medium transition-all"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reschedule Modal */}
      {isMounted && showRescheduleModal && selectedCallback && typeof window !== 'undefined' && document.body && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRescheduleModal(false);
              setSelectedCallback(null);
              setRescheduleDate('');
              setRescheduleTime('');
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reschedule Callback</h2>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedCallback(null);
                  setRescheduleDate('');
                  setRescheduleTime('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Select Date
                </label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setRescheduleTime(time)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        rescheduleTime === time
                          ? 'bg-violet-600 dark:bg-violet-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleReschedule}
                  disabled={!rescheduleDate || !rescheduleTime || submitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Reschedule & Notify
                </Button>
                <Button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setSelectedCallback(null);
                    setRescheduleDate('');
                    setRescheduleTime('');
                  }}
                  className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-2.5 rounded-xl font-medium transition-all"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {notification.type && (
        <NotificationToast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ type: null, message: '' })}
        />
      )}
    </AdminLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  return { props: {} };
});

