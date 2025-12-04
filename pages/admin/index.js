import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/admin/universal/AdminLayout';
import PageHead from '../../components/admin/PageHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Separator } from '../../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Plus, BarChart3, Users, Settings as SettingsIcon, Ticket as TicketIcon, AlertTriangle, CheckCircle2, Clock, Zap, Heart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { withAuth } from '../../lib/withAuth';

export default function ModernDashboard() {
  const [dashboardData, setDashboardData] = useState({
    metrics: {
      totalTickets: 0,
      openTickets: 0,
      resolvedToday: 0,
      avgResponseTime: 0,
      customerSatisfaction: 0,
      agentProductivity: 0
    },
    kpis: {
      firstResponseTime: 0,
      resolutionRate: 0,
      customerSatisfaction: 0,
      agentProductivity: 0
    },
    activity: []
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [appTitle, setAppTitle] = useState('HelpDesk Pro');

  useEffect(() => {
    fetchDashboardData();
    fetchAppTitle();
  }, []);

  const fetchAppTitle = async () => {
    try {
      const response = await fetch('/api/admin/settings/basic');
      const data = await response.json();
      if (data.success && data.settings.appTitle) {
        setAppTitle(data.settings.appTitle);
      }
    } catch (error) {
      console.error('Error fetching app title:', error);
    }
  };

  // Live clock (IST)
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard/metrics');
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        // Avoid parsing HTML error pages
        throw new Error('Dashboard API returned non-JSON response');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep safe defaults; optionally show a toast in future
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Tickets',
      value: dashboardData.metrics.totalTickets,
      description: 'All projector support tickets',
      icon: TicketIcon,
      color: 'text-violet-600',
      bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100',
      borderColor: 'border-violet-200',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Open Tickets',
      value: dashboardData.metrics.openTickets,
      description: 'Pending resolution',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      change: '+5%',
      changeType: 'negative'
    },
    {
      title: 'Resolved Today',
      value: dashboardData.metrics.resolvedTickets || 0,
      description: 'Successfully resolved',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      borderColor: 'border-green-200',
      change: '+18%',
      changeType: 'positive'
    },
    {
      title: 'Avg Response Time',
      value: `${dashboardData.metrics.avgResponseTime}m`,
      description: 'Average response time',
      icon: Clock,
      color: 'text-violet-600',
      bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100',
      borderColor: 'border-violet-200',
      change: '-5m',
      changeType: 'positive'
    }
  ];

  const kpiCards = [
    {
      title: 'First Response Time',
      value: `${dashboardData.kpis.firstResponseTime}m`,
      progress: Math.min((dashboardData.kpis.firstResponseTime / 60) * 100, 100),
      description: 'Average time to first response',
      icon: Zap,
      color: 'text-violet-600'
    },
    {
      title: 'Resolution Rate',
      value: `${dashboardData.kpis.resolutionRate}%`,
      progress: dashboardData.kpis.resolutionRate,
      description: 'Percentage of tickets resolved',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100',
      borderColor: 'border-green-200',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Customer Satisfaction',
      value: `${dashboardData.kpis.customerSatisfaction}%`,
      progress: dashboardData.kpis.customerSatisfaction,
      description: 'Customer satisfaction rating',
      icon: Heart,
      color: 'text-pink-600'
    },
    {
      title: 'Agent Productivity',
      value: `${dashboardData.kpis.agentProductivity}/day`,
      progress: Math.min((dashboardData.kpis.agentProductivity / 50) * 100, 100),
      description: 'Tickets per agent per day',
      icon: Users,
      color: 'text-blue-600'
    }
  ];

  const quickActions = [
    {
      title: 'Create Ticket',
      description: 'Create new projector support ticket',
      icon: Plus,
      href: '/admin/tickets/new',
      variant: 'default'
    },
    {
      title: 'View Reports',
      description: 'Analytics and insights',
      icon: BarChart3,
      href: '/admin/reports',
      variant: 'outline'
    },
    {
      title: 'Manage Agents',
      description: 'WZATCO support team',
      icon: Users,
      href: '/admin/agents',
      variant: 'outline'
    },
    {
      title: 'Settings',
      description: 'System configuration',
      icon: SettingsIcon,
      href: '/admin/settings',
      variant: 'outline'
    }
  ];

  if (loading) {
    return (
      <>
        <PageHead title="Dashboard" description="Modern Dashboard" />
        
        <AdminLayout currentPage="Dashboard">
          <div className="space-y-8">
            {/* Loading State */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardHeader className="space-y-0 pb-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title="Dashboard" description="Modern Dashboard" />
      
      <AdminLayout currentPage="Dashboard">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="space-y-8 p-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 p-8 text-white shadow-2xl dark:from-violet-800 dark:via-violet-900 dark:to-purple-950">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">Welcome to {appTitle}</h1>
                    <p className="text-violet-100 text-lg">Manage your projector support operations with professional excellence</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      Live Dashboard
                    </Badge>
                  <div className="text-right">
                      <p className="text-sm text-violet-100">Last updated (IST)</p>
                      <p className="text-sm font-medium">{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' }).format(now)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricCards.map((metric, index) => (
                <Card key={index} className="group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 shadow-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                  <div className={`${metric.bgColor} dark:bg-none dark:bg-slate-800 p-6 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 dark:bg-white/5 rounded-full -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${metric.bgColor} dark:bg-none dark:bg-slate-700 ${metric.borderColor} dark:border-slate-700 border shadow-sm`}>
                          <metric.icon className={`w-6 h-6 ${metric.color}`} />
                        </div>
                        <div className="flex items-center space-x-1">
                          {metric.changeType === 'positive' ? (
                            <ArrowUpRight className="w-4 h-4 text-violet-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-orange-500" />
                          )}
                          <span className={`text-sm font-semibold ${
                            metric.changeType === 'positive' ? 'text-violet-600' : 'text-orange-600'
                          }`}>
                            {metric.change}
                          </span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{metric.value}</div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{metric.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{metric.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* KPI Cards with Enhanced Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpiCards.map((kpi, index) => (
                <Card key={index} className="group hover:shadow-xl hover:scale-105 transition-all duration-300 border-0 shadow-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                  {kpi.title === 'Resolved Today' ? (
                    // Special design for "Resolved Today" card
                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:bg-none dark:bg-slate-800 p-6 h-full relative overflow-hidden">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-green-200/30 rounded-full -translate-y-12 translate-x-12"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-200/20 rounded-full translate-y-8 -translate-x-8"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <CardTitle className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {kpi.title}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200">
                              <kpi.icon className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                              </svg>
                              <span className="text-sm font-semibold text-green-600">{kpi.change}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-4xl font-bold text-green-900 dark:text-green-200 mb-2">{kpi.value}</div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm text-green-700 dark:text-green-300">
                            <span>Today's Progress</span>
                            <span className="font-semibold text-green-600">{Math.round(kpi.progress)}%</span>
                          </div>
                          <div className="relative">
                            <Progress value={kpi.progress} className="h-3 bg-green-200 dark:bg-slate-700" />
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-90"></div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-green-700 dark:text-green-300 mt-3 font-medium">{kpi.description}</p>
                      </div>
                    </div>
                  ) : (
                    // Standard design for other KPI cards
                    <div className="bg-white dark:bg-slate-800 p-6 h-full">
                      <div className="flex items-center justify-between mb-4">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {kpi.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg bg-gradient-to-br dark:bg-none dark:bg-slate-700 ${kpi.color.includes('violet') ? 'from-violet-50 to-violet-100' : kpi.color.includes('green') ? 'from-green-50 to-green-100' : kpi.color.includes('pink') ? 'from-pink-50 to-pink-100' : 'from-blue-50 to-blue-100'}`}>
                          <kpi.icon className={`w-4 h-4 ${kpi.color} dark:text-slate-100`} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{kpi.value}</div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                            <span>Progress</span>
                            <span className="font-semibold text-violet-600">{Math.round(kpi.progress)}%</span>
                          </div>
                          <div className="relative">
                            <Progress value={kpi.progress} className="h-3 bg-slate-200 dark:bg-slate-700" />
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full opacity-80"></div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{kpi.description}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Enhanced Quick Actions */}
            <Card className="border-0 shadow-xl dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-t-lg dark:from-violet-800 dark:to-purple-900">
                <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
                <CardDescription className="text-violet-100">Common WZATCO administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="p-6 dark:bg-slate-900">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <Link key={index} href={action.href}>
                      <Button
                        variant={action.variant}
                        className="w-full h-auto p-6 flex flex-col items-center space-y-3 hover:shadow-lg transition-all duration-300 group dark:bg-slate-800 dark:text-slate-100"
                      >
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600 group-hover:scale-110 transition-transform duration-300 dark:from-slate-700 dark:to-slate-700 dark:text-violet-300">
                          <action.icon className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <h4 className={`font-semibold text-sm ${action.title === 'Create Ticket' ? 'text-white' : 'text-foreground dark:text-slate-100'}`}>
                            {action.title}
                          </h4>
                          <p className={`text-xs mt-1 ${action.title === 'Create Ticket' ? 'text-violet-100' : 'text-muted-foreground dark:text-slate-300'}`}>
                            {action.description}
                          </p>
                        </div>
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Recent Activity */}
            <Card className="border-0 shadow-xl dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg dark:from-slate-800 dark:to-slate-900">
                <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
                <CardDescription className="text-slate-200">Latest projector support activities</CardDescription>
              </CardHeader>
              <CardContent className="p-6 dark:bg-slate-900">
                <div className="space-y-4">
                  {dashboardData.activity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 dark:hover:from-slate-800 dark:hover:to-slate-800 transition-all duration-300 group border border-gray-100 dark:border-slate-800">
                      <Avatar className="h-10 w-10 ring-2 ring-violet-200 group-hover:ring-violet-400 transition-all duration-300">
                        {activity.avatarUrl && typeof activity.avatarUrl === 'string' && activity.avatarUrl.trim() ? (
                          <AvatarImage 
                            src={activity.avatarUrl} 
                            alt={activity.agentName || 'User'}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                          {activity.agentName ? activity.agentName.charAt(0).toUpperCase() : activity.type === 'ticket_created' ? 'S' : 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-700">
                          {activity.message}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{formatIST(activity.timestamp)}</p>
                      </div>
                      <Badge 
                        variant={activity.priority === 'high' ? 'destructive' : 'secondary'} 
                        className="text-xs px-3 py-1"
                      >
                        {activity.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();
