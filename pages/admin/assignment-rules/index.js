import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Settings, Plus, Edit2, Trash2, Eye, ArrowUp, ArrowDown, Save, X } from 'lucide-react';

export default function AssignmentRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    ruleType: 'round_robin',
    priority: 0,
    enabled: true,
    description: '',
    config: {}
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/assignment-rules');
      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/admin/assignment-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchRules();
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingRule) return;

    try {
      const res = await fetch(`/api/admin/assignment-rules/${editingRule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchRules();
        setEditingRule(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const res = await fetch(`/api/admin/assignment-rules/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleToggleEnabled = async (rule) => {
    try {
      const res = await fetch(`/api/admin/assignment-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled })
      });

      if (res.ok) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handlePriorityChange = async (rule, direction) => {
    const newPriority = direction === 'up' ? rule.priority - 1 : rule.priority + 1;
    
    // Check bounds
    if (newPriority < 0) return;

    try {
      const res = await fetch(`/api/admin/assignment-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });

      if (res.ok) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handlePreview = async () => {
    try {
      const res = await fetch('/api/admin/assignment-rules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: {
            category: 'WZATCO',
            priority: 'medium'
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewData(data);
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Error previewing assignment:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ruleType: 'round_robin',
      priority: 0,
      enabled: true,
      description: '',
      config: {}
    });
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      priority: rule.priority,
      enabled: rule.enabled,
      description: rule.description || '',
      config: rule.config ? JSON.parse(rule.config) : {}
    });
  };

  const getRuleTypeLabel = (type) => {
    const labels = {
      round_robin: 'Round Robin',
      load_based: 'Load Based',
      department_match: 'Department Match',
      skill_match: 'Skill Match'
    };
    return labels[type] || type;
  };

  const getRuleTypeColor = (type) => {
    const colors = {
      round_robin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      load_based: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      department_match: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      skill_match: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    };
    return colors[type] || 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300';
  };

  return (
    <>
      <Head>
        <title>Assignment Rules - Admin</title>
      </Head>
      <AdminLayout currentPage="Assignment Rules">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Settings className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                Assignment Rules
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Configure automatic ticket assignment rules
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handlePreview}
                variant="outline"
                className="border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingRule(null);
                  setShowCreateModal(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            </div>
          </div>

          {/* Rules List */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-100 dark:border-violet-800/50">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Assignment Rules ({rules.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</div>
              ) : rules.length === 0 ? (
                <div className="p-12 text-center">
                  <Settings className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">No assignment rules configured</p>
                  <Button
                    onClick={() => {
                      resetForm();
                      setShowCreateModal(true);
                    }}
                    className="mt-4 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Rule
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {rules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                        !rule.enabled ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Priority Controls */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handlePriorityChange(rule, 'up')}
                              disabled={index === 0}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                            <div className="text-xs font-bold text-center text-slate-500 dark:text-slate-400 px-1">
                              {rule.priority}
                            </div>
                            <button
                              onClick={() => handlePriorityChange(rule, 'down')}
                              disabled={index === rules.length - 1}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                          </div>

                          {/* Rule Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {rule.name}
                              </h3>
                              <Badge className={getRuleTypeColor(rule.ruleType)}>
                                {getRuleTypeLabel(rule.ruleType)}
                              </Badge>
                              {rule.enabled ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            {rule.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {rule.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleToggleEnabled(rule)}
                            variant="outline"
                            size="sm"
                            className={rule.enabled ? 'border-amber-300 dark:border-amber-700' : 'border-emerald-300 dark:border-emerald-700'}
                          >
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            onClick={() => openEditModal(rule)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(rule.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Create/Edit Modal */}
        {(showCreateModal || editingRule) && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingRule ? 'Edit Rule' : 'Create New Rule'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRule(null);
                      resetForm();
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Rule Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Round Robin - Technical Team"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Rule Type
                  </label>
                  <select
                    value={formData.ruleType}
                    onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2"
                  >
                    <option value="round_robin">Round Robin</option>
                    <option value="load_based">Load Based</option>
                    <option value="department_match">Department Match</option>
                    <option value="skill_match">Skill Match</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Priority (lower = higher priority)
                  </label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Enabled
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2"
                    rows="3"
                    placeholder="Optional description of this rule"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRule(null);
                      resetForm();
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingRule ? handleUpdate : handleCreate}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingRule ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && previewData && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Assignment Preview
                  </h2>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {previewData.firstMatch ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                        Would be assigned to:
                      </p>
                      <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                        {previewData.firstMatch.agent?.name || 'No agent'}
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                        Rule: {previewData.firstMatch.ruleName} ({getRuleTypeLabel(previewData.firstMatch.ruleType)})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        All rule evaluations:
                      </p>
                      <div className="space-y-2">
                        {previewData.results.map((result, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              result.matched
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {result.ruleName}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {getRuleTypeLabel(result.ruleType)} (Priority: {result.priority})
                                </p>
                              </div>
                              {result.matched ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Matched
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                  No Match
                                </Badge>
                              )}
                            </div>
                            {result.agent && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                Agent: {result.agent.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">
                    No matching rule found for this ticket.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

