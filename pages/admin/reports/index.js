import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import { BarChart3, Package, AlertCircle, Clock, Users, TrendingUp, Download, Calendar, Filter, Building2, Star, Phone, Sparkles, Loader2, XIcon, Target, Award, Activity, CheckCircle2, XCircle, TrendingDown } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { withAuth } from '../../../lib/withAuth';

// Simple markdown parser for AI analysis
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>');
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
  
  // Bullet points
  html = html.replace(/^[\s]*[-*]\s+(.*)$/gim, '<li class="ml-4 mb-2">$1</li>');
  
  // Numbered lists
  html = html.replace(/^[\s]*\d+\.\s+(.*)$/gim, '<li class="ml-4 mb-2">$1</li>');
  
  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/gs, '<ul class="list-disc space-y-1 my-3">$&</ul>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mb-4">');
  html = '<p class="mb-4">' + html + '</p>';
  
  // Code blocks (inline)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
  
  return html;
}

function ReportsPageContent({ initialTab = 'products' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const formatDate = (date) => date.toISOString().split('T')[0];
  const quickRanges = [
    { id: '7d', label: 'Last 7 days', days: 7 },
    { id: '30d', label: 'Last 30 days', days: 30 },
    { id: '90d', label: 'Last 90 days', days: 90 },
    { id: 'custom', label: 'Custom', days: null }
  ];
  const [quickRange, setQuickRange] = useState('30d');
  const [dateRange, setDateRange] = useState({
    startDate: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: formatDate(new Date())
  });
  
  // Data states
  const [productData, setProductData] = useState([]);
  const [accessoryData, setAccessoryData] = useState([]);
  const [issueData, setIssueData] = useState([]);
  const [tatData, setTatData] = useState([]);
  const [agentData, setAgentData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [csatData, setCsatData] = useState(null);
  const [callbackData, setCallbackData] = useState([]);
  const [summary, setSummary] = useState({
    products: null,
    issues: null,
    tat: null,
    agents: null,
    departments: null,
    csat: null,
    callbacks: null
  });
  const [error, setError] = useState(null);

  const handleQuickRangeChange = (rangeId) => {
    setQuickRange(rangeId);
    const selectedRange = quickRanges.find((r) => r.id === rangeId);
    if (!selectedRange || !selectedRange.days) return;
    const end = new Date();
    const start = new Date(end.getTime() - selectedRange.days * 24 * 60 * 60 * 1000);
    setDateRange({
      startDate: formatDate(start),
      endDate: formatDate(end)
    });
  };

  const tabs = [
    { id: 'products', name: 'Product Analytics', icon: Package },
    { id: 'issues', name: 'Issue Analytics', icon: AlertCircle },
    { id: 'tat', name: 'TAT Reports', icon: Clock },
    { id: 'agents', name: 'Agent Performance', icon: Users },
    { id: 'departments', name: 'Department Analytics', icon: Building2 },
    { id: 'csat', name: 'CSAT Report', icon: Star },
    { id: 'callbacks', name: 'Callback Reports', icon: Phone }
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, dateRange]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchData = async () => {
    if (loading) {
      // We already have a fetch in progress; avoid starting another spinner cycle
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      if (activeTab === 'products') {
        const res = await fetch(`/api/admin/reports/products?${params}`);
        const data = await res.json();
        if (data.success) {
          const products = data.data || [];
          const accessories = data.accessories || [];
          setProductData(products);
          setAccessoryData(accessories);
          setSummary((prev) => ({
            ...prev,
            products: {
              totalProducts: data.summary?.totalProducts ?? products.length,
              totalTickets:
                data.summary?.totalTickets ??
                products.reduce((sum, product) => sum + (product.totalTickets || 0), 0),
              totalAccessories: data.summary?.totalAccessories ?? accessories.length,
              topProduct: products[0] || null
            }
          }));
        } else {
          setError(data.message || 'Unable to load product analytics');
        }
      } else if (activeTab === 'issues') {
        const res = await fetch(`/api/admin/reports/issues?${params}`);
        const data = await res.json();
        if (data.success) {
          const issues = data.data || [];
          setIssueData(issues);
          const totalTickets = issues.reduce((sum, issue) => sum + (issue.totalTickets || 0), 0);
          const resolvedTickets = issues.reduce(
            (sum, issue) => sum + (issue.resolvedTickets || 0),
            0
          );
          const topIssue = issues
            .slice()
            .sort((a, b) => (b.totalTickets || 0) - (a.totalTickets || 0))[0];
          setSummary((prev) => ({
            ...prev,
            issues: {
              totalIssues: issues.length,
              totalTickets,
              resolvedTickets,
              openTickets: issues.reduce((sum, issue) => sum + (issue.openTickets || 0), 0),
              topIssue: topIssue || null
            }
          }));
        } else {
          setError(data.message || 'Unable to load issue analytics');
        }
      } else if (activeTab === 'tat') {
        const res = await fetch(`/api/admin/reports/tat?${params}`);
        const data = await res.json();
        if (data.success) {
          const tat = data.data || [];
          setTatData(tat);
          const exceeded = tat.filter((ticket) => ticket.exceeded);
          const threshold = tat[0]?.thresholdHours || 0;
          const compliance = tat.length
            ? Math.round(((tat.length - exceeded.length) / tat.length) * 100)
            : 0;
          setSummary((prev) => ({
            ...prev,
            tat: {
              totalTickets: tat.length,
              exceeded: exceeded.length,
              compliance,
              threshold
            }
          }));
        } else {
          setError(data.message || 'Unable to load TAT report');
        }
      } else if (activeTab === 'agents') {
        const res = await fetch(`/api/admin/reports/agents?${params}`);
        const data = await res.json();
        if (data.success) {
          const agents = data.data || [];
          setAgentData(agents);
          const totalAgents = agents.length;
          const avgResolutionRate = totalAgents
            ? agents.reduce((sum, agent) => sum + (agent.resolutionRate || 0), 0) / totalAgents
            : 0;
          const avgFRT = totalAgents
            ? agents.reduce((sum, agent) => sum + (agent.averageFRT || 0), 0) / totalAgents
            : 0;
          const topAgent = agents
            .slice()
            .sort((a, b) => (b.resolutionRate || 0) - (a.resolutionRate || 0))[0];
          setSummary((prev) => ({
            ...prev,
            agents: {
              totalAgents,
              avgResolutionRate: Number(avgResolutionRate.toFixed(1)),
              avgFRT: Number(avgFRT.toFixed(1)),
              topAgent: topAgent || null
            }
          }));
        } else {
          setError(data.message || 'Unable to load agent performance');
        }
      } else if (activeTab === 'departments') {
        const res = await fetch(`/api/admin/reports/departments?${params}`);
        const data = await res.json();
        if (data.success) {
          const departments = data.data || [];
          setDepartmentData(departments);
          const totalDepartments = departments.length;
          const avgResolutionRate = totalDepartments
            ? departments.reduce((sum, dept) => sum + (dept.resolutionRate || 0), 0) /
              totalDepartments
            : 0;
          const busiestDept = departments
            .slice()
            .sort((a, b) => (b.totalTickets || 0) - (a.totalTickets || 0))[0];
          const bestDept = departments
            .slice()
            .sort((a, b) => (b.resolutionRate || 0) - (a.resolutionRate || 0))[0];
          setSummary((prev) => ({
            ...prev,
            departments: {
              totalDepartments,
              avgResolutionRate: Number(avgResolutionRate.toFixed(1)),
              busiestDept: busiestDept || null,
              bestDept: bestDept || null
            }
          }));
        } else {
          setError(data.message || 'Unable to load department analytics');
        }
      } else if (activeTab === 'csat') {
        const res = await fetch(`/api/admin/reports/csat?${params}`);
        const data = await res.json();
        console.log('📊 CSAT API Response:', data);
        if (data.success) {
          const csat = data.data || {
            summary: {
              totalFeedbacks: 0,
              averageRating: 0,
              csatScore: 0,
              ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            },
            agentMetrics: [],
            departmentMetrics: [],
            recentFeedbacks: []
          };
          console.log('✅ Setting CSAT data:', csat);
          setCsatData(csat);
          setSummary((prev) => ({
            ...prev,
            csat: csat?.summary || {
              totalFeedbacks: 0,
              averageRating: 0,
              csatScore: 0,
              ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            }
          }));
        } else {
          console.error('❌ CSAT API Error:', data);
          setError(data.message || 'Unable to load CSAT report');
          // Set default empty data on error so UI still renders
          setCsatData({
            summary: {
              totalFeedbacks: 0,
              averageRating: 0,
              csatScore: 0,
              ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            },
            agentMetrics: [],
            departmentMetrics: [],
            recentFeedbacks: []
          });
        }
      } else if (activeTab === 'callbacks') {
        const res = await fetch(`/api/admin/reports/callbacks?${params}`);
        const data = await res.json();
        if (data.success) {
          const callbacks = data.data || [];
          setCallbackData(callbacks);
          setSummary((prev) => ({
            ...prev,
            callbacks: data.summary || null
          }));
        } else {
          setError(data.message || 'Unable to load callback reports');
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Unable to fetch report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    try {
      setAiLoading(true);
      setAiAnalysis(null);

      // Gather metrics from current tab data
      const metrics = {
        dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
        ticketVolume: 0,
        csatScore: null,
        slaCompliance: null,
        activeTab
      };

      // Collect metrics based on active tab
      if (activeTab === 'products' && summary.products) {
        metrics.ticketVolume = summary.products.totalTickets;
        metrics.topProduct = summary.products.topProduct?.name;
      } else if (activeTab === 'tat' && summary.tat) {
        metrics.ticketVolume = summary.tat.totalTickets;
        metrics.slaCompliance = summary.tat.compliance;
        metrics.exceededTickets = summary.tat.exceeded;
      } else if (activeTab === 'agents' && summary.agents) {
        metrics.totalAgents = summary.agents.totalAgents;
        metrics.avgResolutionRate = summary.agents.avgResolutionRate;
        metrics.avgFirstResponse = summary.agents.avgFRT;
      } else if (activeTab === 'csat' && summary.csat) {
        metrics.csatScore = summary.csat.csatScore;
        metrics.totalFeedbacks = summary.csat.totalFeedbacks;
        metrics.csatDistribution = summary.csat;
      }

      // Call AI analysis API
      const response = await fetch('/api/admin/reports/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics,
          dateRange
        })
      });

      const data = await response.json();

      if (data.success) {
        setAiAnalysis(data.analysis);
        setShowAiAnalysis(true);
      } else {
        alert('Failed to generate AI analysis: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      alert('Failed to generate AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        type: activeTab,
        format: 'csv' // Explicitly request CSV format
      });
      const res = await fetch(`/api/admin/reports/export?${params}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Export failed' }));
        console.error('Export error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Export failed');
      }
      const blob = await res.blob();
      
      // Check if the response is JSON (error) or CSV
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        // If it's JSON, it's an error response
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || errorData.error || 'Export failed');
        } catch (e) {
          throw new Error('Invalid response from server');
        }
      }
      
      // CSV format
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert(`Failed to export report: ${error.message || 'Unknown error'}`);
    }
  };

  const renderSummaryCards = () => {
    const currentSummary = summary[activeTab];
    if (!currentSummary) return null;

    switch (activeTab) {
      case 'products': {
        const top = currentSummary.topProduct;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Products"
              value={currentSummary.totalProducts}
              subtitle="Tracked in this range"
              gradient="from-violet-600 to-purple-600"
            />
            <SummaryCard
              title="Total Tickets"
              value={currentSummary.totalTickets}
              subtitle="Product-related"
              gradient="from-slate-900 to-slate-800"
            />
            <SummaryCard
              title="Accessories"
              value={currentSummary.totalAccessories}
              subtitle="With analytics"
              gradient="from-blue-600 to-cyan-500"
            />
            <SummaryCard
              title="Top Product"
              value={top ? top.productName || top.productModel : '—'}
              subtitle={top ? `${top.totalTickets} tickets` : 'No data'}
              gradient="from-emerald-600 to-teal-500"
            />
          </div>
        );
      }
      case 'issues': {
        const { topIssue } = currentSummary;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Issues"
              value={currentSummary.totalIssues}
              subtitle="Unique categories"
              gradient="from-orange-500 to-amber-500"
            />
            <SummaryCard
              title="Total Tickets"
              value={currentSummary.totalTickets}
              subtitle="Issue related"
              gradient="from-slate-900 to-slate-800"
            />
            <SummaryCard
              title="Resolved"
              value={currentSummary.resolvedTickets}
              subtitle="Tickets closed"
              gradient="from-emerald-600 to-green-500"
            />
            <SummaryCard
              title="Top Issue"
              value={topIssue?.issue || '—'}
              subtitle={topIssue ? `${topIssue.totalTickets} tickets` : 'No data'}
              gradient="from-violet-600 to-blue-600"
            />
          </div>
        );
      }
      case 'tat': {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Tickets"
              value={currentSummary.totalTickets}
              subtitle={`Threshold ${currentSummary.threshold}h`}
              gradient="from-slate-900 to-slate-800"
            />
            <SummaryCard
              title="Within TAT"
              value={currentSummary.totalTickets - currentSummary.exceeded}
              subtitle={`${currentSummary.compliance}% compliance`}
              gradient="from-emerald-600 to-green-500"
            />
            <SummaryCard
              title="Exceeded"
              value={currentSummary.exceeded}
              subtitle="Need attention"
              gradient="from-red-600 to-pink-500"
            />
            <SummaryCard
              title="Compliance"
              value={`${currentSummary.compliance}%`}
              subtitle="Overall SLA health"
              gradient="from-blue-600 to-cyan-500"
            />
          </div>
        );
      }
      case 'agents': {
        const { topAgent } = currentSummary;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Agents"
              value={currentSummary.totalAgents}
              subtitle="Active this range"
              gradient="from-indigo-600 to-blue-600"
            />
            <SummaryCard
              title="Avg Resolution Rate"
              value={`${currentSummary.avgResolutionRate}%`}
              subtitle="Across all agents"
              gradient="from-slate-900 to-slate-800"
            />
            <SummaryCard
              title="Avg First Response"
              value={`${currentSummary.avgFRT}h`}
              subtitle="Mean FRT"
              gradient="from-teal-500 to-emerald-500"
            />
            <SummaryCard
              title="Top Performer"
              value={topAgent?.agentName || '—'}
              subtitle={topAgent ? `${topAgent.resolutionRate}% resolution` : 'No data'}
              gradient="from-violet-600 to-purple-600"
            />
          </div>
        );
      }
      case 'departments': {
        const { busiestDept, bestDept } = currentSummary;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Departments"
              value={currentSummary.totalDepartments}
              subtitle="Reporting data"
              gradient="from-violet-600 to-blue-600"
            />
            <SummaryCard
              title="Avg Resolution Rate"
              value={`${currentSummary.avgResolutionRate}%`}
              subtitle="Across departments"
              gradient="from-slate-900 to-slate-800"
            />
            <SummaryCard
              title="Busiest Department"
              value={busiestDept?.department || '—'}
              subtitle={busiestDept ? `${busiestDept.totalTickets} tickets` : 'No data'}
              gradient="from-amber-500 to-orange-500"
            />
            <SummaryCard
              title="Best Resolution"
              value={bestDept?.department || '—'}
              subtitle={bestDept ? `${bestDept.resolutionRate}% rate` : 'No data'}
              gradient="from-emerald-600 to-teal-500"
            />
          </div>
        );
      }
      case 'csat': {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Feedbacks"
              value={currentSummary.totalFeedbacks}
              subtitle="Responses collected"
              gradient="from-violet-600 to-purple-600"
            />
            <SummaryCard
              title="Average Rating"
              value={`${currentSummary.averageRating?.toFixed(2) || '0.00'}/5`}
              subtitle="Across all tickets"
              gradient="from-emerald-600 to-teal-500"
            />
            <SummaryCard
              title="CSAT Score"
              value={`${currentSummary.csatScore || 0}%`}
              subtitle="4★ and above"
              gradient="from-blue-600 to-cyan-500"
            />
            <SummaryCard
              title="5-Star Reviews"
              value={currentSummary.ratingDistribution?.[5] ?? 0}
              subtitle="Absolute count"
              gradient="from-amber-500 to-orange-500"
            />
          </div>
        );
      }
      case 'callbacks': {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Callbacks"
              value={currentSummary.totalCallbacks}
              subtitle="Scheduled in range"
              gradient="from-violet-600 to-purple-600"
            />
            <SummaryCard
              title="Completed"
              value={currentSummary.statusCounts?.completed || 0}
              subtitle="Successfully completed"
              gradient="from-emerald-600 to-teal-500"
            />
            <SummaryCard
              title="Completion Rate"
              value={`${currentSummary.completionRate || 0}%`}
              subtitle="% of total callbacks"
              gradient="from-blue-600 to-cyan-500"
            />
            <SummaryCard
              title="Pending"
              value={currentSummary.statusCounts?.pending || 0}
              subtitle="Awaiting callback"
              gradient="from-amber-500 to-orange-500"
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      <PageHead title="Reports & Analytics" description="View analytics and reports" />
      
      <AdminLayout currentPage="Reports">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400">Mission-critical intelligence across products, agents, departments, and customer sentiment.</p>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              {quickRanges.map((range) => (
                <button
                  key={range.id}
                  onClick={() => handleQuickRangeChange(range.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    quickRange === range.id
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-slate-300 text-slate-600 hover:border-violet-400 hover:text-violet-600 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>From</span>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => {
                      setQuickRange('custom');
                      setDateRange({ ...dateRange, startDate: e.target.value });
                    }}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>To</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => {
                      setQuickRange('custom');
                      setDateRange({ ...dateRange, endDate: e.target.value });
                    }}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAIAnalysis}
                  disabled={aiLoading || loading || !summary}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-medium transition-all shadow-md"
                  title="Generate AI-powered insights from current report data"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze with AI
                    </>
                  )}
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-md"
                  title={`Export ${activeTab} report (Excel/CSV) for ${dateRange.startDate} to ${dateRange.endDate}`}
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <button
                onClick={fetchData}
                className="text-sm font-semibold underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}

          {renderSummaryCards()}

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="relative min-h-[420px] p-6">
          <div className={`transition-opacity duration-200 ${loading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            {activeTab === 'products' && (
              <ProductAnalytics data={productData} accessories={accessoryData} />
            )}
            {activeTab === 'issues' && (
              <IssueAnalytics data={issueData} />
            )}
            {activeTab === 'tat' && (
              <TATReports data={tatData} />
            )}
            {activeTab === 'agents' && (
              <AgentPerformance data={agentData} />
            )}
            {activeTab === 'departments' && (
              <DepartmentAnalytics data={departmentData} />
            )}
            {activeTab === 'csat' && (
              <CSATReport data={csatData} />
            )}
            {activeTab === 'callbacks' && (
              <CallbackReport data={callbackData} summary={summary.callbacks} />
            )}
          </div>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-200 flex items-center gap-2 shadow-lg">
                <span className="inline-flex h-4 w-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></span>
                Refreshing report…
              </div>
            </div>
          )}
        </div>
      </div>

        {/* AI Analysis Modal */}
        {showAiAnalysis && aiAnalysis && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAiAnalysis(false);
              }
            }}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        AI-Powered Analytics Report
                      </h3>
                      <p className="text-sm text-white/90 mt-1">
                        {dateRange.startDate} to {dateRange.endDate} • {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Analysis
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiAnalysis(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <XIcon className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto flex-1">
                <div className="p-6">
                  {/* AI Analysis Text */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">AI Insights</h4>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <div 
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(aiAnalysis) }}
                        className="markdown-content"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Report generated by AI • {new Date().toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setShowAiAnalysis(false)}
                  className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        </div>
      </AdminLayout>
    </>
  );
}

// Metric Card Component for AI Modal
function MetricCard({ icon, label, value, subtitle, gradient }) {
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium text-white/80 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1 truncate">{value}</p>
        {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// Chart Card Component for AI Modal
function ChartCard({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-violet-600 dark:text-violet-400">
          {icon}
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      </div>
      {children}
    </div>
  );
}

// Product Analytics Component
function ProductAnalytics({ data, accessories = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">No product data available for the selected date range</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.slice(0, 4).map((product, idx) => (
          <div key={idx} className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-violet-200 dark:border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">{product.productName || product.productModel}</h3>
                {product.category && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{product.category}</p>
                )}
              </div>
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 ml-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total Tickets:</span>
                <span className="font-bold text-slate-900 dark:text-white">{product.totalTickets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Avg Resolution:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {product.averageResolutionTime > 0 
                    ? `${product.averageResolutionTime.toFixed(1)}h`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Avg Active:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {product.avgActiveHours > 0 
                    ? `${product.avgActiveHours.toFixed(1)}h`
                    : 'N/A'}
                </span>
              </div>
              {product.accessories && product.accessories.length > 0 && (
                <div className="flex justify-between text-sm pt-1 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-slate-600 dark:text-slate-400">Accessories:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{product.accessories.length}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Product Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Product</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Category</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Open</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolved</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Resolution</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Active Time</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Accessories</th>
              </tr>
            </thead>
            <tbody>
              {data.map((product, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{product.productName || product.productModel}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{product.category || '—'}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{product.totalTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{product.openTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{product.resolvedTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {product.averageResolutionTime > 0 
                      ? `${product.averageResolutionTime.toFixed(1)}h`
                      : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    {product.avgActiveHours > 0 ? (
                      <span 
                        className="font-bold text-emerald-600 dark:text-emerald-400"
                        title={`Actual agent work time per ticket. Calendar: ${product.averageResolutionTime?.toFixed(1) || 'N/A'}h | Active: ${product.avgActiveHours.toFixed(1)}h`}
                      >
                        {product.avgActiveHours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {product.accessories && product.accessories.length > 0 ? (
                      <span className="font-medium text-violet-600 dark:text-violet-400">{product.accessories.length}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accessory Analytics Section */}
      {accessories && accessories.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Accessory Analytics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Accessory</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Open</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolved</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Resolution</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Active Time</th>
                </tr>
              </thead>
              <tbody>
                {accessories.map((accessory, idx) => (
                  <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{accessory.productName}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{accessory.accessoryName}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{accessory.totalTickets}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{accessory.openTickets}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{accessory.resolvedTickets}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                      {accessory.averageResolutionTime > 0 
                        ? `${accessory.averageResolutionTime.toFixed(1)}h`
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      {accessory.avgActiveHours > 0 ? (
                        <span 
                          className="font-bold text-emerald-600 dark:text-emerald-400"
                          title={`Actual agent work time per ticket. Calendar: ${accessory.averageResolutionTime?.toFixed(1) || 'N/A'}h | Active: ${accessory.avgActiveHours.toFixed(1)}h`}
                        >
                          {accessory.avgActiveHours.toFixed(1)}h
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Issue Analytics Component
function IssueAnalytics({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">No issue data available for the selected date range</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-blue-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Issues</span>
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-emerald-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Resolved Issues</span>
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {data.filter(i => i.resolvedTickets > 0).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-amber-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Tickets</span>
            <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {data.reduce((sum, i) => sum + i.totalTickets, 0)}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Issue Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Issue</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Open</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolved</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Resolution</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Active Time</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Products</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((issue, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white max-w-md truncate" title={issue.issue}>
                    {issue.issue}
                  </td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{issue.totalTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{issue.openTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{issue.resolvedTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {issue.averageResolutionTime > 0 
                      ? `${issue.averageResolutionTime.toFixed(1)}h`
                      : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    {issue.avgActiveHours !== undefined && issue.avgActiveHours >= 0 ? (
                      <span 
                        className="font-bold text-emerald-600 dark:text-emerald-400"
                        title={`Actual agent work time per ticket. Calendar: ${issue.averageResolutionTime?.toFixed(1) || 'N/A'}h | Active: ${issue.avgActiveHours.toFixed(1)}h`}
                      >
                        {issue.avgActiveHours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {issue.products && issue.products.length > 0 
                      ? issue.products.slice(0, 2).join(', ') + (issue.products.length > 2 ? '...' : '')
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// TAT Reports Component
function TATReports({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">No TAT data available for the selected date range</p>
      </div>
    );
  }

  const exceededTickets = data.filter(t => t.exceeded);
  const thresholdHours = data[0]?.thresholdHours || 24;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-red-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">TAT Exceeded</span>
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{exceededTickets.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.length > 0 ? Math.round((exceededTickets.length / data.length) * 100) : 0}% of total
          </p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-violet-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Tickets</span>
            <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Threshold: {thresholdHours}h</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-emerald-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Within TAT</span>
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.length - exceededTickets.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.length > 0 ? Math.round(((data.length - exceededTickets.length) / data.length) * 100) : 0}% compliance
          </p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tickets Exceeding TAT ({thresholdHours}h)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Ticket ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Assignee</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolution Time</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Active Time</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</th>
              </tr>
            </thead>
            <tbody>
              {exceededTickets.slice(0, 50).map((ticket, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{ticket.ticketId}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate" title={ticket.subject}>
                    {ticket.subject}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{ticket.customerName}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{ticket.assigneeName}</td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.status === 'resolved' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : ticket.status === 'open'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span 
                      className="font-bold text-red-600 dark:text-red-400"
                      title={ticket.activeTimeHours !== null && ticket.activeTimeHours !== undefined 
                        ? `Calendar: ${ticket.resolutionTimeHours?.toFixed(1) || 'N/A'}h | Active: ${ticket.activeTimeHours.toFixed(1)}h`
                        : `Calendar: ${ticket.resolutionTimeHours?.toFixed(1) || 'N/A'}h`
                      }
                    >
                      {ticket.resolutionTimeHours ? `${ticket.resolutionTimeHours.toFixed(1)}h` : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    {ticket.activeTimeHours !== null && ticket.activeTimeHours !== undefined ? (
                      <span 
                        className="font-bold text-emerald-600 dark:text-emerald-400"
                        title={`Calendar: ${ticket.resolutionTimeHours?.toFixed(1) || 'N/A'}h | Active: ${ticket.activeTimeHours.toFixed(1)}h`}
                      >
                        {ticket.activeTimeHours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.priority === 'high' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : ticket.priority === 'medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Agent Performance Component
function AgentPerformance({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">No agent performance data available for the selected date range</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {data.slice(0, 4).map((agent, idx) => (
          <div key={idx} className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-violet-200 dark:border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">{agent.agentName}</h3>
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total:</span>
                <span className="font-bold text-slate-900 dark:text-white">{agent.totalTickets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Resolved:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{agent.resolvedTickets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Resolution Rate:</span>
                <span className="font-bold text-slate-900 dark:text-white">{agent.resolutionRate}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Agent Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Agent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Department</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Open</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolved</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg FRT</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Resolution</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((agent, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{agent.agentName}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{agent.department}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.totalTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.openTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.resolvedTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {agent.averageFRT > 0 ? `${agent.averageFRT.toFixed(1)}h` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {agent.averageResolutionTime > 0 ? `${agent.averageResolutionTime.toFixed(1)}h` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.resolutionRate >= 80
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : agent.resolutionRate >= 60
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                      {agent.resolutionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Department Analytics Component
function DepartmentAnalytics({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">No department data available for the selected date range</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.slice(0, 4).map((dept, idx) => (
          <div key={idx} className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-violet-200 dark:border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">{dept.department}</h3>
              <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Agents:</span>
                <span className="font-bold text-slate-900 dark:text-white">{dept.activeAgents}/{dept.totalAgents}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total Tickets:</span>
                <span className="font-bold text-slate-900 dark:text-white">{dept.totalTickets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Resolution Rate:</span>
                <span className="font-bold text-slate-900 dark:text-white">{dept.resolutionRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Avg Active:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {dept.avgActiveHours > 0 
                    ? `${dept.avgActiveHours.toFixed(1)}h`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Department Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Department</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Agents</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Total Tickets</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Open</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolved</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg FRT</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Resolution</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Active Time</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((dept, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{dept.department}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {dept.activeAgents}/{dept.totalAgents}
                  </td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{dept.totalTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{dept.openTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{dept.resolvedTickets}</td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {dept.averageFRT > 0 ? `${dept.averageFRT.toFixed(1)}h` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                    {dept.averageResolutionTime > 0 ? `${dept.averageResolutionTime.toFixed(1)}h` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    {dept.avgActiveHours > 0 ? (
                      <span 
                        className="font-bold text-emerald-600 dark:text-emerald-400"
                        title={`Actual agent work time per ticket. Calendar: ${dept.averageResolutionTime?.toFixed(1) || 'N/A'}h | Active: ${dept.avgActiveHours.toFixed(1)}h`}
                      >
                        {dept.avgActiveHours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dept.resolutionRate >= 80
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : dept.resolutionRate >= 60
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                      {dept.resolutionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// CSAT Report Component
function CSATReport({ data }) {
  // Default values if data is not available
  const summary = data?.summary || {
    totalFeedbacks: 0,
    averageRating: 0,
    csatScore: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };
  const agentMetrics = data?.agentMetrics || [];
  const departmentMetrics = data?.departmentMetrics || [];
  const recentFeedbacks = data?.recentFeedbacks || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-violet-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Feedbacks</span>
            <Star className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalFeedbacks}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-emerald-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Average Rating</span>
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {(summary?.averageRating || 0).toFixed(2)}/5
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-blue-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">CSAT Score</span>
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary?.csatScore || 0}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">% of 4+ ratings</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-amber-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">5-Star Ratings</span>
            <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary?.ratingDistribution?.[5] || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {(summary?.totalFeedbacks || 0) > 0 
              ? Math.round(((summary?.ratingDistribution?.[5] || 0) / (summary?.totalFeedbacks || 1)) * 100) 
              : 0}% of total
          </p>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(rating => {
            const count = summary?.ratingDistribution?.[rating] || 0;
            const percentage = (summary?.totalFeedbacks || 0) > 0 
              ? (count / (summary?.totalFeedbacks || 1)) * 100 
              : 0;
            return (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-20">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{rating}</span>
                  <Star className={`w-4 h-4 ${
                    rating >= 4 ? 'text-emerald-500' : rating === 3 ? 'text-amber-500' : 'text-red-500'
                  }`} />
                </div>
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      rating >= 4 ? 'bg-emerald-500' : rating === 3 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-24 text-right">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent-wise CSAT */}
      {agentMetrics && agentMetrics.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Agent Performance (CSAT)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Agent</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Department</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Feedbacks</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Rating</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">CSAT Score</th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.map((agent, idx) => (
                  <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{agent.agentName}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{agent.department}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.totalFeedbacks}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                      {agent.averageRating.toFixed(2)}/5
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        agent.csatScore >= 80
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : agent.csatScore >= 60
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {agent.csatScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department-wise CSAT */}
      {departmentMetrics && departmentMetrics.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Department Performance (CSAT)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Department</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Feedbacks</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Avg Rating</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">CSAT Score</th>
                </tr>
              </thead>
              <tbody>
                {departmentMetrics.map((dept, idx) => (
                  <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{dept.department}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{dept.totalFeedbacks}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">
                      {dept.averageRating.toFixed(2)}/5
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        dept.csatScore >= 80
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : dept.csatScore >= 60
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {dept.csatScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Feedbacks */}
      {recentFeedbacks && recentFeedbacks.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Feedbacks</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Ticket ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Agent</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Rating</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Comment</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentFeedbacks.map((feedback, idx) => (
                  <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{feedback.ticketId}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate" title={feedback.subject}>
                      {feedback.subject}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{feedback.customerName}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{feedback.agentName}</td>
                    <td className="py-3 px-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= feedback.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {feedback.rating}/5
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 max-w-md truncate" title={feedback.comment || 'No comment'}>
                      {feedback.comment || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                      {new Date(feedback.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Callback Report Component
function CallbackReport({ data, summary }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">No callback data available for the selected date range</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      denied: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      rescheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    };
    return colors[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Distribution */}
      {summary?.statusCounts && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Status Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(summary.statusCounts).map(([status, count]) => (
              <div key={status} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-400 capitalize mb-1">{status}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{count}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {summary.totalCallbacks > 0 
                    ? Math.round((count / summary.totalCallbacks) * 100) 
                    : 0}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Performance */}
      {summary?.agentStats && summary.agentStats.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Agent Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Agent</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Pending</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Completed</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancelled</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Denied</th>
                </tr>
              </thead>
              <tbody>
                {summary.agentStats.map((agent, idx) => (
                  <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{agent.agentName}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.total}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.pending || 0}</td>
                    <td className="py-3 px-4 text-sm text-center text-emerald-600 dark:text-emerald-400 font-medium">{agent.completed || 0}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.cancelled || 0}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700 dark:text-slate-300">{agent.denied || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Callbacks List */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Callback Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Scheduled Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Agent</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.map((callback) => (
                <tr key={callback.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{callback.customerName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{callback.customerEmail}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                    {callback.countryCode} {callback.phoneNumber}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                    {formatDate(callback.scheduledTime)}
                    {callback.rescheduledTime && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Rescheduled: {formatDate(callback.rescheduledTime)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{callback.agentName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{callback.departmentName}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(callback.status)}`}>
                      {callback.status?.charAt(0).toUpperCase() + callback.status?.slice(1) || 'N/A'}
                    </span>
                    {callback.denialReason && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {callback.denialReason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">
                    {callback.notes || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// AI Analysis Modal Component
function SummaryCard({ title, value, subtitle, gradient = 'from-slate-900 to-slate-800' }) {
  return (
    <div className={`rounded-2xl p-4 text-white bg-gradient-to-br ${gradient} shadow-lg`}>
      <p className="text-sm uppercase tracking-wide text-white/70">{title}</p>
      <p className="text-3xl font-semibold mt-2">{value ?? '—'}</p>
      {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
    </div>
  );
}

export default ReportsPageContent;
export { ReportsPageContent }

export const getServerSideProps = withAuth();
;
