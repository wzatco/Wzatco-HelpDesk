import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  Clock, 
  FileText, 
  Workflow, 
  BarChart3, 
  Plus,
  CheckCircle2,
  AlertTriangle,
  Pause,
  XCircle
} from 'lucide-react';

export default function SLAManagement() {
  const [activeTab, setActiveTab] = useState('policies');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sla/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching SLA stats:', err);
      setError('Failed to load SLA statistics');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'policies', name: 'SLA Policies', icon: FileText },
    { id: 'workflows', name: 'Workflow Builder', icon: Workflow },
    { id: 'active', name: 'Active Timers', icon: Clock },
    { id: 'reports', name: 'Reports & Analytics', icon: BarChart3 },
  ];

  return (
    <>
      <PageHead title="SLA Management" description="Configure Service Level Agreements, monitor timers, and track performance" />
      
      <AdminLayout currentPage="SLA Management">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">SLA Management</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Configure Service Level Agreements, monitor timers, and track performance
              </p>
            </div>
            <Link href="/admin/sla/policies/new">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Policy
              </Button>
            </Link>
          </div>

          {/* Tabs Card */}
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <div className="border-b border-slate-200 dark:border-slate-700">
              <nav className="flex -mb-px">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-center text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'text-violet-600 dark:text-violet-400 bg-slate-50 dark:bg-slate-800'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Icon className="w-5 h-5" />
                        <span>{tab.name}</span>
                      </div>
                      {activeTab === tab.id && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-600 dark:bg-violet-400" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <CardContent className="p-6 bg-slate-50 dark:bg-slate-900/50">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              {!loading && !error && (
                <>
                  {activeTab === 'policies' && <PoliciesTab stats={stats} />}
                  {activeTab === 'workflows' && <WorkflowsTab stats={stats} />}
                  {activeTab === 'active' && <ActiveTimersTab stats={stats} />}
                  {activeTab === 'reports' && <ReportsTab stats={stats} />}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

function PoliciesTab({ stats }) {
  const [recentPolicies, setRecentPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  
  const totalPolicies = stats?.policies?.total || 0;
  const activePolicies = stats?.policies?.active || 0;
  const draftWorkflows = stats?.workflows?.draft || 0;
  const publishedWorkflows = stats?.workflows?.published || 0;

  useEffect(() => {
    const fetchRecentPolicies = async () => {
      try {
        setLoadingPolicies(true);
        const response = await fetch('/api/admin/sla/policies');
        const data = await response.json();
        
        if (data.success && data.policies) {
          // Get 3 most recent policies
          const recent = data.policies
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);
          setRecentPolicies(recent);
        }
      } catch (err) {
        console.error('Error fetching recent policies:', err);
      } finally {
        setLoadingPolicies(false);
      }
    };

    if (totalPolicies > 0) {
      fetchRecentPolicies();
    }
  }, [totalPolicies]);

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Policies"
          value={totalPolicies.toString()}
          icon={FileText}
          color="violet"
        />
        <StatCard
          title="Active Policies"
          value={activePolicies.toString()}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Draft Workflows"
          value={draftWorkflows.toString()}
          icon={FileText}
          color="yellow"
        />
        <StatCard
          title="Published Workflows"
          value={publishedWorkflows.toString()}
          icon={CheckCircle2}
          color="purple"
        />
      </div>

      {/* Empty State */}
      {totalPolicies === 0 && (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50">
          <CardContent className="p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-400 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No SLA Policies Yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Create your first SLA policy to define response and resolution times for different priority levels.
              </p>
              <Link href="/admin/sla/policies/new">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Policy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Policies List */}
      {totalPolicies > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Policies</h3>
            <Link href="/admin/sla/policies">
              <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium">
                View All
              </button>
            </Link>
          </div>

          {loadingPolicies ? (
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentPolicies.map((policy) => (
                <Card key={policy.id} className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {policy.name}
                          </h4>
                          {policy.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Default
                            </span>
                          )}
                          {policy.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Inactive
                            </span>
                          )}
                        </div>
                        {policy.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-1">
                            {policy.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span>Urgent: {formatTime(policy.urgentResponseTime)} / {formatTime(policy.urgentResolutionTime)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span>High: {formatTime(policy.highResponseTime)} / {formatTime(policy.highResolutionTime)}</span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/admin/sla/policies/edit/${policy.id}`} className="ml-4">
                        <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium">
                          Edit
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 mt-4">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                You have <strong className="text-slate-900 dark:text-slate-100">{totalPolicies}</strong> SLA {totalPolicies === 1 ? 'policy' : 'policies'} configured, 
                with <strong className="text-slate-900 dark:text-slate-100">{activePolicies}</strong> currently active.
              </p>
              <Link href="/admin/sla/policies">
                <button className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium">
                  Manage Policies
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function WorkflowsTab({ stats }) {
  const draftWorkflows = stats?.workflows?.draft || 0;
  const publishedWorkflows = stats?.workflows?.published || 0;
  const totalWorkflows = draftWorkflows + publishedWorkflows;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Workflows"
          value={totalWorkflows.toString()}
          icon={Workflow}
          color="violet"
        />
        <StatCard
          title="Draft Workflows"
          value={draftWorkflows.toString()}
          icon={FileText}
          color="yellow"
        />
        <StatCard
          title="Active Workflows"
          value={publishedWorkflows.toString()}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {totalWorkflows === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50">
          <CardContent className="p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Workflow className="w-8 h-8 text-slate-400 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Workflow Builder</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Design custom SLA workflows with drag-and-drop components for triggers, conditions, actions, and timers.
              </p>
              <Link href="/admin/sla/workflows/builder">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Workflow className="w-4 h-4 mr-2" />
                  Open Workflow Builder
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Workflows</h3>
              <Link href="/admin/sla/workflows">
                <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium">
                  View All
                </button>
              </Link>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              You have <strong className="text-slate-900 dark:text-slate-100">{totalWorkflows}</strong> workflow{totalWorkflows === 1 ? '' : 's'}, 
              with <strong className="text-green-600 dark:text-green-400">{publishedWorkflows}</strong> active and 
              <strong className="text-yellow-600 dark:text-yellow-400"> {draftWorkflows}</strong> in draft.
            </p>
            <div className="flex gap-2">
              <Link href="/admin/sla/workflows/builder" className="flex-1">
                <button className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium">
                  <Plus className="w-4 h-4" />
                  Create New Workflow
                </button>
              </Link>
              <Link href="/admin/sla/workflows" className="flex-1">
                <button className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium">
                  Manage Workflows
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActiveTimersTab({ stats }) {
  const runningTimers = stats?.timers?.running || 0;
  const atRiskTimers = stats?.timers?.atRisk || 0;
  const breachedTimers = stats?.timers?.breached || 0;
  const pausedTimers = stats?.timers?.paused || 0;
  const totalTimers = runningTimers + pausedTimers + breachedTimers;

  return (
    <div className="space-y-6">
      {/* Timer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Running Timers" 
          value={runningTimers.toString()} 
          icon={Clock} 
          color="blue" 
        />
        <StatCard 
          title="At Risk" 
          value={atRiskTimers.toString()} 
          icon={AlertTriangle} 
          color="yellow" 
        />
        <StatCard 
          title="Breached" 
          value={breachedTimers.toString()} 
          icon={XCircle} 
          color="red" 
        />
        <StatCard 
          title="Paused" 
          value={pausedTimers.toString()} 
          icon={Pause} 
          color="gray" 
        />
      </div>

      {/* Empty State */}
      {totalTimers === 0 && (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-slate-400 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Active Timers</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                SLA timers will appear here once you create policies and have active tickets.
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/admin/sla/policies/new">
                  <Button variant="outline">
                    Create Policy
                  </Button>
                </Link>
                <Link href="/admin/sla/workflows/builder">
                  <Button variant="outline">
                    Create Workflow
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer Summary */}
      {totalTimers > 0 && (
        <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Timer Status Summary</h3>
            <div className="space-y-3">
              {runningTimers > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Running Timers</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{runningTimers}</span>
                </div>
              )}
              {atRiskTimers > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">At Risk (80%+ elapsed)</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{atRiskTimers}</span>
                </div>
              )}
              {breachedTimers > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Breached Timers</span>
                  </div>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">{breachedTimers}</span>
                </div>
              )}
              {pausedTimers > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Pause className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Paused Timers</span>
                  </div>
                  <span className="text-lg font-bold text-slate-600 dark:text-slate-400">{pausedTimers}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportsTab({ stats }) {
  const complianceRate = stats?.compliance?.rate || '0.00';
  const avgResponseTime = stats?.averageTimes?.response?.formatted || '0h 0m';
  const avgResolutionTime = stats?.averageTimes?.resolution?.formatted || '0h 0m';
  const totalTickets = stats?.compliance?.totalTickets || 0;
  const metSLA = stats?.compliance?.metSLA || 0;
  const breachedSLA = stats?.compliance?.breachedSLA || 0;
  const totalBreaches = stats?.breaches?.total || 0;

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="SLA Compliance" 
          value={`${parseFloat(complianceRate).toFixed(1)}%`} 
          icon={BarChart3} 
          color="green" 
        />
        <StatCard 
          title="Avg Response Time" 
          value={avgResponseTime} 
          icon={Clock} 
          color="blue" 
        />
        <StatCard 
          title="Avg Resolution Time" 
          value={avgResolutionTime} 
          icon={CheckCircle2} 
          color="purple" 
        />
      </div>

      {/* Detailed Stats */}
      {totalTickets > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Tickets</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalTickets}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Met SLA</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{metSLA}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Breached SLA</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{breachedSLA}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                  <XCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {totalTickets === 0 && (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Data Available</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                SLA reports and analytics will appear here once you have ticket data with active SLA policies.
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/admin/sla/policies/new">
                  <Button variant="outline">
                    Create Policy
                  </Button>
                </Link>
                <Link href="/admin/sla/reports">
                  <Button variant="outline">
                    View Full Reports
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Chart */}
      {totalTickets > 0 && (
        <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">SLA Compliance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Compliance Rate</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{parseFloat(complianceRate).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      parseFloat(complianceRate) >= 90 
                        ? 'bg-green-500' 
                        : parseFloat(complianceRate) >= 70 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, parseFloat(complianceRate))}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Met SLA</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{metSLA}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {totalTickets > 0 ? ((metSLA / totalTickets) * 100).toFixed(1) : 0}% of tickets
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Breached</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{breachedSLA}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {totalTickets > 0 ? ((breachedSLA / totalTickets) * 100).toFixed(1) : 0}% of tickets
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    violet: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
    red: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    gray: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
  };

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
