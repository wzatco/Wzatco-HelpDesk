import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { useAuth } from '../../../contexts/AuthContext';
import usePermissions from '../../../hooks/usePermissions';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import AgentPresenceIndicator from '../../../components/admin/AgentPresenceIndicator';
import ThemedSelect from '../../../components/ui/ThemedSelect';
import useSocket from '../../../src/hooks/useSocket';
import { withAuth } from '../../../lib/withAuth';
import {
  Users,
  Plus,
  Search as SearchIcon,
  Filter,
  MoreVertical,
  Mail,
  Clock,
  TrendingUp,
  Star,
  UserCheck,
  UserX,
  Ticket as TicketIcon,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Mail as MailIcon,
  Phone,
  Calendar,
  BarChart3,
  User,
  Edit,
  Trash2,
  Building2,
  UserPlus,
  LayoutGrid,
  List as ListIcon,
  X,
  Briefcase,
  Shield,
  Loader2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AgentsPage() {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Permission check - redirect if no access
  useEffect(() => {
    // Wait for both auth and permissions to load before checking
    if (!authLoading && !permissionsLoading) {
      // Temporarily disabled - allow all authenticated admins
      // if (!hasPermission('admin.agents')) {
      //   router.push('/admin/login');
      // }
    }
  }, [authLoading, permissionsLoading, hasPermission, router]);

  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, online, offline
  const [ticketCountFilter, setTicketCountFilter] = useState('all'); // all, 0-5, 6-10, 10+
  const [performanceFilter, setPerformanceFilter] = useState('all'); // all, high, medium, low
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [newAgent, setNewAgent] = useState({ name: '', email: '', userId: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
  const [skillInput, setSkillInput] = useState('');
  const [editAgent, setEditAgent] = useState({ name: '', email: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
  const [editSkillInput, setEditSkillInput] = useState('');
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgentsForAssign, setSelectedAgentsForAssign] = useState([]);
  const [assignDepartmentId, setAssignDepartmentId] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const socketRef = useSocket({ token: 'admin-demo' });
  const menuButtonRefs = useRef({});
  const listContainerRef = useRef(null);

  // Read URL query parameters and initialize filters FIRST
  useEffect(() => {
    if (router.isReady) {
      const { status } = router.query;
      if (status === 'online' || status === 'offline') {
        setStatusFilter(status);
      } else {
        setStatusFilter('all');
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    fetchAgents();
    fetchDepartments();
    fetchRoles();
  }, []);

  // Listen for real-time presence updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handlePresenceUpdate = (data) => {
      setAgents(prevAgents =>
        prevAgents.map(agent => {
          if (agent.id === data.agentId || agent.slug === data.agentSlug) {
            return {
              ...agent,
              presenceStatus: data.presenceStatus,
              status: data.presenceStatus,
              lastSeenAt: data.lastSeenAt,
              isOnline: data.presenceStatus === 'online'
            };
          }
          return agent;
        })
      );
    };

    socket.on('agent:presence:update', handlePresenceUpdate);

    return () => {
      socket.off('agent:presence:update', handlePresenceUpdate);
    };
  }, [socketRef]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      const data = await response.json();
      if (response.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      if (response.ok) {
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddModal || showEditModal) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Disable body scroll and lock position
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      // Store scroll position for restoration
      document.body.setAttribute('data-scroll-y', scrollY.toString());
    } else {
      // Re-enable body scroll
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

    // Cleanup
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
  }, [showAddModal, showEditModal]);

  const fetchAgents = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch('/api/admin/agents');
      const data = await response.json();

      if (response.ok) {
        setAgents(data.agents);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Enable silent auto-refresh on socket events
  useAutoRefresh(fetchAgents);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    if (!newAgent.name || !newAgent.email) {
      showNotification('error', 'Name and email are required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newAgent.name.trim(),
          email: newAgent.email.trim(),
          userId: newAgent.userId.trim() || null,
          departmentId: newAgent.departmentId && newAgent.departmentId !== '' ? newAgent.departmentId : null,
          roleId: newAgent.roleId && newAgent.roleId !== '' ? newAgent.roleId : null,
          skills: (newAgent.skills && Array.isArray(newAgent.skills) && newAgent.skills.length > 0) ? JSON.stringify(newAgent.skills) : null,
          maxLoad: newAgent.maxLoad && newAgent.maxLoad !== '' ? parseInt(newAgent.maxLoad) : null,
          isActive: newAgent.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Agent added successfully');
        setShowAddModal(false);
        setNewAgent({ name: '', email: '', userId: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
        setSkillInput('');
        fetchAgents(); // Refresh the list
      } else {
        showNotification('error', data.message || 'Failed to add agent');
      }
    } catch (error) {
      console.error('Error adding agent:', error);
      showNotification('error', 'An error occurred while adding the agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMessageAgent = async (agent) => {
    try {
      // Call the Handshake API to get/create a chat
      const response = await fetch('/api/internal/chats/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: agent.id,
          targetUserType: 'agent'
        })
      });

      const data = await response.json();

      if (response.ok && data.chat?.id) {
        // Redirect to the chat page with the chat ID
        router.push(`/admin/chat?chatId=${data.chat.id}`);
      } else {
        showNotification('error', data.message || 'Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      showNotification('error', 'An error occurred while opening chat');
    }
  };

  const handleViewProfile = (agent) => {
    // Use slug if available, fallback to id for backward compatibility
    const identifier = agent.slug || agent.id;
    router.push(`/admin/agents/${identifier}`);
  };


  const handleEditAgent = (agent) => {
    setEditingAgent(agent);
    // Parse skills if they exist
    let skills = [];
    if (agent.skills) {
      try {
        skills = typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills;
        if (!Array.isArray(skills)) skills = [];
      } catch (e) {
        skills = [];
      }
    }
    setEditAgent({
      name: agent.name || '',
      email: agent.email || '',
      departmentId: agent.departmentId || '',
      roleId: agent.roleId ? String(agent.roleId) : '', // Ensure roleId is a string or empty string
      skills: skills,
      maxLoad: agent.maxLoad ? String(agent.maxLoad) : '',
      isActive: agent.isActive !== undefined ? agent.isActive : true
    });
    setEditSkillInput('');
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleChangePassword = async () => {
    if (!editingAgent) return;

    // For admins, current password is optional
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      showNotification('error', 'Please fill in new password and confirmation');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showNotification('error', 'Password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('error', 'Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const requestBody = {
        newPassword: passwordData.newPassword
      };

      const response = await fetch(`/api/admin/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Password changed successfully');
        setPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        showNotification('error', data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showNotification('error', 'An error occurred while changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    if (!editingAgent) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editAgent.name.trim(),
          email: editAgent.email.trim(),
          departmentId: editAgent.departmentId && editAgent.departmentId !== '' ? editAgent.departmentId : null,
          roleId: editAgent.roleId && editAgent.roleId !== '' ? editAgent.roleId : null,
          skills: editAgent.skills.length > 0 ? JSON.stringify(editAgent.skills) : null,
          maxLoad: editAgent.maxLoad && editAgent.maxLoad !== '' ? parseInt(editAgent.maxLoad) : null,
          isActive: editAgent.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Agent updated successfully');
        setShowEditModal(false);
        setEditingAgent(null);
        fetchAgents();
      } else {
        showNotification('error', data.message || 'Failed to update agent');
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      showNotification('error', 'An error occurred while updating agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignDepartment = async (agentId, departmentId) => {
    try {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          departmentId: departmentId || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', departmentId ? 'Agent assigned to department' : 'Agent unassigned from department');
        fetchAgents();
      } else {
        showNotification('error', data.message || 'Failed to assign agent');
      }
    } catch (error) {
      console.error('Error assigning agent:', error);
      showNotification('error', 'An error occurred while assigning agent');
    }
    setOpenMenuId(null);
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;

    try {
      setDeletingAgent(true);
      const response = await fetch(`/api/admin/agents/${agentToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Agent deleted successfully');
        setShowDeleteModal(false);
        setAgentToDelete(null);
        fetchAgents();
      } else {
        showNotification('error', data.message || 'Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      showNotification('error', 'An error occurred while deleting agent');
    } finally {
      setDeletingAgent(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedAgentsForAssign.length === 0) {
      showNotification('error', 'Please select at least one agent');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/agents/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentIds: selectedAgentsForAssign,
          departmentId: assignDepartmentId || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', `Successfully assigned ${data.count} agent(s)`);
        setShowAssignModal(false);
        setSelectedAgentsForAssign([]);
        setAssignDepartmentId('');
        fetchAgents();
      } else {
        showNotification('error', data.message || 'Failed to assign agents');
      }
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      showNotification('error', 'An error occurred while assigning agents');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpdate = async (updateData) => {
    if (selectedAgentsForAssign.length === 0) {
      showNotification('error', 'Please select at least one agent');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/admin/agents/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentIds: selectedAgentsForAssign,
          updateData: updateData
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', `Successfully updated ${data.count} agent(s)`);
        setSelectedAgentsForAssign([]);
        fetchAgents();
      } else {
        showNotification('error', data.message || 'Failed to update agents');
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      showNotification('error', 'An error occurred while updating agents');
    } finally {
      setSubmitting(false);
    }
  };

  const formatLastActive = (lastActive) => {
    const now = new Date();
    const diff = now - new Date(lastActive);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes < 1) return 'Just now';
    return `${minutes}m ago`;
  };

  // Filter agents based on search and all filters
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = searchQuery.trim() === '' ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.email && agent.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'online' && (agent.isOnline === true || agent.presenceStatus === 'online' || agent.status === 'online')) ||
      (statusFilter === 'offline' && (agent.isOnline !== true && agent.presenceStatus !== 'online' && agent.status !== 'online'));

    const matchesTicketCount = ticketCountFilter === 'all' ||
      (ticketCountFilter === '0-5' && agent.ticketCount >= 0 && agent.ticketCount <= 5) ||
      (ticketCountFilter === '6-10' && agent.ticketCount >= 6 && agent.ticketCount <= 10) ||
      (ticketCountFilter === '10+' && agent.ticketCount > 10);

    const matchesPerformance = performanceFilter === 'all' ||
      (performanceFilter === 'high' && parseFloat(agent.performance?.customerRating || 0) >= 4.5) ||
      (performanceFilter === 'medium' && parseFloat(agent.performance?.customerRating || 0) >= 3.5 && parseFloat(agent.performance?.customerRating || 0) < 4.5) ||
      (performanceFilter === 'low' && parseFloat(agent.performance?.customerRating || 0) < 3.5);

    const matchesDepartment = departmentFilter === 'all' ||
      (departmentFilter === 'unassigned' && !agent.departmentId) ||
      (departmentFilter === agent.departmentId);

    return matchesSearch && matchesStatus && matchesTicketCount && matchesPerformance && matchesDepartment;
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <>
      <Head>
        <title>Agents - WZATCO Support</title>
        <meta name="description" content="Manage your support team agents" />
      </Head>

      <AdminLayout currentPage="Agents">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="max-w-none mx-auto space-y-6 p-6">
            {/* Enhanced Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 p-6 sm:p-8 text-white shadow-2xl">
              <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Agents</h1>
                    <p className="text-violet-100 dark:text-violet-200 text-base sm:text-lg">Manage and monitor your support team</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-white text-violet-700 hover:bg-violet-50 dark:bg-white dark:text-violet-800 dark:hover:bg-violet-100 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                    >
                      <Plus className="w-5 h-5" />
                      Add Agent
                    </Button>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
            </div>

            {/* Enhanced Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="border-0 shadow-xl dark:bg-slate-800/90 dark:border-slate-700/50 bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg ring-2 ring-blue-500/20 dark:ring-blue-400/20">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Agents</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{summary.totalAgents || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800/90 dark:border-slate-700/50 bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg ring-2 ring-green-500/20 dark:ring-green-400/20">
                        <UserCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Online</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{summary.onlineAgents || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800/90 dark:border-slate-700/50 bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-lg ring-2 ring-slate-500/20 dark:ring-slate-400/20">
                        <UserX className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Offline</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{summary.offlineAgents || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800/90 dark:border-slate-700/50 bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg ring-2 ring-violet-500/20 dark:ring-violet-400/20">
                        <TicketIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Avg Tickets</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{summary.avgTicketsPerAgent || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter Section */}
            <div className="space-y-4">
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                {/* Search Bar and View Toggle */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10" />
                    <Input
                      type="text"
                      placeholder="Search agents by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 border-2 border-violet-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all bg-white"
                    />
                  </div>
                  {/* View Toggle */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`p-2.5 rounded-lg transition-all ${viewMode === 'card'
                        ? 'bg-violet-600 dark:bg-violet-600 text-white shadow-md shadow-violet-500/30'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      title="Card View"
                    >
                      <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2.5 rounded-lg transition-all ${viewMode === 'list'
                        ? 'bg-violet-600 dark:bg-violet-600 text-white shadow-md shadow-violet-500/30'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      title="List View"
                    >
                      <ListIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Filter Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-11 px-4 border-2 border-violet-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm font-medium bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Ticket Count</label>
                    <select
                      value={ticketCountFilter}
                      onChange={(e) => setTicketCountFilter(e.target.value)}
                      className="w-full h-11 px-4 border-2 border-violet-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm font-medium bg-white"
                    >
                      <option value="all">All Tickets</option>
                      <option value="0-5">0 - 5 Tickets</option>
                      <option value="6-10">6 - 10 Tickets</option>
                      <option value="10+">10+ Tickets</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Performance</label>
                    <select
                      value={performanceFilter}
                      onChange={(e) => setPerformanceFilter(e.target.value)}
                      className="w-full h-11 px-4 border-2 border-violet-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm font-medium bg-white"
                    >
                      <option value="all">All Performance</option>
                      <option value="high">High (4.5+)</option>
                      <option value="medium">Medium (3.5 - 4.4)</option>
                      <option value="low">Low (&lt; 3.5)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Department</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full h-11 px-4 border-2 border-violet-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm font-medium bg-white"
                    >
                      <option value="all">All Departments</option>
                      <option value="unassigned">Unassigned</option>
                      {departments.filter(d => d.isActive).map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Actions Section */}
            {selectedAgentsForAssign.length > 0 && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border-2 border-violet-200 dark:border-violet-700/50 rounded-2xl shadow-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedAgentsForAssign.length} {selectedAgentsForAssign.length === 1 ? 'Agent' : 'Agents'} Selected
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Choose an action to perform on selected agents
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={() => setShowAssignModal(true)}
                      className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      Assign Department
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`Are you sure you want to activate ${selectedAgentsForAssign.length} agent(s)?`)) {
                          handleBulkUpdate({ isActive: true });
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      Activate
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`Are you sure you want to deactivate ${selectedAgentsForAssign.length} agent(s)?`)) {
                          handleBulkUpdate({ isActive: false });
                        }
                      }}
                      className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <UserX className="w-4 h-4" />
                      Deactivate
                    </Button>
                    <Button
                      onClick={() => setSelectedAgentsForAssign([])}
                      variant="outline"
                      className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl transition-all"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Agents List */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden" data-list-container ref={listContainerRef}>
              <div className="bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 px-6 py-4 border-b border-violet-500/20 dark:border-violet-700/20">
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Agent List</span>
                  <Badge className="ml-auto bg-white/20 dark:bg-white/10 text-white border-white/30 dark:border-white/20 backdrop-blur-sm">
                    {filteredAgents.length} {filteredAgents.length === 1 ? 'Agent' : 'Agents'}
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-700/50">
                          <div className="w-14 h-14 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/4"></div>
                            <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/3"></div>
                          </div>
                          <div className="w-24 h-8 bg-slate-300 dark:bg-slate-600 rounded-lg"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredAgents.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {searchQuery || statusFilter !== 'all' ? 'No agents found' : 'No agents yet'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Get started by adding your first agent to the team.'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                      <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                        <Plus className="w-5 h-5 mr-2" />
                        Add Your First Agent
                      </Button>
                    )}
                  </div>
                ) : viewMode === 'list' ? (
                  /* List View */
                  <div className="space-y-1">
                    {/* List Header */}
                    <div className="hidden md:flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="w-4">
                        <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedAgentsForAssign.length === filteredAgents.length && filteredAgents.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAgentsForAssign(filteredAgents.map(a => a.id));
                              } else {
                                setSelectedAgentsForAssign([]);
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${selectedAgentsForAssign.length === filteredAgents.length && filteredAgents.length > 0
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                            }`}>
                            {(selectedAgentsForAssign.length === filteredAgents.length && filteredAgents.length > 0) && (
                              <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                        </label>
                      </div>
                      <div className="flex-1 grid grid-cols-12 gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        <div className="col-span-3">Agent</div>
                        <div className="col-span-2">Department</div>
                        <div className="col-span-1 text-center">Tickets</div>
                        <div className="col-span-1 text-center">Resolved</div>
                        <div className="col-span-1 text-center hidden xl:block">Response</div>
                        <div className="col-span-1 text-center hidden xl:block">Rating</div>
                        <div className="col-span-1 text-center">Status</div>
                        <div className="col-span-1 text-center">Active</div>
                        <div className="col-span-1 text-center">Actions</div>
                      </div>
                    </div>

                    {/* List Items */}
                    {filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all hover:shadow-md ${selectedAgentsForAssign.includes(agent.id)
                          ? 'border-violet-500 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-600'
                          }`}
                      >
                        {/* Checkbox */}
                        <div className="w-4 flex-shrink-0">
                          <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedAgentsForAssign.includes(agent.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAgentsForAssign([...selectedAgentsForAssign, agent.id]);
                                } else {
                                  setSelectedAgentsForAssign(selectedAgentsForAssign.filter(id => id !== agent.id));
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${selectedAgentsForAssign.includes(agent.id)
                              ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                              }`}>
                              {selectedAgentsForAssign.includes(agent.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                          </label>
                        </div>

                        {/* Content Grid */}
                        <div className="flex-1 grid grid-cols-12 gap-3 items-center text-sm">
                          {/* Agent Info */}
                          <div className="col-span-12 md:col-span-3 flex items-center gap-2 min-w-0">
                            <Avatar className="w-8 h-8 ring-2 ring-violet-100 dark:ring-violet-900/50 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-bold">
                                {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-slate-900 dark:text-white truncate text-sm">{agent.name}</div>
                                {agent.leaveStatus === 'ON_LEAVE' && (
                                  <Badge 
                                    className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 text-[10px] px-1.5 py-0.5 flex items-center gap-1"
                                    title={agent.leaveTo ? `On leave until ${new Date(agent.leaveTo).toLocaleDateString()}` : 'On leave'}
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                    Leave
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{agent.email || 'No email'}</div>
                            </div>
                          </div>

                          {/* Department */}
                          <div className="col-span-6 md:col-span-2 flex items-center">
                            {agent.department ? (
                              <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 text-xs px-2 py-0.5">
                                {agent.department.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">Unassigned</span>
                            )}
                          </div>

                          {/* Tickets */}
                          <div className="col-span-2 md:col-span-1 text-center">
                            <span className="font-semibold text-slate-900 dark:text-white">{agent.ticketCount || 0}</span>
                          </div>

                          {/* Resolved */}
                          <div className="col-span-2 md:col-span-1 text-center">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{agent.performance?.ticketsResolved || 0}</span>
                          </div>

                          {/* Response Time - Hidden on smaller screens */}
                          <div className="hidden xl:block col-span-1 text-center">
                            <span className="text-sm text-slate-700 dark:text-slate-300">{agent.performance?.avgResponseTime || 0}m</span>
                          </div>

                          {/* Rating - Hidden on smaller screens */}
                          <div className="hidden xl:flex col-span-1 items-center justify-center gap-1">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{agent.performance?.customerRating || '0.0'}</span>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          </div>

                          {/* Status */}
                          <div className="col-span-2 md:col-span-1 flex justify-center">
                            <AgentPresenceIndicator
                              presenceStatus={agent.isOnline ? 'online' : (agent.presenceStatus || agent.status || 'offline')}
                              showLabel={true}
                              size="small"
                            />
                          </div>

                          {/* Active Toggle */}
                          <div className="col-span-2 md:col-span-1 flex justify-center">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const response = await fetch(`/api/admin/agents/${agent.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ isActive: !agent.isActive })
                                  });
                                  if (response.ok) {
                                    setAgents(agents.map(a =>
                                      a.id === agent.id ? { ...a, isActive: !agent.isActive } : a
                                    ));
                                    setNotification({
                                      type: 'success',
                                      message: `Agent ${agent.isActive ? 'deactivated' : 'activated'}`
                                    });
                                  }
                                } catch (error) {
                                  setNotification({ type: 'error', message: 'Failed to update agent status' });
                                }
                              }}
                              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${agent.isActive
                                ? 'bg-green-500 dark:bg-green-600'
                                : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                              title={agent.isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${agent.isActive ? 'translate-x-5' : 'translate-x-0.5'
                                  }`}
                              />
                            </button>
                          </div>

                          {/* Actions */}
                          <div className="col-span-4 md:col-span-1 flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMessageAgent(agent);
                              }}
                              className="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded transition-colors"
                              title="Message"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <div className="relative">
                              <button
                                ref={el => menuButtonRefs.current[agent.id] = el}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === agent.id ? null : agent.id);
                                }}
                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === agent.id && (() => {
                                const button = menuButtonRefs.current[agent.id];
                                const container = listContainerRef.current;
                                let shouldRenderUp = false;

                                if (button && container) {
                                  const buttonRect = button.getBoundingClientRect();
                                  const containerRect = container.getBoundingClientRect();
                                  const dropdownHeight = 300; // Approximate dropdown height
                                  const spaceBelow = containerRect.bottom - buttonRect.bottom;
                                  const spaceAbove = buttonRect.top - containerRect.top;

                                  // If not enough space below and more space above, render upward
                                  shouldRenderUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
                                }

                                return (
                                  <div className={`absolute right-0 z-50 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${shouldRenderUp ? 'bottom-full mb-1' : 'top-full mt-1'
                                    }`}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewProfile(agent);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                    >
                                      <User className="w-3.5 h-3.5" />
                                      View Profile
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAgent(agent);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      Edit Agent
                                    </button>
                                    <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                      Department
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAssignDepartment(agent.id, null);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                      Unassign
                                    </button>
                                    {departments.filter(d => d.isActive).map(dept => (
                                      <button
                                        key={dept.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignDepartment(agent.id, dept.id);
                                          setOpenMenuId(null);
                                        }}
                                        className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${agent.departmentId === dept.id
                                          ? 'text-violet-600 dark:text-violet-400 font-medium bg-violet-50 dark:bg-violet-900/20'
                                          : 'text-slate-600 dark:text-slate-400'
                                          }`}
                                      >
                                        {dept.name}
                                      </button>
                                    ))}
                                    <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAgentToDelete(agent);
                                        setShowDeleteModal(true);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Card View */
                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
                    {filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className={`group p-3 rounded-xl border bg-white dark:bg-slate-800 hover:shadow-lg transition-all ${selectedAgentsForAssign.includes(agent.id)
                          ? 'border-violet-500 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600'
                          }`}
                      >
                        {/* Header Row */}
                        <div className="flex items-center gap-2 mb-2">
                          <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedAgentsForAssign.includes(agent.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAgentsForAssign([...selectedAgentsForAssign, agent.id]);
                                } else {
                                  setSelectedAgentsForAssign(selectedAgentsForAssign.filter(id => id !== agent.id));
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${selectedAgentsForAssign.includes(agent.id)
                              ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                              }`}>
                              {selectedAgentsForAssign.includes(agent.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                          </label>
                          <Avatar className="w-10 h-10 ring-2 ring-violet-100 dark:ring-violet-900/50">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold">
                              {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {agent.name}
                              </h3>
                              {agent.leaveStatus === 'ON_LEAVE' && (
                                <Badge 
                                  className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 text-[10px] px-1.5 py-0.5 flex items-center gap-1"
                                  title={agent.leaveTo ? `On leave until ${new Date(agent.leaveTo).toLocaleDateString()}` : 'On leave'}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                  Leave
                                </Badge>
                              )}
                              <AgentPresenceIndicator
                                presenceStatus={agent.isOnline ? 'online' : (agent.presenceStatus || agent.status || 'offline')}
                                showLabel={false}
                                size="small"
                              />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{agent.email || 'No email'}</p>
                          </div>
                          <div className="relative flex-shrink-0">
                            <button
                              ref={el => menuButtonRefs.current[agent.id] = el}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === agent.id ? null : agent.id);
                              }}
                              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === agent.id && (() => {
                              const button = menuButtonRefs.current[agent.id];
                              const container = listContainerRef.current;
                              let shouldRenderUp = false;

                              if (button && container) {
                                const buttonRect = button.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                const dropdownHeight = 300; // Approximate dropdown height
                                const spaceBelow = containerRect.bottom - buttonRect.bottom;
                                const spaceAbove = buttonRect.top - containerRect.top;

                                // If not enough space below and more space above, render upward
                                shouldRenderUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
                              }

                              return (
                                <div className={`absolute right-0 z-50 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${shouldRenderUp ? 'bottom-full mb-1' : 'top-full mt-1'
                                  }`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMessageAgent(agent);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors flex items-center gap-2"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Send Message
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewProfile(agent);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                  >
                                    <User className="w-3.5 h-3.5" />
                                    View Profile
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditAgent(agent);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    Edit Agent
                                  </button>
                                  <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    Department
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssignDepartment(agent.id, null);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    Unassign
                                  </button>
                                  {departments.filter(d => d.isActive).map(dept => (
                                    <button
                                      key={dept.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAssignDepartment(agent.id, dept.id);
                                        setOpenMenuId(null);
                                      }}
                                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${agent.departmentId === dept.id
                                        ? 'text-violet-600 dark:text-violet-400 font-medium bg-violet-50 dark:bg-violet-900/20'
                                        : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                      {dept.name}
                                    </button>
                                  ))}
                                  <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAgentToDelete(agent);
                                      setShowDeleteModal(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Department Badge */}
                        {agent.department && (
                          <div className="mb-2">
                            <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 text-xs px-2 py-0.5">
                              {agent.department.name}
                            </Badge>
                          </div>
                        )}

                        {/* Stats in compact 4-column grid */}
                        <div className="grid grid-cols-4 gap-2 py-2 mb-2 border-y border-slate-200/50 dark:border-slate-700/50">
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Tickets</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{agent.ticketCount || 0}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Resolved</div>
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{agent.performance?.ticketsResolved || 0}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Rating</div>
                            <div className="flex items-center justify-center gap-0.5">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{agent.performance?.customerRating || '0.0'}</span>
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Response</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{agent.performance?.avgResponseTime || 0}m</div>
                          </div>
                        </div>

                        {/* Bottom Actions Row with Toggle */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleMessageAgent(agent)}
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg px-2"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Message
                          </Button>
                          <Button
                            onClick={() => handleViewProfile(agent)}
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg px-2"
                          >
                            View
                          </Button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(`/api/admin/agents/${agent.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ isActive: !agent.isActive })
                                });
                                if (response.ok) {
                                  setAgents(agents.map(a =>
                                    a.id === agent.id ? { ...a, isActive: !agent.isActive } : a
                                  ));
                                  setNotification({
                                    type: 'success',
                                    message: `Agent ${agent.isActive ? 'deactivated' : 'activated'}`
                                  });
                                }
                              } catch (error) {
                                setNotification({ type: 'error', message: 'Failed to update agent status' });
                              }
                            }}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${agent.isActive
                              ? 'bg-green-500 dark:bg-green-600'
                              : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            title={agent.isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${agent.isActive ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Assignment Modal */}
            {showAssignModal && typeof window !== 'undefined' && createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAssignModal(false);
                    setAssignDepartmentId('');
                  }
                }}
              >
                <div
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assign to Department</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {selectedAgentsForAssign.length} agent(s) selected
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAssignModal(false);
                        setAssignDepartmentId('');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleBulkAssign(); }} className="p-6 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-violet-600" />
                        Department Assignment
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Select Department
                        </label>
                        <select
                          value={assignDepartmentId}
                          onChange={(e) => setAssignDepartmentId(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="">Unassign from Department</option>
                          {departments.filter(d => d.isActive).map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Select a department to assign all selected agents, or leave empty to unassign them
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAssignModal(false);
                          setAssignDepartmentId('');
                        }}
                        disabled={submitting}
                        className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <Building2 className="w-4 h-4 mr-2" />
                            Assign
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

            {/* Add Agent Modal */}
            {showAddModal && typeof window !== 'undefined' && createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddModal(false);
                    setNewAgent({ name: '', email: '', userId: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
                    setSkillInput('');
                  }
                }}
              >
                <div
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Agent</h2>
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setNewAgent({ name: '', email: '', userId: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
                        setSkillInput('');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddAgent} className="p-6 space-y-6">
                    {/* Agent Information */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-violet-600" />
                        Agent Information
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Agent Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={newAgent.name}
                            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="e.g., John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={newAgent.email}
                            onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="agent@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            User ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={newAgent.userId}
                            onChange={(e) => setNewAgent({ ...newAgent, userId: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Unique user identifier"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Department (Optional)
                          </label>
                          <ThemedSelect
                            options={[
                              { value: '', label: 'Select a department...' },
                              ...departments
                                .filter((dept) => dept.isActive)
                                .map((dept) => ({
                                  value: dept.id,
                                  label: dept.name
                                }))
                            ]}
                            value={newAgent.departmentId || ''}
                            onChange={(value) => setNewAgent({ ...newAgent, departmentId: value })}
                            placeholder="Select a department..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Role (Optional)
                          </label>
                          <ThemedSelect
                            options={[
                              { value: '', label: 'Select a role...' },
                              ...roles.map((role) => ({
                                value: role.id,
                                label: role.title
                              }))
                            ]}
                            value={newAgent.roleId || ''}
                            onChange={(value) => setNewAgent({ ...newAgent, roleId: value })}
                            placeholder="Select a role..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Max Load (Optional)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={newAgent.maxLoad}
                            onChange={(e) => setNewAgent({ ...newAgent, maxLoad: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Maximum concurrent tickets"
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Maximum number of tickets this agent can handle simultaneously
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Skills Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-violet-600" />
                        Skills (Optional)
                      </h2>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const currentSkills = newAgent.skills || [];
                                if (skillInput.trim() && !currentSkills.includes(skillInput.trim())) {
                                  setNewAgent({ ...newAgent, skills: [...currentSkills, skillInput.trim()] });
                                  setSkillInput('');
                                }
                              }
                            }}
                            className="flex-1 h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Enter a skill and press Enter"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              const currentSkills = newAgent.skills || [];
                              if (skillInput.trim() && !currentSkills.includes(skillInput.trim())) {
                                setNewAgent({ ...newAgent, skills: [...currentSkills, skillInput.trim()] });
                                setSkillInput('');
                              }
                            }}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                          >
                            Add
                          </Button>
                        </div>

                        {newAgent.skills && Array.isArray(newAgent.skills) && newAgent.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {newAgent.skills.map((skill, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium"
                              >
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewAgent({ ...newAgent, skills: (newAgent.skills || []).filter((_, i) => i !== index) });
                                  }}
                                  className="hover:text-violet-900 dark:hover:text-violet-100"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-violet-600" />
                        Status
                      </h2>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newAgent.isActive}
                          onChange={(e) => setNewAgent({ ...newAgent, isActive: e.target.checked })}
                          className="w-5 h-5 rounded border-2 border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-900 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 cursor-pointer accent-violet-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Agent is active
                        </span>
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-8">
                        Inactive agents won't be assigned new tickets
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddModal(false);
                          setNewAgent({ name: '', email: '', userId: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
                          setSkillInput('');
                        }}
                        disabled={submitting}
                        className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Adding...' : 'Add Agent'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

            {/* Edit Agent Modal */}
            {showEditModal && editingAgent && typeof window !== 'undefined' && createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowEditModal(false);
                    setEditingAgent(null);
                    setEditAgent({ name: '', email: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }
                }}
              >
                <div
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Agent</h2>
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingAgent(null);
                        setEditAgent({ name: '', email: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
                        setPasswordData({ newPassword: '', confirmPassword: '' });
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateAgent} className="p-6 space-y-6">
                    {/* Agent Information */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-violet-600" />
                        Agent Information
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Agent Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editAgent.name}
                            onChange={(e) => setEditAgent({ ...editAgent, name: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="e.g., John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={editAgent.email}
                            onChange={(e) => setEditAgent({ ...editAgent, email: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="agent@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Department (Optional)
                          </label>
                          <ThemedSelect
                            options={[
                              { value: '', label: 'Select a department...' },
                              ...departments
                                .filter((dept) => dept.isActive)
                                .map((dept) => ({
                                  value: dept.id,
                                  label: dept.name
                                }))
                            ]}
                            value={editAgent.departmentId || ''}
                            onChange={(value) => setEditAgent({ ...editAgent, departmentId: value })}
                            placeholder="Select a department..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Role (Optional)
                          </label>
                          <ThemedSelect
                            options={[
                              { value: '', label: 'Select a role...' },
                              ...roles.map((role) => ({
                                value: role.id,
                                label: role.title
                              }))
                            ]}
                            value={editAgent.roleId || ''}
                            onChange={(value) => setEditAgent({ ...editAgent, roleId: value })}
                            placeholder="Select a role..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Max Load (Optional)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editAgent.maxLoad}
                            onChange={(e) => setEditAgent({ ...editAgent, maxLoad: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Maximum concurrent tickets"
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Maximum number of tickets this agent can handle simultaneously
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Skills Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-violet-600" />
                        Skills (Optional)
                      </h2>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editSkillInput}
                            onChange={(e) => setEditSkillInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (editSkillInput.trim() && !editAgent.skills.includes(editSkillInput.trim())) {
                                  setEditAgent({ ...editAgent, skills: [...editAgent.skills, editSkillInput.trim()] });
                                  setEditSkillInput('');
                                }
                              }
                            }}
                            className="flex-1 h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Enter a skill and press Enter"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (editSkillInput.trim() && !editAgent.skills.includes(editSkillInput.trim())) {
                                setEditAgent({ ...editAgent, skills: [...editAgent.skills, editSkillInput.trim()] });
                                setEditSkillInput('');
                              }
                            }}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                          >
                            Add
                          </Button>
                        </div>

                        {editAgent.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {editAgent.skills.map((skill, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium"
                              >
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditAgent({ ...editAgent, skills: editAgent.skills.filter((_, i) => i !== index) });
                                  }}
                                  className="hover:text-violet-900 dark:hover:text-violet-100"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Change Password Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-violet-600" />
                        Change Password
                      </h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className="w-full h-11 px-4 pr-10 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                              placeholder="Enter new password (min 6 characters)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                              aria-label={showNewPassword ? "Hide password" : "Show password"}
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="w-full h-11 px-4 pr-10 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                              placeholder="Confirm new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        {(passwordData.newPassword || passwordData.confirmPassword) && (
                          <button
                            type="button"
                            onClick={handleChangePassword}
                            disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 6}
                            className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            {changingPassword ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Changing Password...
                              </>
                            ) : (
                              'Change Password'
                            )}
                          </button>
                        )}
                        {passwordData.newPassword && passwordData.newPassword.length < 6 && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Password must be at least 6 characters long
                          </p>
                        )}
                        {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Passwords do not match
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-violet-600" />
                        Status
                      </h2>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editAgent.isActive}
                          onChange={(e) => setEditAgent({ ...editAgent, isActive: e.target.checked })}
                          className="w-5 h-5 rounded border-2 border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-900 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 cursor-pointer accent-violet-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Agent is active
                        </span>
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-8">
                        Inactive agents won't be assigned new tickets
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingAgent(null);
                          setEditAgent({ name: '', email: '', departmentId: '', roleId: '', skills: [], maxLoad: '', isActive: true });
                          setPasswordData({ newPassword: '', confirmPassword: '' });
                        }}
                        disabled={submitting}
                        className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Updating...' : 'Update Agent'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}


          </div>
        </div>
      </AdminLayout>

      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onClose={() => setNotification({ type: null, message: '' })}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && agentToDelete && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingAgent) {
              setShowDeleteModal(false);
              setAgentToDelete(null);
            }
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-900/50 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Delete Agent</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Are you sure you want to delete agent <span className="font-semibold text-slate-900 dark:text-white">{agentToDelete.name}</span>?
                </p>
                {agentToDelete.email && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Email: {agentToDelete.email}
                  </p>
                )}
                <p className="text-xs text-red-600 dark:text-red-400 mt-3 font-medium">
                  Note: The agent cannot be deleted if they have assigned tickets.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setAgentToDelete(null);
                }}
                disabled={deletingAgent}
                className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAgent}
                disabled={deletingAgent}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAgent ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export const getServerSideProps = withAuth();
