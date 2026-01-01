import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import AgentPresenceIndicator from '../../../components/admin/AgentPresenceIndicator';
import AgentPresenceSelector from '../../../components/admin/AgentPresenceSelector';
import useSocket from '../../../src/hooks/useSocket';
import { withAuth } from '../../../lib/withAuth';
import {
  ArrowLeft,
  Mail,
  User,
  Ticket as TicketIcon,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  Calendar,
  MessageSquare,
  BarChart3,
  Activity,
  Users,
  Zap,
  Award,
  Target,
  PieChart,
  LineChart,
  FileText,
  XCircle,
  AlertCircle,
  Timer,
  Percent,
  Building2,
  Shield,
  Briefcase
} from 'lucide-react';

export default function AgentProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [agent, setAgent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'analytics'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [worklogSummary, setWorklogSummary] = useState(null);
  const [loadingWorklogs, setLoadingWorklogs] = useState(false);
  const socketRef = useSocket({ token: 'admin-demo' });

  useEffect(() => {
    if (id) {
      fetchAgentDetails();
    }
  }, [id]);

  // Listen for real-time presence updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !agent) return;

    const handlePresenceUpdate = (data) => {
      if (agent && (agent.id === data.agentId || agent.slug === data.agentSlug)) {
        setAgent(prev => ({
          ...prev,
          presenceStatus: data.presenceStatus,
          status: data.presenceStatus,
          lastSeenAt: data.lastSeenAt
        }));
      }
    };

    socket.on('agent:presence:update', handlePresenceUpdate);

    return () => {
      socket.off('agent:presence:update', handlePresenceUpdate);
    };
  }, [socketRef, agent]);

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      console.log('🔍 Frontend: Fetching agent with identifier:', id);
      // Fetch agent by slug (or id for backward compatibility)
      const response = await fetch(`/api/admin/agents/${id}`);
      const data = await response.json();

      console.log('📥 Frontend: API response:', { ok: response.ok, hasAgent: !!data.agent, error: data.message, availableAgents: data.availableAgents });

      if (response.ok && data.agent) {
        setAgent(data.agent);
        fetchAgentTickets(data.agent.id);
        fetchAgentAnalytics(data.agent.id);
        fetchAgentWorklogs(data.agent.id);
      } else {
        console.error('❌ Frontend: Agent not found. Response:', data);
        setAgent(null);
      }
    } catch (error) {
      console.error('Error fetching agent details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentTickets = async (agentId) => {
    try {
      // Use agentId parameter for proper filtering, showAll=true to include resolved/closed
      const response = await fetch(`/api/admin/tickets?agentId=${agentId}&limit=100&showAll=true`);
      const data = await response.json();


      if (response.ok) {
        console.log('📊 Tickets fetched:', data.tickets?.length || 0, 'tickets');
        setTickets(data.tickets || []);
      } else {
        console.error('❌ Failed to fetch tickets:', data);
      }
    } catch (error) {
      console.error('Error fetching agent tickets:', error);
    }
  };

  const fetchAgentAnalytics = async (agentId) => {
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/analytics`);
      const data = await response.json();

      if (response.ok) {
        console.log('📈 Analytics data:', data);
        setAnalyticsData(data);
      } else {
        console.error('❌ Analytics fetch failed:', data);
      }
    } catch (error) {
      console.error('Error fetching agent analytics:', error);
    }
  };

  const fetchAgentWorklogs = async (agentId) => {
    try {
      setLoadingWorklogs(true);
      // Get worklogs for last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await fetch(
        `/api/admin/worklogs?agentId=${agentId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();

      if (response.ok) {
        const worklogs = data.worklogs || [];

        // Calculate summary
        const totalSeconds = worklogs.reduce((sum, w) => {
          if (w.durationSeconds) {
            return sum + w.durationSeconds;
          } else if (w.endedAt) {
            const duration = Math.floor((new Date(w.endedAt) - new Date(w.startedAt)) / 1000);
            return sum + duration;
          }
          return sum;
        }, 0);

        const totalHours = Math.floor(totalSeconds / 3600);
        const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

        // Handle both new schema (ticketNumber) and legacy (conversationId) for backward compatibility
        const autoWorklogs = worklogs.filter(w => w.isSystemAuto === true || w.source === 'auto').length;
        const manualWorklogs = worklogs.filter(w => w.isSystemAuto === false || w.source === 'manual').length;

        // Calculate average per ticket - use ticketNumber or fallback to conversationId
        const uniqueTickets = new Set(worklogs.map(w => w.ticketNumber || w.conversationId || (w.ticket?.ticketNumber) || (w.Conversation?.ticketNumber))).size;
        const avgPerTicket = uniqueTickets > 0 ? Math.floor(totalSeconds / uniqueTickets) : 0;
        const avgHours = Math.floor(avgPerTicket / 3600);
        const avgMinutes = Math.floor((avgPerTicket % 3600) / 60);

        setWorklogSummary({
          totalWorklogs: worklogs.length,
          totalHours,
          totalMinutes,
          totalSeconds,
          autoWorklogs,
          manualWorklogs,
          uniqueTickets,
          avgHours,
          avgMinutes,
          avgSeconds: avgPerTicket,
          worklogs: worklogs.slice(0, 10) // Last 10 worklogs
        });
      }
    } catch (error) {
      console.error('Error fetching agent worklogs:', error);
    } finally {
      setLoadingWorklogs(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
      pending: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      resolved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
      closed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
    };
    return colors[status] || colors.open;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
      medium: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
      low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
    };
    return colors[priority] || colors.low;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTicketTitle = (ticket) => {
    // Format: "Product Model - Subject" or just "Subject" if no product
    if (ticket.productModel && ticket.subject) {
      return `${ticket.productModel} - ${ticket.subject}`;
    } else if (ticket.productModel) {
      return ticket.productModel;
    } else if (ticket.subject) {
      return ticket.subject;
    }
    return `Ticket #${ticket.id.substring(0, 8)}`;
  };

  // Calculate ticket statistics
  const ticketStats = tickets.reduce((acc, ticket) => {
    acc.total++;
    if (ticket.status === 'open') acc.open++;
    else if (ticket.status === 'pending') acc.pending++;
    else if (ticket.status === 'resolved') acc.resolved++;
    else if (ticket.status === 'closed') acc.closed++;

    // Only count high priority tickets that are NOT resolved or closed
    if (ticket.priority === 'high' && ticket.status !== 'resolved' && ticket.status !== 'closed') {
      acc.high++;
    }
    if (ticket.priority === 'medium') acc.medium++;
    else if (ticket.priority === 'low') acc.low++;

    return acc;
  }, { total: 0, open: 0, pending: 0, resolved: 0, closed: 0, high: 0, medium: 0, low: 0 });

  // Use performance data from agent API instead of recalculating
  const resolvedCount = agent?.performance?.ticketsResolved || ticketStats.resolved + ticketStats.closed;
  const resolutionRate = agent?.ticketCount > 0
    ? Math.round((resolvedCount / agent.ticketCount) * 100)
    : 0;

  // Calculate recent activity (last 7 days) - tickets with recent updates
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTickets = tickets.filter(t => new Date(t.updatedAt || t.createdAt) > sevenDaysAgo).length;

  // Use real performance trend data from analytics
  const performanceTrendData = analyticsData?.weeklyPerformance || [0, 0, 0, 0];

  // Use real daily ticket data from analytics
  const dailyTicketData = analyticsData?.dailyTickets || [];

  if (loading) {
    return (
      <AdminLayout currentPage="Agents">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          <div className="space-y-6">
            <div className="animate-pulse space-y-6">
              <div className="h-10 bg-slate-300 dark:bg-slate-700 rounded w-32"></div>
              <div className="h-64 bg-slate-300 dark:bg-slate-700 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!agent) {
    return (
      <AdminLayout currentPage="Agents">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          <div className="space-y-6">
            <Link href="/admin/agents">
              <Button variant="outline" className="mb-4 border-slate-300 dark:border-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
            </Link>
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl">
              <CardContent className="p-12 text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Agent Not Found</h2>
                <p className="text-slate-600 dark:text-slate-400">The agent you're looking for doesn't exist.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{agent.name} - Agent Profile - WZATCO Support</title>
        <meta name="description" content={`Agent profile for ${agent.name}`} />
      </Head>

      <AdminLayout currentPage="Agents">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          <div className="space-y-6">
            {/* Back Button */}
            <Link href="/admin/agents">
              <Button variant="outline" className="border-slate-300 dark:border-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
            </Link>

            {/* Agent Header Card */}
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <Avatar className="w-24 h-24 ring-4 ring-white/20 shadow-xl">
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold backdrop-blur-sm">
                      {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-white">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-3xl font-bold">{agent.name}</h1>
                      {agent.isOnline ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse shadow-lg shadow-green-300/50"></div>
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                            Online
                          </Badge>
                        </div>
                      ) : (
                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                          Offline
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-white/90">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{agent.email || 'No email'}</span>
                      </div>
                      {(agent.userId || agent.slug) && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Agent ID: {agent.userId || agent.slug}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Last Active: {formatDate(agent.lastActive)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Total Tickets</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{agent.ticketCount || 0}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All assigned tickets</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <TicketIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Resolved</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{resolvedCount}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{resolutionRate}% resolution rate</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Response Time</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{agent.performance?.avgResponseTime || 0}m</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average response</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                      <Timer className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Rating</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{agent.performance?.customerRating || '0.0'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customer satisfaction</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg">
                      <Star className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Open Tickets</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{ticketStats.open}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Resolution Rate</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{resolutionRate}%</p>
                    </div>
                    <Percent className="w-8 h-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Recent Activity</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{recentTickets}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Last 7 days</p>
                    </div>
                    <Activity className="w-8 h-8 text-violet-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">High Priority</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{ticketStats.high}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Section */}
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 p-0">
                <div className="flex border-b border-white/20">
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className={`flex-1 px-6 py-4 text-left font-semibold transition-all duration-200 ${activeTab === 'tickets'
                      ? 'bg-white/20 text-white border-b-2 border-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <TicketIcon className="w-5 h-5" />
                      <span>Tickets & Details</span>
                      <Badge className="ml-auto bg-white/20 text-white border-white/30 text-xs">
                        {tickets.length}
                      </Badge>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 px-6 py-4 text-left font-semibold transition-all duration-200 ${activeTab === 'analytics'
                      ? 'bg-white/20 text-white border-b-2 border-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Reports & Analytics</span>
                    </div>
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* Tickets Tab */}
                {activeTab === 'tickets' && (
                  <div className="p-6 space-y-6">
                    {/* Ticket Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Open</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{ticketStats.open}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Pending</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ticketStats.pending}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Resolved</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Closed</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{ticketStats.closed}</p>
                      </div>
                    </div>

                    {/* Priority Breakdown */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">High</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{ticketStats.high}</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Medium</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{ticketStats.medium}</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Low</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{ticketStats.low}</p>
                      </div>
                    </div>

                    {/* Tickets List */}
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Assigned Tickets</h3>
                      {tickets.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <TicketIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No tickets assigned</h3>
                          <p className="text-slate-600 dark:text-slate-400">This agent doesn't have any tickets assigned yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {tickets.map((ticket, index) => (
                            <Link key={ticket.id} href={`/admin/tickets/${ticket.ticketNumber || ticket.id}`}>
                              <div className="p-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                      {formatTicketTitle(ticket)}
                                    </h3>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <Badge className={`${getStatusColor(ticket.status)} border-0 text-xs font-semibold px-3 py-1.5 rounded-full`}>
                                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                                      </Badge>
                                      {ticket.priority && (
                                        <Badge className={`${getPriorityColor(ticket.priority)} border-0 text-xs font-semibold px-3 py-1.5 rounded-full`}>
                                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                        </Badge>
                                      )}
                                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(ticket.updatedAt || ticket.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Agent Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          Agent ID
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{agent.userId || agent.id}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          Email
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{agent.email || 'N/A'}</p>
                      </div>
                      {agent.department && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            Department
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{agent.department.name || 'N/A'}</p>
                        </div>
                      )}
                      {agent.role && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            Role
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{agent.role.title || 'N/A'}</p>
                          {agent.role.displayAs && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Display: {agent.role.displayAs}</p>
                          )}
                        </div>
                      )}
                      {agent.maxLoad && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            Max Load
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{agent.maxLoad} tickets</p>
                        </div>
                      )}
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Presence Status</p>
                        <div className="flex items-center gap-2">
                          <AgentPresenceIndicator
                            presenceStatus={agent.isOnline ? 'online' : (agent.presenceStatus || agent.status || 'offline')}
                            showLabel={false}
                            size="default"
                          />
                          <AgentPresenceSelector
                            agentId={agent.id}
                            currentStatus={agent.presenceStatus || agent.status || 'offline'}
                            onStatusChange={(newStatus) => {
                              setAgent(prev => ({
                                ...prev,
                                presenceStatus: newStatus,
                                status: newStatus
                              }));
                            }}
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Last Active
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(agent.lastActive)}</p>
                      </div>
                    </div>

                    {/* Skills Section */}
                    {agent.skills && Array.isArray(agent.skills) && agent.skills.length > 0 && (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Briefcase className="w-3 h-3" />
                            Skills
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {agent.skills.map((skill, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 via-white to-violet-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                    {/* Performance Overview - Enhanced */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Performance Overview</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Key metrics and insights</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-green-50 dark:from-emerald-900/30 dark:via-emerald-900/20 dark:to-green-900/30 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                          <CardContent className="p-6 relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Resolution Rate</p>
                                <div className="p-2.5 bg-emerald-500/20 dark:bg-emerald-500/30 rounded-lg group-hover:scale-110 transition-transform">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                              </div>
                              <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">{resolutionRate}%</p>
                              <div className="mt-4 bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-700 shadow-lg shadow-emerald-500/50"
                                  style={{ width: `${resolutionRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-violet-50 via-purple-50/50 to-indigo-50 dark:from-violet-900/30 dark:via-purple-900/20 dark:to-indigo-900/30 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                          <CardContent className="p-6 relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 dark:bg-violet-500/20 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Response Time</p>
                                <div className="p-2.5 bg-violet-500/20 dark:bg-violet-500/30 rounded-lg group-hover:scale-110 transition-transform">
                                  <Timer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                              </div>
                              <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">{agent.performance?.avgResponseTime || 0}m</p>
                              <div className="flex items-center gap-2">
                                <Badge className={`${agent.performance?.avgResponseTime < 30
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                                  : agent.performance?.avgResponseTime < 60
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                                  } border font-semibold`}>
                                  {agent.performance?.avgResponseTime < 30 ? 'Excellent' : agent.performance?.avgResponseTime < 60 ? 'Good' : 'Needs Improvement'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-50 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-orange-900/30 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                          <CardContent className="p-6 relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/20 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Customer Rating</p>
                                <div className="p-2.5 bg-amber-500/20 dark:bg-amber-500/30 rounded-lg group-hover:scale-110 transition-transform">
                                  <Star className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                                </div>
                              </div>
                              <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">{agent.performance?.customerRating || '0.0'}</p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-5 h-5 transition-all ${star <= Math.round(parseFloat(agent.performance?.customerRating || 0))
                                      ? 'text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                      }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Worklog Summary Section */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                          <Timer className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Time Tracking Summary</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Last 30 days worklog statistics</p>
                        </div>
                      </div>

                      {loadingWorklogs ? (
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
                          <CardContent className="p-8">
                            <div className="flex items-center justify-center py-12">
                              <div className="w-8 h-8 border-2 border-violet-600 dark:border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : worklogSummary ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-violet-50 via-violet-50/50 to-purple-50 dark:from-violet-900/30 dark:via-violet-900/20 dark:to-purple-900/30 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Total Time</p>
                                <div className="p-2.5 bg-violet-500/20 dark:bg-violet-500/30 rounded-lg">
                                  <Timer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                              </div>
                              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                {worklogSummary.totalHours}h {worklogSummary.totalMinutes}m
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                {worklogSummary.totalWorklogs} worklog{worklogSummary.totalWorklogs !== 1 ? 's' : ''}
                              </p>
                            </CardContent>
                          </Card>

                          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-blue-50 via-blue-50/50 to-indigo-50 dark:from-blue-900/30 dark:via-blue-900/20 dark:to-indigo-900/30 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Avg Per Ticket</p>
                                <div className="p-2.5 bg-blue-500/20 dark:bg-blue-500/30 rounded-lg">
                                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                              </div>
                              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                {worklogSummary.avgHours > 0 ? `${worklogSummary.avgHours}h ` : ''}{worklogSummary.avgMinutes}m
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                {worklogSummary.uniqueTickets} ticket{worklogSummary.uniqueTickets !== 1 ? 's' : ''}
                              </p>
                            </CardContent>
                          </Card>

                          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-green-50 dark:from-emerald-900/30 dark:via-emerald-900/20 dark:to-green-900/30 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Auto Tracked</p>
                                <div className="p-2.5 bg-emerald-500/20 dark:bg-emerald-500/30 rounded-lg">
                                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                              </div>
                              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                {worklogSummary.autoWorklogs}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Automatic entries
                              </p>
                            </CardContent>
                          </Card>

                          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-amber-50 via-amber-50/50 to-orange-50 dark:from-amber-900/30 dark:via-amber-900/20 dark:to-orange-900/30 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Manual Entries</p>
                                <div className="p-2.5 bg-amber-500/20 dark:bg-amber-500/30 rounded-lg">
                                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                              </div>
                              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                {worklogSummary.manualWorklogs}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Manual entries
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
                          <CardContent className="p-8">
                            <div className="flex flex-col items-center justify-center py-12">
                              <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                                <Timer className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                              </div>
                              <p className="text-base font-semibold text-slate-600 dark:text-slate-400">No worklogs found</p>
                              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Time tracking data will appear here</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Charts Section - Beautiful Design */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics & Insights</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Visual data representation</p>
                        </div>
                      </div>

                      {/* First Row of Charts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Ticket Status Distribution - Enhanced Pie Chart */}
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                          <div className="bg-gradient-to-r from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 px-6 py-4">
                            <div className="flex items-center gap-3">
                              <PieChart className="w-5 h-5 text-white" />
                              <h4 className="text-lg font-bold text-white">Ticket Status Distribution</h4>
                            </div>
                          </div>
                          <CardContent className="p-8">
                            {tickets.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-16">
                                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                                  <PieChart className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="text-base font-semibold text-slate-600 dark:text-slate-400">No tickets assigned</p>
                                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Data will appear when tickets are assigned</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-8">
                                {/* Enhanced SVG Pie Chart */}
                                <div className="relative">
                                  <svg width="220" height="220" viewBox="0 0 200 200" className="transform -rotate-90 drop-shadow-lg">
                                    <circle
                                      cx="100"
                                      cy="100"
                                      r="85"
                                      fill="none"
                                      stroke="rgb(226 232 240)"
                                      strokeWidth="30"
                                      className="dark:stroke-slate-700"
                                    />
                                    {(() => {
                                      const total = tickets.length;
                                      if (total === 0) return null;
                                      const openPercent = (ticketStats.open / total) * 100;
                                      const pendingPercent = (ticketStats.pending / total) * 100;
                                      // Use resolvedCount from agent.performance which is the authoritative source
                                      const resolvedPercent = (resolvedCount / total) * 100;
                                      const closedPercent = 0; // Already included in resolvedCount

                                      let currentPercent = 0;
                                      const getPath = (percent) => {
                                        const startAngle = (currentPercent / 100) * 360;
                                        const endAngle = ((currentPercent + percent) / 100) * 360;
                                        currentPercent += percent;

                                        const startAngleRad = (startAngle * Math.PI) / 180;
                                        const endAngleRad = (endAngle * Math.PI) / 180;

                                        const x1 = 100 + 85 * Math.cos(startAngleRad);
                                        const y1 = 100 + 85 * Math.sin(startAngleRad);
                                        const x2 = 100 + 85 * Math.cos(endAngleRad);
                                        const y2 = 100 + 85 * Math.sin(endAngleRad);

                                        const largeArcFlag = percent > 50 ? 1 : 0;
                                        return `M 100 100 L ${x1} ${y1} A 85 85 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                                      };

                                      return (
                                        <>
                                          {openPercent > 0 && (
                                            <path
                                              d={getPath(openPercent)}
                                              fill="#eab308"
                                              className="transition-all duration-700 hover:opacity-80"
                                              stroke="#fef3c7"
                                              strokeWidth="2"
                                            />
                                          )}
                                          {pendingPercent > 0 && (
                                            <path
                                              d={getPath(pendingPercent)}
                                              fill="#3b82f6"
                                              className="transition-all duration-700 hover:opacity-80"
                                              stroke="#dbeafe"
                                              strokeWidth="2"
                                            />
                                          )}
                                          {resolvedPercent > 0 && (
                                            <path
                                              d={getPath(resolvedPercent)}
                                              fill="#10b981"
                                              className="transition-all duration-700 hover:opacity-80"
                                              stroke="#d1fae5"
                                              strokeWidth="2"
                                            />
                                          )}
                                          {closedPercent > 0 && (
                                            <path
                                              d={getPath(closedPercent)}
                                              fill="#22c55e"
                                              className="transition-all duration-700 hover:opacity-80"
                                              stroke="#dcfce7"
                                              strokeWidth="2"
                                            />
                                          )}
                                        </>
                                      );
                                    })()}
                                  </svg>
                                  {/* Center text */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{tickets.length}</p>
                                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Enhanced Legend */}
                                <div className="w-full space-y-3">
                                  {[
                                    { label: 'Open', value: ticketStats.open, colorClass: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300' },
                                    { label: 'Pending', value: ticketStats.pending, colorClass: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
                                    { label: 'Resolved', value: resolvedCount, colorClass: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' }
                                  ].map((item, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 ${item.bg} ${item.border} border-2 rounded-xl hover:shadow-md transition-all duration-200`}>
                                      <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full ${item.colorClass} shadow-sm`}></div>
                                        <span className={`text-sm font-bold ${item.text}`}>{item.label}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className={`text-2xl font-extrabold ${item.text}`}>{item.value}</span>
                                        <span className={`text-xs font-semibold ${item.text} opacity-70`}>
                                          ({tickets.length > 0 ? Math.round((item.value / tickets.length) * 100) : 0}%)
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Ticket Trends - Enhanced Bar Chart */}
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                          <div className="bg-gradient-to-r from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 px-6 py-4">
                            <div className="flex items-center gap-3">
                              <BarChart3 className="w-5 h-5 text-white" />
                              <h4 className="text-lg font-bold text-white">Ticket Trends (Last 7 Days)</h4>
                            </div>
                          </div>
                          <CardContent className="p-8">
                            <div className="h-80 flex flex-col justify-end gap-4">
                              {(() => {
                                const dayData = dailyTicketData.length > 0 ? dailyTicketData :
                                  (() => {
                                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                    const today = new Date();
                                    return days.map((day, index) => {
                                      const date = new Date(today);
                                      date.setDate(date.getDate() - (6 - index));
                                      const dayTickets = tickets.filter(t => {
                                        const ticketDate = new Date(t.createdAt);
                                        return ticketDate.toDateString() === date.toDateString();
                                      }).length;
                                      return { day, count: dayTickets };
                                    });
                                  })();

                                const maxHeight = Math.max(...dayData.map(d => d.count), 1);

                                return (
                                  <div className="flex items-end justify-between gap-2 h-full">
                                    {dayData.map((data, index) => {
                                      const height = maxHeight > 0 ? (data.count / maxHeight) * 85 : 0;
                                      return (
                                        <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                                          <div className="w-full flex items-end justify-center relative" style={{ height: `${height}%`, maxHeight: '240px' }}>
                                            <div
                                              className="w-full h-full bg-gradient-to-t from-violet-500 via-purple-500 to-purple-600 rounded-t-xl transition-all duration-500 hover:from-violet-600 hover:via-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl group-hover:scale-105"
                                              title={`${data.count} tickets on ${data.day}`}
                                              style={{ minHeight: data.count > 0 ? '12px' : '0' }}
                                            ></div>
                                            {data.count > 0 && (
                                              <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-10">
                                                {data.count} {data.count === 1 ? 'ticket' : 'tickets'}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-center space-y-0.5 mt-2">
                                            <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">{data.day}</span>
                                            <span className="block text-lg font-extrabold text-violet-600 dark:text-violet-400">{data.count}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Second Row of Charts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weekly Resolved Tickets - Bar Chart */}
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                          <div className="bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700 px-6 py-4">
                            <div className="flex items-center gap-3">
                              <BarChart3 className="w-5 h-5 text-white" />
                              <h4 className="text-lg font-bold text-white">Weekly Resolved Tickets (Last 4 Weeks)</h4>
                            </div>
                          </div>
                          <CardContent className="p-8">
                            <div className="h-80 flex flex-col justify-end gap-4">
                              {(!analyticsData?.weeklyResolved || analyticsData.weeklyResolved.length === 0) ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                                    <BarChart3 className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                                  </div>
                                  <p className="text-base font-semibold text-slate-600 dark:text-slate-400">No resolved tickets data</p>
                                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Data will appear as tickets are resolved</p>
                                </div>
                              ) : (
                                <>
                                  {(() => {
                                    const weekData = analyticsData.weeklyResolved;
                                    const maxResolved = Math.max(...weekData.map(w => w.resolved), 1);

                                    return (
                                      <div className="flex items-end justify-between gap-2 h-full">
                                        {weekData.map((week, index) => {
                                          const height = maxResolved > 0 ? (week.resolved / maxResolved) * 85 : 0;
                                          return (
                                            <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                                              <div className="w-full flex items-end justify-center relative" style={{ height: `${height}%`, maxHeight: '240px' }}>
                                                <div
                                                  className="w-full h-full bg-gradient-to-t from-emerald-500 via-green-500 to-green-600 rounded-t-xl transition-all duration-500 hover:from-emerald-600 hover:via-green-600 hover:to-green-700 shadow-lg hover:shadow-xl group-hover:scale-105"
                                                  title={`${week.resolved} tickets resolved in ${week.week}`}
                                                  style={{ minHeight: week.resolved > 0 ? '12px' : '0' }}
                                                ></div>
                                                {week.resolved > 0 && (
                                                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-10">
                                                    {week.resolved} {week.resolved === 1 ? 'ticket' : 'tickets'}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="text-center space-y-0.5 mt-2">
                                                <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">{week.week}</span>
                                                <span className="block text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{week.resolved}</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm"></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Resolved Tickets</span>
                              </div>
                            </div>

                          </CardContent>
                        </Card>

                        {/* Priority Distribution - Enhanced */}
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                          <div className="bg-gradient-to-r from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Target className="w-5 h-5 text-white" />
                              <h4 className="text-lg font-bold text-white">Priority Distribution</h4>
                            </div>
                          </div>
                          <CardContent className="p-8">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-900/20 rounded-2xl border-2 border-red-200 dark:border-red-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="mb-3 flex justify-center">
                                  <div className="p-3 bg-red-500/20 dark:bg-red-500/30 rounded-xl">
                                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                  </div>
                                </div>
                                <p className="text-4xl font-extrabold text-red-600 dark:text-red-400 mb-2">{ticketStats.high}</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">High</p>
                              </div>
                              <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-900/20 rounded-2xl border-2 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="mb-3 flex justify-center">
                                  <div className="p-3 bg-orange-500/20 dark:bg-orange-500/30 rounded-xl">
                                    <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                  </div>
                                </div>
                                <p className="text-4xl font-extrabold text-orange-600 dark:text-orange-400 mb-2">{ticketStats.medium}</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Medium</p>
                              </div>
                              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="mb-3 flex justify-center">
                                  <div className="p-3 bg-green-500/20 dark:bg-green-500/30 rounded-xl">
                                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                  </div>
                                </div>
                                <p className="text-4xl font-extrabold text-green-600 dark:text-green-400 mb-2">{ticketStats.low}</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Low</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Performance Metrics - Enhanced */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                          <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Performance Metrics</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Detailed performance indicators</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-900/20 dark:via-slate-800 dark:to-emerald-900/20 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                          <CardContent className="p-8 relative">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full -translate-y-20 translate-x-20"></div>
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-6">
                                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Tickets Resolved</p>
                                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                                  <Award className="w-6 h-6 text-white" />
                                </div>
                              </div>
                              <p className="text-5xl font-extrabold text-slate-900 dark:text-white mb-2">{agent.performance?.ticketsResolved || 0}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Total resolved tickets</p>
                              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  Resolution Rate: {resolutionRate}%
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-xl dark:bg-slate-800 bg-gradient-to-br from-violet-50 via-white to-purple-50/50 dark:from-violet-900/20 dark:via-slate-800 dark:to-purple-900/20 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                          <CardContent className="p-8 relative">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/10 dark:bg-violet-500/20 rounded-full -translate-y-20 translate-x-20"></div>
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-6">
                                <p className="text-base font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Recent Activity</p>
                                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                                  <Zap className="w-6 h-6 text-white" />
                                </div>
                              </div>
                              <p className="text-5xl font-extrabold text-slate-900 dark:text-white mb-2">{recentTickets}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Tickets in last 7 days</p>
                              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                                  {recentTickets > 0 ? 'Active performance period' : 'No recent activity'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Activity Summary - Enhanced */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Summary</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Comprehensive performance breakdown</p>
                        </div>
                      </div>
                      <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
                              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                                <TicketIcon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Total Assigned</p>
                                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{agent.ticketCount || 0}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total tickets assigned</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300">
                              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">Resolved</p>
                                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{agent.performance?.ticketsResolved || 0}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{resolutionRate}% resolution rate</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-900/20 rounded-2xl border-2 border-violet-200 dark:border-violet-800 hover:shadow-lg transition-all duration-300">
                              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                                <Timer className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-1">Response Time</p>
                                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{agent.performance?.avgResponseTime || 0}m</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average first response</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-900/20 rounded-2xl border-2 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all duration-300">
                              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                                <Star className="w-6 h-6 text-white fill-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">Rating</p>
                                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{agent.performance?.customerRating || '0.0'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customer satisfaction</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();
