import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AgentLayout from '../../components/agent/universal/AgentLayout';
import PageHead from '../../components/admin/PageHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { 
  Ticket as TicketIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  TrendingUp,
  TrendingDown,
  BookOpen,
  User as UserIcon,
  ArrowUpRight,
  AlertCircle,
  Activity
} from 'lucide-react';
import { useAgentAuth } from '../../contexts/AgentAuthContext';
import { agentFetch } from '../../lib/utils/agent-fetch';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AgentDashboard() {
  const { user } = useAgentAuth();
  const isInitialLoad = useRef(true);
  const [dashboardData, setDashboardData] = useState({
    metrics: {
      assignedTickets: 0,
      openTickets: 0,
      pendingTickets: 0,
      resolvedToday: 0,
      avgResponseTime: 0,
      avgResolutionTime: 0
    },
    urgentTickets: [],
    recentActivity: [],
    chartData: []
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIST = (date) => {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    }).format(d);
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds for live feel
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Only show loading skeleton on initial load
      if (isInitialLoad.current) {
        setLoading(true);
      }
      
      const response = await agentFetch('/api/agent/dashboard');
      if (response.ok) {
        const data = await response.json();
        
        setDashboardData({
          metrics: {
            ...dashboardData.metrics,
            ...(data.stats || {})
          },
          urgentTickets: data.urgentTickets || [],
          recentActivity: data.recentActivity || [],
          chartData: data.chartData || []
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
  };

  const metricCards = [
    {
      title: 'Assigned Tickets',
      value: dashboardData.metrics.assignedTickets,
      description: 'Total assigned to you',
      icon: TicketIcon,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/30',
      borderColor: 'border-violet-200 dark:border-violet-800/50',
      trend: '+12%',
      trendUp: true,
      href: '/agent/tickets'
    },
    {
      title: 'Open Tickets',
      value: dashboardData.metrics.openTickets,
      description: 'Need attention now',
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30',
      borderColor: 'border-orange-200 dark:border-orange-800/50',
      trend: '+5',
      trendUp: false,
      href: '/agent/tickets?status=open'
    },
    {
      title: 'Resolved Today',
      value: dashboardData.metrics.resolvedToday,
      description: 'Tickets closed today',
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800/50',
      trend: '+18%',
      trendUp: true,
      href: '/agent/tickets?status=resolved'
    },
    {
      title: 'Avg Response',
      value: `${dashboardData.metrics.avgResponseTime}m`,
      description: '5m better than avg',
      icon: Zap,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800/50',
      trend: '-5m',
      trendUp: true,
      href: '/agent/tickets'
    }
  ];

  const COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'];

  if (loading) {
    return (
      <>
        <PageHead title="Dashboard - Agent Panel" description="Agent Dashboard" />
        
        <AgentLayout currentPage="Dashboard">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="space-y-6 p-6">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 p-6 shadow-2xl dark:from-violet-800 dark:via-violet-900 dark:to-purple-950">
                <div className="animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-white/20"></div>
                    <div className="space-y-2">
                      <div className="h-6 bg-white/20 rounded w-48"></div>
                      <div className="h-4 bg-white/20 rounded w-32"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, index) => (
                  <Card key={index} className="animate-pulse dark:bg-slate-800/80 dark:border-slate-700">
                    <CardHeader className="space-y-0 pb-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </AgentLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title="Dashboard - Agent Panel" description="Agent Dashboard" />
      
      <AgentLayout currentPage="Dashboard">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="space-y-6 p-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 p-6 text-white shadow-2xl dark:from-violet-800 dark:via-violet-900 dark:to-purple-950">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-white/30">
                      <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-2xl font-bold">
                        Welcome back, {user?.name || 'Agent'}!
                      </h1>
                      <p className="text-violet-100 text-sm mt-1">
                        {formatIST(now)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-4 py-2">
                    <span className="relative flex h-2 w-2 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                  </Badge>
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {metricCards.map((metric, index) => (
                <Link key={index} href={metric.href}>
                  <Card className={`group cursor-pointer overflow-hidden border-2 ${metric.borderColor} ${metric.bgColor} transition-all duration-300 hover:shadow-xl hover:scale-105`}>
                    <CardHeader className="space-y-0 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {metric.title}
                        </CardTitle>
                        <div className={`rounded-xl p-2.5 ${metric.color} bg-white/80 dark:bg-slate-800/80 shadow-sm`}>
                          <metric.icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          {metric.value}
                        </div>
                        <Badge variant="outline" className={`${metric.trendUp ? 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-800' : 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800'}`}>
                          {metric.trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {metric.trend}
                        </Badge>
                      </div>
                      <CardDescription className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {metric.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-0 shadow-2xl dark:bg-slate-800/80 dark:border-slate-700">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                        <TrendingUp className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                          Ticket Activity (This Week)
                        </CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">
                          Your ticket resolution trends
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dashboardData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" className="dark:stroke-slate-700" />
                        <XAxis dataKey="day" stroke="#64748b" className="dark:stroke-slate-400" />
                        <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgb(30 41 59)', 
                            border: '1px solid rgb(51 65 85)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            color: 'rgb(226 232 240)'
                          }}
                          cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                        />
                        <Bar dataKey="resolved" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="opened" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Resolved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Opened</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-2xl dark:bg-slate-800/80 dark:border-slate-700">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            Priority Inbox
                          </CardTitle>
                          <CardDescription className="text-slate-600 dark:text-slate-400">
                            Tickets that need your attention now
                          </CardDescription>
                        </div>
                      </div>
                      <Link href="/agent/tickets?priority=high">
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {dashboardData.urgentTickets.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 dark:text-green-400 mb-3" />
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                          No urgent tickets! 🎉
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          You're all caught up
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {dashboardData.urgentTickets.map((ticket) => {
                          const timeDiff = Date.now() - new Date(ticket.createdAt).getTime();
                          const minutesAgo = Math.floor(timeDiff / 60000);
                          const hoursAgo = Math.floor(minutesAgo / 60);
                          const daysAgo = Math.floor(hoursAgo / 24);
                          
                          const timeStr = minutesAgo < 60 ? `${minutesAgo}m ago` : 
                                         hoursAgo < 24 ? `${hoursAgo}h ago` : 
                                         `${daysAgo}d ago`;
                          
                          const priorityLabel = ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1);
                          const priorityBadgeClass = ticket.priority === 'urgent' 
                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
                          
                          return (
                            <Link
                              key={ticket.id}
                              href={`/agent/tickets/${ticket.ticketNumber}`}
                              className="block p-4 hover:bg-violet-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-mono font-semibold text-violet-600 dark:text-violet-400">
                                      #{ticket.ticketNumber}
                                    </span>
                                    <Badge className={priorityBadgeClass}>
                                      {priorityLabel}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {ticket.subject || 'No subject'}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Customer: {ticket.customerName} • Created: {timeStr}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                  <div className="text-right">
                                    <div className={`text-xs font-medium ${ticket.slaTimeLeft.hours < 3 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                      {ticket.slaTimeLeft.hours}h left
                                    </div>
                                    <Progress 
                                      value={ticket.slaTimeLeft.percentage} 
                                      className="h-1 w-20 mt-1" 
                                    />
                                  </div>
                                  <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-0 shadow-2xl dark:bg-slate-800/80 dark:border-slate-700">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                        <Activity className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                          Live Activity
                        </CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">
                          Recent updates
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {dashboardData.recentActivity.length === 0 ? (
                      <div className="p-8 text-center">
                        <Activity className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                          No recent activity
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Your activity will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.recentActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              activity.urgent
                                ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30'
                                : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                activity.urgent ? 'bg-red-500 dark:bg-red-400' : 'bg-green-500 dark:bg-green-400'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900 dark:text-white">
                                  {activity.message}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {activity.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-2xl dark:bg-slate-800/80 dark:border-slate-700">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid gap-3">
                      <Link href="/agent/tickets">
                        <Button variant="default" className="w-full justify-start h-auto py-3 px-4 dark:bg-violet-600 dark:hover:bg-violet-700">
                          <div className="flex items-center gap-3 w-full">
                            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                              <TicketIcon className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white">View Tickets</p>
                              <p className="text-xs opacity-80 text-slate-700 dark:text-slate-300">Manage assignments</p>
                            </div>
                          </div>
                        </Button>
                      </Link>
                      <Link href="/agent/knowledge-base">
                        <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 dark:border-slate-700 dark:hover:bg-slate-800">
                          <div className="flex items-center gap-3 w-full">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white">Knowledge Base</p>
                              <p className="text-xs opacity-80 text-slate-700 dark:text-slate-400">Search articles</p>
                            </div>
                          </div>
                        </Button>
                      </Link>
                      <Link href="/agent/profile">
                        <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 dark:border-slate-700 dark:hover:bg-slate-800">
                          <div className="flex items-center gap-3 w-full">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                              <UserIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white">My Profile</p>
                              <p className="text-xs opacity-80 text-slate-700 dark:text-slate-400">Update settings</p>
                            </div>
                          </div>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </AgentLayout>
    </>
  );
}

// Force dynamic rendering
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
