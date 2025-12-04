import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  Pause,
  TrendingUp,
  TrendingDown,
  FileText,
  Download
} from 'lucide-react';

export default function SLAReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await fetch(
        `/api/admin/sla/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching SLA stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!stats) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));

    // Prepare CSV data
    const rows = [
      ['SLA Reports & Analytics'],
      [`Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`],
      [''],
      ['Key Metrics'],
      ['SLA Compliance', `${stats.compliance?.rate || 0}%`, `${stats.compliance?.metSLA || 0} of ${stats.compliance?.totalTickets || 0} tickets`],
      ['Average Response Time', `${stats.averages?.responseTime || 0} minutes`],
      ['Average Resolution Time', `${stats.averages?.resolutionTime || 0} minutes`],
      ['Total Tickets', `${stats.compliance?.totalTickets || 0}`],
      ['Met SLA', `${stats.compliance?.metSLA || 0}`],
      ['Breached SLA', `${stats.compliance?.breachedSLA || 0}`],
      [''],
      ['Timer Status'],
      ['Running', `${stats.timers?.running || 0}`],
      ['At Risk (80%+)', `${stats.timers?.atRisk || 0}`],
      ['Breached', `${stats.timers?.breached || 0}`],
      ['Paused', `${stats.timers?.paused || 0}`],
      [''],
      ['Breach Analysis'],
      ['Response Breaches', `${stats.breaches?.responseBreaches || 0}`],
      ['Resolution Breaches', `${stats.breaches?.resolutionBreaches || 0}`],
      ['Total Breaches', `${stats.breaches?.totalBreaches || 0}`],
    ];

    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => {
        // Escape commas and quotes
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sla-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <>
        <PageHead title="SLA Reports & Analytics" description="Track SLA performance, compliance, and trends" />
        
        <AdminLayout currentPage="SLA Management">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading SLA reports...</p>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title="SLA Reports & Analytics" description="Track SLA performance, compliance, and trends" />
      
      <AdminLayout currentPage="SLA Management">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">SLA Reports & Analytics</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Track SLA performance, compliance, and trends
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              
              <Button
                onClick={handleExport}
                disabled={!stats}
                className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="SLA Compliance"
              value={stats?.compliance?.rate ? `${stats.compliance.rate}%` : '0%'}
              subtitle={`${stats?.compliance?.metSLA || 0} of ${stats?.compliance?.totalTickets || 0} tickets`}
              icon={CheckCircle2}
              color="green"
              trend={parseFloat(stats?.compliance?.rate || 0) >= 90 ? 'up' : 'down'}
            />
            
            <MetricCard
              title="Avg Response Time"
              value={stats?.averageTimes?.response?.formatted || '0h 0m'}
              subtitle={`${stats?.averageTimes?.response?.minutes || 0} minutes`}
              icon={Clock}
              color="blue"
            />
            
            <MetricCard
              title="Avg Resolution Time"
              value={stats?.averageTimes?.resolution?.formatted || '0h 0m'}
              subtitle={`${stats?.averageTimes?.resolution?.minutes || 0} minutes`}
              icon={CheckCircle2}
              color="purple"
            />
            
            <MetricCard
              title="Total Breaches"
              value={stats?.breaches?.total || 0}
              subtitle="SLA violations"
              icon={AlertTriangle}
              color="red"
              trend={stats?.breaches?.total > 0 ? 'down' : 'up'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Overview */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">SLA Compliance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ComplianceBar
                    label="Met SLA"
                    value={stats?.compliance?.metSLA || 0}
                    total={stats?.compliance?.totalTickets || 1}
                    color="green"
                  />
                  <ComplianceBar
                    label="Breached SLA"
                    value={stats?.compliance?.breachedSLA || 0}
                    total={stats?.compliance?.totalTickets || 1}
                    color="red"
                  />
                </div>

                {/* Compliance Gauge */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="rgb(148 163 184 / 0.2)"
                          strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={parseFloat(stats?.compliance?.rate || 0) >= 90 ? '#10b981' : parseFloat(stats?.compliance?.rate || 0) >= 70 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8"
                          strokeDasharray={`${(parseFloat(stats?.compliance?.rate || 0) / 100) * 251.2} 251.2`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            {stats?.compliance?.rate || 0}%
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">Compliance</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breach Analysis */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Breach Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.breaches?.byType && stats.breaches.byType.length > 0 ? (
                  <div className="space-y-4">
                    {stats.breaches.byType.map((breach, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            breach.breachType === 'response_breach' 
                              ? 'bg-orange-500/10 dark:bg-orange-500/20' 
                              : 'bg-red-500/10 dark:bg-red-500/20'
                          }`}>
                            <AlertTriangle className={`w-5 h-5 ${
                              breach.breachType === 'response_breach' 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                              {breach.breachType.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{breach._count} occurrences</p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{breach._count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">No breaches in this period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timer Status */}
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Current Timer Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatusCard
                  title="Running"
                  value={stats?.timers?.running || 0}
                  icon={Clock}
                  color="blue"
                />
                <StatusCard
                  title="At Risk"
                  value={stats?.timers?.atRisk || 0}
                  icon={AlertTriangle}
                  color="yellow"
                />
                <StatusCard
                  title="Paused"
                  value={stats?.timers?.paused || 0}
                  icon={Pause}
                  color="gray"
                />
                <StatusCard
                  title="Breached"
                  value={stats?.timers?.breached || 0}
                  icon={XCircle}
                  color="red"
                />
              </div>
            </CardContent>
          </Card>

          {/* Policy Performance */}
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Policy Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-violet-500/10 dark:bg-violet-500/20 rounded-lg border border-violet-500/30 dark:border-violet-500/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-violet-700 dark:text-violet-400 font-medium">Active Policies</p>
                      <p className="text-2xl font-bold text-violet-900 dark:text-violet-300 mt-1">{stats?.policies?.active || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg border border-purple-500/30 dark:border-purple-500/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">Published Workflows</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-300 mt-1">{stats?.workflows?.published || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, trend }) {
  const colorClasses = {
    green: 'bg-green-500/10 dark:bg-green-500/20 border-green-500/30 dark:border-green-500/40',
    blue: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 dark:border-blue-500/40',
    purple: 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30 dark:border-purple-500/40',
    red: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/30 dark:border-red-500/40',
  };

  const iconColorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtitle}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className={`w-6 h-6 ${iconColorClasses[color]}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceBar({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    green: 'bg-green-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function StatusCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    gray: 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400',
    red: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
