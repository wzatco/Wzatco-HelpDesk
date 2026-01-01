import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import NotificationToast from '../../../components/ui/NotificationToast';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ArrowUp, 
  ArrowDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Users,
  GitBranch,
  Scale,
  Target,
  UserCheck,
  Check,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function AssignmentSettingsPage() {
  const router = useRouter();
  const [rules, setRules] = useState([]);
  const [agents, setAgents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [editingRule, setEditingRule] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, agentsRes, deptsRes] = await Promise.all([
        fetch('/api/admin/assignment-rules'),
        fetch('/api/admin/agents'),
        fetch('/api/admin/departments')
      ]);

      const rulesData = await rulesRes.json();
      const agentsData = await agentsRes.json();
      const deptsData = await deptsRes.json();

      if (rulesData.success) setRules(rulesData.rules || []);
      if (agentsData.success) setAgents(agentsData.agents || []);
      if (deptsData.success) setDepartments(deptsData.departments || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Failed to load assignment settings');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleToggleEnabled = async (ruleId, currentEnabled) => {
    try {
      const response = await fetch(`/api/admin/assignment-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled })
      });

      const data = await response.json();
      if (response.ok) {
        await fetchData();
        showNotification('success', `Rule ${!currentEnabled ? 'enabled' : 'disabled'} successfully`);
      } else {
        showNotification('error', data.message || 'Failed to update rule');
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
      showNotification('error', 'Failed to update rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this assignment rule?')) return;

    try {
      const response = await fetch(`/api/admin/assignment-rules/${ruleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (response.ok) {
        await fetchData();
        showNotification('success', 'Rule deleted successfully');
      } else {
        showNotification('error', data.message || 'Failed to delete rule');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      showNotification('error', 'Failed to delete rule');
    }
  };

  const handlePriorityChange = async (ruleId, direction) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const currentIndex = rules.findIndex(r => r.id === ruleId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= rules.length) return;

    const otherRule = rules[newIndex];
    const newPriority = otherRule.priority;
    const otherNewPriority = rule.priority;

    try {
      await Promise.all([
        fetch(`/api/admin/assignment-rules/${ruleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newPriority })
        }),
        fetch(`/api/admin/assignment-rules/${otherRule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: otherNewPriority })
        })
      ]);

      await fetchData();
      showNotification('success', 'Priority updated successfully');
    } catch (error) {
      console.error('Error updating priority:', error);
      showNotification('error', 'Failed to update priority');
    }
  };

  const getRuleTypeIcon = (type) => {
    switch (type) {
      case 'direct_assignment':
        return <Filter className="w-5 h-5" />;
      case 'round_robin':
        return <GitBranch className="w-5 h-5" />;
      case 'manual':
        return <UserCheck className="w-5 h-5" />;
      case 'load_based':
        return <Scale className="w-5 h-5" />;
      case 'skill_match':
        return <Target className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const getRuleTypeLabel = (type) => {
    switch (type) {
      case 'direct_assignment':
        return 'Direct Assignment (Rules-Based)';
      case 'round_robin':
        return 'Round Robin';
      case 'manual':
        return 'Manual Assignment';
      case 'load_based':
        return 'Load Balancing';
      case 'skill_match':
        return 'Skill-Based Routing';
      default:
        return type;
    }
  };

  const getRuleTypeDescription = (type) => {
    switch (type) {
      case 'direct_assignment':
        return 'If/Then logic - Assign tickets based on specific conditions';
      case 'round_robin':
        return 'Distribute tickets equally in circular order';
      case 'manual':
        return 'Tickets go to unassigned queue for manual selection';
      case 'load_based':
        return 'Assign to agent with lightest current workload';
      case 'skill_match':
        return 'Match tickets to agents based on their skills';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <>
        <PageHead title="Assignment Settings" />
        <AdminLayout currentPage="Settings">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title="Ticket Assignment Settings" description="Configure how tickets are automatically assigned to agents" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Settings className="w-8 h-8 text-violet-600" />
                Assignment Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Configure automatic ticket assignment methods. Rules are evaluated in priority order.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowGuide(true)}
                variant="outline"
                className="border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Guide
              </Button>
              <Button
                onClick={() => {
                  setEditingRule(null);
                  setShowRuleModal(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-600 rounded-lg">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Direct Assignment</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">If/Then rules for specialized routing</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <GitBranch className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Round Robin</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Equal distribution in circular order</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 rounded-lg">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Load Balancing</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Assign to agent with least workload</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rules List */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Rules</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Rules are processed in priority order (1 = highest priority)
              </p>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">No assignment rules configured</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Add a rule to enable automatic ticket assignment
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="group flex items-center gap-4 p-5 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-lg dark:hover:shadow-violet-900/20 transition-all duration-200 bg-gradient-to-r from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-800/50"
                    >
                      {/* Priority Controls */}
                      <div className="flex flex-col items-center gap-1.5 min-w-[50px]">
                        <button
                          onClick={() => handlePriorityChange(rule.id, 'up')}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 dark:border-slate-700 disabled:border-transparent"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </button>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-sm shadow-md">
                          {rule.priority + 1}
                        </div>
                        <button
                          onClick={() => handlePriorityChange(rule.id, 'down')}
                          disabled={index === rules.length - 1}
                          className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 dark:border-slate-700 disabled:border-transparent"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </button>
                      </div>

                      {/* Rule Icon */}
                      <div className="p-3 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 rounded-xl shadow-sm border border-violet-200 dark:border-violet-800">
                        <div className="text-violet-600 dark:text-violet-400">
                          {getRuleTypeIcon(rule.ruleType)}
                        </div>
                      </div>

                      {/* Rule Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{rule.name}</h3>
                          <Badge
                            className={`px-3 py-1 text-xs font-semibold ${
                              rule.enabled 
                                ? 'bg-green-500 hover:bg-green-600 text-white border-green-600' 
                                : 'bg-slate-400 hover:bg-slate-500 text-white border-slate-500'
                            } border shadow-sm`}
                          >
                            {rule.enabled ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1 inline" />
                                Disabled
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                            {getRuleTypeLabel(rule.ruleType)}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                            {rule.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEnabled(rule.id, rule.enabled)}
                          className={`p-2.5 rounded-xl transition-all duration-200 border ${
                            rule.enabled
                              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700'
                              : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                          } shadow-sm hover:shadow-md`}
                          title={rule.enabled ? 'Disable' : 'Enable'}
                        >
                          {rule.enabled ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setShowRuleModal(true);
                          }}
                          className="p-2.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition-all duration-200 border border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700 shadow-sm hover:shadow-md"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 shadow-sm hover:shadow-md"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rule Creation/Edit Modal */}
        {showRuleModal && typeof window !== 'undefined' && createPortal(
          <RuleModal
            rule={editingRule}
            agents={agents}
            departments={departments}
            onClose={() => {
              setShowRuleModal(false);
              setEditingRule(null);
            }}
            onSave={async (ruleData) => {
              try {
                setSaving(true);
                const url = editingRule 
                  ? `/api/admin/assignment-rules/${editingRule.id}`
                  : '/api/admin/assignment-rules';
                const method = editingRule ? 'PATCH' : 'POST';

                const response = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(ruleData)
                });

                const data = await response.json();
                if (response.ok) {
                  await fetchData();
                  setShowRuleModal(false);
                  setEditingRule(null);
                  showNotification('success', `Rule ${editingRule ? 'updated' : 'created'} successfully`);
                } else {
                  showNotification('error', data.message || 'Failed to save rule');
                }
              } catch (error) {
                console.error('Error saving rule:', error);
                showNotification('error', 'Failed to save rule');
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
          />,
          document.body
        )}

        {/* Notification Toast */}
        <NotificationToast 
          notification={notification} 
          onClose={() => setNotification({ type: null, message: '' })} 
        />

        {/* Guide Modal */}
        {showGuide && createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowGuide(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 rounded-lg">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Assignment Settings Guide</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Learn how to configure ticket assignment rules</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGuide(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-violet-600" />
                    1. Direct Assignment (Rules-Based)
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-2">
                    This is the "If/Then" logic engine. Set specific conditions that trigger immediate assignment to a specific agent or team.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Examples:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <li>IF Subject contains "Refund" THEN Assign to "Billing Team"</li>
                      <li>IF Customer is "VIP" THEN Assign to "Manager"</li>
                      <li>IF Priority equals "High" THEN Assign to "Senior Agent"</li>
                    </ul>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Best for:</strong> Specialized teams, VIP support, and critical issues. This is the primary filter that runs before any "fair" distribution happens.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-blue-600" />
                    2. Round Robin (The Equalizer)
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-2">
                    Tickets are distributed in a circular order to available agents, one by one. Agent A → Agent B → Agent C → Agent A...
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">How it works:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      The system tracks the last agent who received a ticket and assigns the next ticket to the following agent in the rotation.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Best for:</strong> Teams where all agents have similar skills and all tickets are of similar difficulty. This is the standard "default" for general support teams.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    3. Manual Assignment (Cherry Picking)
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-2">
                    Tickets land in a central "Unassigned" queue. Agents look at the list and "pick" the tickets they want to work on.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Pros & Cons:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <li><strong>Pros:</strong> Offers autonomy, agents can assess if they're capable before taking tickets</li>
                      <li><strong>Cons:</strong> Often leads to "Cherry Picking" (agents picking easy tickets, leaving hard ones)</li>
                    </ul>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Best for:</strong> Smaller teams (startups) or highly complex technical support where agents need to assess capability before taking tickets.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-orange-600" />
                    4. Load Balancing (Capacity-Based)
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-2">
                    The system checks how many active tickets each agent has. The new ticket goes to the person with the lightest workload.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Example:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Agent A has 5 tickets. Agent B has 2 tickets. → Assign to Agent B.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Best for:</strong> High-volume teams with tickets of varying difficulty. Essential to prevent burnout and ensure no single agent is drowning while others are idle.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    5. Skill-Based Routing
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-2">
                    Agents are tagged with skills (e.g., "Python", "German", "Linux"). Tickets are tagged with requirements. The system matches them.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">How it works:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      When a ticket requires specific skills, the system finds agents who have those skills and assigns the ticket to the best match.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Best for:</strong> Large teams with specialized roles (e.g., L1 vs L2 support, or multi-language support). More complex to set up but standard for large enterprises.
                  </p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Priority System</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-2">
                    Rules are evaluated in priority order (lower numbers = higher priority). The first matching rule assigns the ticket. Use the up/down arrows to reorder rules.
                  </p>
                  <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>Tip:</strong> Place Direct Assignment rules with high priority (0-2) to catch specialized cases first, then use Round Robin or Load Balancing as fallback rules.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                <Button
                  onClick={() => setShowGuide(false)}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </AdminLayout>
    </>
  );
}

// Rule Modal Component
function RuleModal({ rule, agents, departments, onClose, onSave, saving }) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    ruleType: rule?.ruleType || 'direct_assignment',
    priority: rule?.priority ?? 0,
    enabled: rule?.enabled ?? true,
    description: rule?.description || '',
    config: rule?.config || {}
  });

  const [conditions, setConditions] = useState(
    rule?.config?.conditions || [{ field: 'subject', operator: 'contains', value: '', logic: 'AND' }]
  );
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);
  const methodDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(event.target)) {
        setMethodDropdownOpen(false);
      }
    };

    if (methodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [methodDropdownOpen]);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        ruleType: rule.ruleType || 'direct_assignment',
        priority: rule.priority ?? 0,
        enabled: rule.enabled ?? true,
        description: rule.description || '',
        config: rule.config || {}
      });
      setConditions(rule.config?.conditions || [{ field: 'subject', operator: 'contains', value: '', logic: 'AND' }]);
    }
  }, [rule]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let config = {};
    
    // Build config based on rule type
    if (formData.ruleType === 'direct_assignment') {
      config = {
        conditions,
        assignTo: formData.config.assignTo || '',
        assignToType: formData.config.assignToType || 'agent'
      };
    } else if (formData.ruleType === 'skill_match') {
      config = {
        requiredSkills: formData.config.requiredSkills || []
      };
    }

    onSave({
      ...formData,
      config
    });
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'subject', operator: 'contains', value: '', logic: 'AND' }]);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index, field, value) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {rule ? 'Edit Assignment Rule' : 'Create Assignment Rule'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Configure how tickets are automatically assigned
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Rule Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., VIP Customer Routing"
                required
                className="bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Assignment Method <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={methodDropdownRef}>
                <button
                  type="button"
                  onClick={() => setMethodDropdownOpen(prev => !prev)}
                  className="w-full h-11 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all font-semibold flex items-center justify-between gap-2 shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                >
                  <span className="truncate text-left">
                    {formData.ruleType === 'direct_assignment' && 'Direct Assignment (Rules-Based)'}
                    {formData.ruleType === 'round_robin' && 'Round Robin'}
                    {formData.ruleType === 'manual' && 'Manual Assignment'}
                    {formData.ruleType === 'load_based' && 'Load Balancing'}
                    {formData.ruleType === 'skill_match' && 'Skill-Based Routing'}
                  </span>
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {methodDropdownOpen && (
                  <div className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/95 shadow-2xl shadow-violet-200/50 dark:shadow-[0_15px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                    <div
                      onClick={() => {
                        setFormData({ ...formData, ruleType: 'direct_assignment' });
                        setMethodDropdownOpen(false);
                      }}
                      className={`px-4 py-3 cursor-pointer flex items-start justify-between transition-colors ${
                        formData.ruleType === 'direct_assignment'
                          ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200'
                          : 'text-slate-700 dark:text-slate-100 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold leading-tight">Direct Assignment (Rules-Based)</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">If/Then logic for specialized routing</span>
                      </div>
                      {formData.ruleType === 'direct_assignment' && <Check className="w-4 h-4 text-violet-600 dark:text-violet-300 flex-shrink-0" />}
                    </div>
                    <div
                      onClick={() => {
                        setFormData({ ...formData, ruleType: 'round_robin' });
                        setMethodDropdownOpen(false);
                      }}
                      className={`px-4 py-3 cursor-pointer flex items-start justify-between transition-colors ${
                        formData.ruleType === 'round_robin'
                          ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200'
                          : 'text-slate-700 dark:text-slate-100 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold leading-tight">Round Robin</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Equal distribution in circular order</span>
                      </div>
                      {formData.ruleType === 'round_robin' && <Check className="w-4 h-4 text-violet-600 dark:text-violet-300 flex-shrink-0" />}
                    </div>
                    <div
                      onClick={() => {
                        setFormData({ ...formData, ruleType: 'manual' });
                        setMethodDropdownOpen(false);
                      }}
                      className={`px-4 py-3 cursor-pointer flex items-start justify-between transition-colors ${
                        formData.ruleType === 'manual'
                          ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200'
                          : 'text-slate-700 dark:text-slate-100 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold leading-tight">Manual Assignment</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tickets go to unassigned queue</span>
                      </div>
                      {formData.ruleType === 'manual' && <Check className="w-4 h-4 text-violet-600 dark:text-violet-300 flex-shrink-0" />}
                    </div>
                    <div
                      onClick={() => {
                        setFormData({ ...formData, ruleType: 'load_based' });
                        setMethodDropdownOpen(false);
                      }}
                      className={`px-4 py-3 cursor-pointer flex items-start justify-between transition-colors ${
                        formData.ruleType === 'load_based'
                          ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200'
                          : 'text-slate-700 dark:text-slate-100 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold leading-tight">Load Balancing</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assign to agent with least workload</span>
                      </div>
                      {formData.ruleType === 'load_based' && <Check className="w-4 h-4 text-violet-600 dark:text-violet-300 flex-shrink-0" />}
                    </div>
                    <div
                      onClick={() => {
                        setFormData({ ...formData, ruleType: 'skill_match' });
                        setMethodDropdownOpen(false);
                      }}
                      className={`px-4 py-3 cursor-pointer flex items-start justify-between transition-colors ${
                        formData.ruleType === 'skill_match'
                          ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200'
                          : 'text-slate-700 dark:text-slate-100 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold leading-tight">Skill-Based Routing</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Match tickets to agents by skills</span>
                      </div>
                      {formData.ruleType === 'skill_match' && <Check className="w-4 h-4 text-violet-600 dark:text-violet-300 flex-shrink-0" />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Priority
            </label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              min="0"
              className="bg-white dark:bg-slate-900"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Lower numbers = higher priority (0 is highest)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description for this rule"
              className="bg-white dark:bg-slate-900"
            />
          </div>

          {/* Direct Assignment Configuration */}
          {formData.ruleType === 'direct_assignment' && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-white">If/Then Conditions</h4>
              
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      className="col-span-3 h-10 px-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-sm"
                    >
                      <option value="subject">Subject</option>
                      <option value="customerEmail">Customer Email</option>
                      <option value="customerName">Customer Name</option>
                      <option value="priority">Priority</option>
                      <option value="category">Category</option>
                      <option value="departmentId">Department</option>
                      <option value="productModel">Product Model</option>
                    </select>
                    
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      className="col-span-3 h-10 px-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-sm"
                    >
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                      <option value="startsWith">Starts With</option>
                      <option value="endsWith">Ends With</option>
                    </select>
                    
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="col-span-4 h-10 bg-white dark:bg-slate-900"
                    />
                    
                    <select
                      value={condition.logic || 'AND'}
                      onChange={(e) => updateCondition(index, 'logic', e.target.value)}
                      className="col-span-2 h-10 px-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-xs"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                  
                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addCondition}
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </button>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Then Assign To <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={formData.config.assignToType || 'agent'}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, assignToType: e.target.value, assignTo: '' }
                    })}
                    className="h-11 px-4 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl"
                  >
                    <option value="agent">Specific Agent</option>
                    <option value="department">Department</option>
                  </select>
                  
                  {formData.config.assignToType === 'agent' ? (
                    <select
                      value={formData.config.assignTo || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, assignTo: e.target.value }
                      })}
                      className="h-11 px-4 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl"
                      required
                    >
                      <option value="">Select Agent</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={formData.config.assignTo || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, assignTo: e.target.value }
                      })}
                      className="h-11 px-4 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Skill-Based Routing Configuration */}
          {formData.ruleType === 'skill_match' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Required Skills</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Tickets will be assigned to agents who have matching skills
              </p>
              <Input
                value={(formData.config.requiredSkills || []).join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    requiredSkills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }
                })}
                placeholder="e.g., Python, German, Linux (comma-separated)"
                className="bg-white dark:bg-slate-900"
              />
            </div>
          )}

          {/* Enable/Disable Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="enabled" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Enable this rule
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {rule ? 'Update Rule' : 'Create Rule'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssignmentSettingsPage;
export const getServerSideProps = withAuth();

