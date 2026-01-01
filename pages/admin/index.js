import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/admin/universal/AdminLayout';
import PageHead from '../../components/admin/PageHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
  Ticket as TicketIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ExternalLink,
  User
} from 'lucide-react';
import { withAuth } from '../../lib/withAuth';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ModernDashboard() {
  const [dashboardData, setDashboardData] = useState({
    metrics: {
      totalTickets: 0,
      openTickets: 0,
      resolvedToday: 0,
      avgResponseTime: 0
    },
    volumeData: [],
    topIssues: [],
    criticalAlerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Fetch all data in parallel
      const [metricsRes, volumeRes, issuesRes, alertsRes] = await Promise.all([
        fetch('/api/admin/dashboard/metrics'),
        fetch('/api/admin/dashboard/ticket-volume'),
        fetch('/api/admin/dashboard/top-issues'),
        fetch('/api/admin/dashboard/critical-alerts')
      ]);

      const [metricsData, volumeData, issuesData, alertsData] = await Promise.all([
        metricsRes.json(),
        volumeRes.json(),
        issuesRes.json(),
        alertsRes.json()
      ]);

      setDashboardData({
        metrics: metricsData.metrics || {},
        volumeData: volumeData.volumeData || [],
        topIssues: issuesData.topIssues || [],
        criticalAlerts: alertsData.alerts || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Enable silent auto-refresh on socket events
  useAutoRefresh(fetchDashboardData);

  // Chart colors
  const COLORS = ['#7c3aed', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];
  const AREA_COLORS = {
    created: '#7c3aed',
    resolved: '#10b981',
    pending: '#f59e0b'
  };

  const sparklineMetrics = [
    {
      title: 'Total Tickets',
      value: dashboardData.metrics.totalTickets || 0,
      change: '+12%',
      changeType: 'positive',
      icon: TicketIcon,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      href: '/admin/tickets'
    },
    {
      title: 'Open Tickets',
      value: dashboardData.metrics.openTickets || 0,
      change: '+5',
      changeType: 'negative',
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      href: '/admin/tickets?status=open'
    },
    {
      title: 'Resolved Today',
      value: dashboardData.metrics.resolvedTickets || 0,
      change: '+18%',
      changeType: 'positive',
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      href: '/admin/tickets?status=resolved'
    },
    {
      title: 'Avg Response',
      value: `${dashboardData.metrics.avgResponseTime || 0}m`,
      change: '-5m',
      changeType: 'positive',
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      href: '/admin/reports'
    }
  ];

  if (loading) {
    return (
      <>
        <PageHead title="Dashboard" description="Admin Command Center" />
        <AdminLayout currentPage="Dashboard">
          <div className="space-y-4">
            {/* Loading Skeleton */}
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-96 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
              <div className="h-96 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title="Dashboard" description="Admin Command Center" />
      <AdminLayout currentPage="Dashboard">
        <div className="space-y-4">
            {/* Top Row: Compact Sparkline Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sparklineMetrics.map((metric, index) => (
                <Link key={index} href={metric.href}>
                  <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            {metric.title}
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">
                              {metric.value}
                            </span>
                            <span className={`text-xs font-semibold flex items-center gap-1 ${
                              metric.changeType === 'positive' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {metric.changeType === 'positive' ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {metric.change}
                            </span>
                          </div>
                        </div>
                        <div className={`${metric.bgColor} p-3 rounded-lg`}>
                          <metric.icon className={`w-5 h-5 ${metric.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Middle Row: 66/33 Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Ticket Volume Chart (66%) */}
              <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Ticket Volume (Last 7 Days)
                      </CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        Created, Resolved, and Pending trends
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Live
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={dashboardData.volumeData}>
                      <defs>
                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={AREA_COLORS.created} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={AREA_COLORS.created} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={AREA_COLORS.resolved} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={AREA_COLORS.resolved} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={AREA_COLORS.pending} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={AREA_COLORS.pending} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                      <XAxis 
                        dataKey="day" 
                        stroke="#64748b" 
                        className="dark:stroke-slate-400"
                        style={{ fontSize: '12px' }}
                        tick={{ fill: 'rgb(51 65 85)' }}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        className="dark:stroke-slate-400"
                        style={{ fontSize: '12px' }}
                        tick={{ fill: 'rgb(51 65 85)' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {payload[0].payload.day}
                                </p>
                                {payload.map((entry, index) => (
                                  <p key={index} className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                    <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          fontSize: '12px',
                          paddingTop: '10px',
                          color: 'rgb(51 65 85)'
                        }}
                        iconType="circle"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="created" 
                        stroke={AREA_COLORS.created} 
                        fillOpacity={1} 
                        fill="url(#colorCreated)"
                        strokeWidth={2}
                        name="Created"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="resolved" 
                        stroke={AREA_COLORS.resolved} 
                        fillOpacity={1} 
                        fill="url(#colorResolved)"
                        strokeWidth={2}
                        name="Resolved"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="pending" 
                        stroke={AREA_COLORS.pending} 
                        fillOpacity={1} 
                        fill="url(#colorPending)"
                        strokeWidth={2}
                        name="Pending"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Right: Top 5 Issues Donut Chart (33%) */}
              <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Top 5 Issues
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Most common ticket types
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {dashboardData.topIssues.length === 0 ? (
                    <div className="h-[320px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                      <div className="text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No data available</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={dashboardData.topIssues}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="count"
                          >
                            {dashboardData.topIssues.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {payload[0].name}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                      Count: {payload[0].value}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Legend */}
                      <div className="space-y-2 mt-4">
                        {dashboardData.topIssues.map((issue, index) => (
                          <div key={issue.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                {issue.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {issue.count}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                ({issue.percentage}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row: Critical Alerts Table */}
            <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Critical Alerts
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      High priority tickets requiring immediate attention
                    </CardDescription>
                  </div>
                  <Link href="/admin/tickets?priority=high">
                    <Button variant="outline" size="sm" className="gap-2">
                      View All
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {dashboardData.criticalAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 dark:text-green-400 mb-3" />
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      No critical alerts
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      All high priority tickets are resolved
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Ticket
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Assignee
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Age
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.criticalAlerts.map((alert, index) => (
                          <tr 
                            key={alert.id}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <code className="text-xs font-mono font-semibold text-violet-600 dark:text-violet-400">
                                #{alert.ticketNumber}
                              </code>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm text-slate-900 dark:text-white truncate max-w-xs">
                                {alert.subject}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                  <User className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                                </div>
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  {alert.customerName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {alert.issueType}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {alert.assigneeName}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                className={
                                  alert.priority === 'urgent'
                                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                    : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                }
                              >
                                {alert.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {alert.timeAgo}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link href={`/admin/tickets/${alert.ticketNumber}`}>
                                <Button variant="ghost" size="sm" className="gap-2">
                                  View
                                  <ArrowUpRight className="w-3 h-3" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();
