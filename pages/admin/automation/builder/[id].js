import { useState, useEffect } from 'react';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import PageHead from '../../../../components/admin/PageHead';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { ArrowLeft, Save, Plus, Trash2, X } from 'lucide-react';
import { withAuth } from '../../../../lib/withAuth';
import { FIELD_REGISTRY } from '../../../../lib/automation/fieldRegistry';
import { TICKET_STATUSES, TICKET_PRIORITIES, STATUS_LABELS, PRIORITY_LABELS } from '../../../../lib/automation/constants';

export const getServerSideProps = withAuth();

function AutomationBuilder() {
  const router = useRouter();
  const { id } = router.query;
  const isNew = id === 'new';

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [agents, setAgents] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: 'TICKET_CREATED',
    isActive: true,
    conditions: [],
    actions: [],
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchWorkflow();
    }
    fetchAgents();
    fetchDepartments();
  }, [id, isNew]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/automation/${id}`);
      const data = await response.json();
      
      if (data.success && data.workflow) {
        const workflow = data.workflow;
        setFormData({
          name: workflow.name || '',
          description: workflow.description || '',
          trigger: workflow.trigger || 'TICKET_CREATED',
          isActive: workflow.isActive !== undefined ? workflow.isActive : true,
          conditions: (workflow.conditions || []).map(cond => ({
            ...cond,
            operator: cond.operator?.toLowerCase() || 'equals'
          })),
          actions: workflow.actions || [],
        });
      }
    } catch (error) {
      console.error('Error fetching workflow:', error);
      alert('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    if (formData.actions.length === 0) {
      alert('At least one action is required');
      return;
    }

    setSaving(true);

    try {
      const url = isNew 
        ? '/api/admin/automation'
        : `/api/admin/automation/${id}`;
      
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/automation');
      } else {
        alert(data.message || 'Failed to save workflow');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: 'status', operator: 'equals', value: '' },
      ],
    }));
  };

  const removeCondition = (index) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((cond, i) =>
        i === index ? { ...cond, [field]: value } : cond
      ),
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        { actionType: 'ASSIGN_AGENT', payload: '{}', order: prev.actions.length },
      ],
    }));
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index).map((action, i) => ({
        ...action,
        order: i,
      })),
    }));
  };

  const updateAction = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => {
        if (i === index) {
          if (field === 'payload') {
            return { ...action, payload: value };
          }
          return { ...action, [field]: value };
        }
        return action;
      }),
    }));
  };

  const getActionPayloadInput = (action, index) => {
    switch (action.actionType) {
      case 'ASSIGN_AGENT':
        return (
          <select
            value={(() => {
              try {
                const payload = JSON.parse(action.payload || '{}');
                return payload.agentId || '';
              } catch {
                return '';
              }
            })()}
            onChange={(e) => {
              const payload = JSON.stringify({ agentId: e.target.value });
              updateAction(index, 'payload', payload);
            }}
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">Select Agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        );

      case 'UPDATE_STATUS':
        return (
          <select
            value={(() => {
              try {
                const payload = JSON.parse(action.payload || '{}');
                return payload.status || '';
              } catch {
                return '';
              }
            })()}
            onChange={(e) => {
              const payload = JSON.stringify({ status: e.target.value });
              updateAction(index, 'payload', payload);
            }}
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">Select Status</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        );

      case 'SET_PRIORITY':
        return (
          <select
            value={(() => {
              try {
                const payload = JSON.parse(action.payload || '{}');
                return payload.priority || '';
              } catch {
                return '';
              }
            })()}
            onChange={(e) => {
              const payload = JSON.stringify({ priority: e.target.value });
              updateAction(index, 'payload', payload);
            }}
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">Select Priority</option>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        );

      case 'SEND_NOTIFICATION':
        return (
          <div className="flex-1 space-y-2">
            <Input
              type="text"
              placeholder="User ID"
              value={(() => {
                try {
                  const payload = JSON.parse(action.payload || '{}');
                  return payload.userId || '';
                } catch {
                  return '';
                }
              })()}
              onChange={(e) => {
                try {
                  const payload = JSON.parse(action.payload || '{}');
                  payload.userId = e.target.value;
                  updateAction(index, 'payload', JSON.stringify(payload));
                } catch {
                  updateAction(index, 'payload', JSON.stringify({ userId: e.target.value }));
                }
              }}
              className="mb-2"
            />
            <Input
              type="text"
              placeholder="Title"
              value={(() => {
                try {
                  const payload = JSON.parse(action.payload || '{}');
                  return payload.title || '';
                } catch {
                  return '';
                }
              })()}
              onChange={(e) => {
                try {
                  const payload = JSON.parse(action.payload || '{}');
                  payload.title = e.target.value;
                  updateAction(index, 'payload', JSON.stringify(payload));
                } catch {
                  updateAction(index, 'payload', JSON.stringify({ title: e.target.value }));
                }
              }}
              className="mb-2"
            />
            <Input
              type="text"
              placeholder="Message"
              value={(() => {
                try {
                  const payload = JSON.parse(action.payload || '{}');
                  return payload.message || '';
                } catch {
                  return '';
                }
              })()}
              onChange={(e) => {
                try {
                  const payload = JSON.parse(action.payload || '{}');
                  payload.message = e.target.value;
                  updateAction(index, 'payload', JSON.stringify(payload));
                } catch {
                  updateAction(index, 'payload', JSON.stringify({ message: e.target.value }));
                }
              }}
            />
          </div>
        );

      default:
        return (
          <Input
            type="text"
            placeholder='JSON Payload (e.g., {"key": "value"})'
            value={action.payload || '{}'}
            onChange={(e) => updateAction(index, 'payload', e.target.value)}
            className="flex-1"
          />
        );
    }
  };

  if (loading) {
    return (
      <>
        <PageHead title={isNew ? 'Create Automation Rule' : 'Edit Automation Rule'} />
        <AdminLayout currentPage="Automation">
          <div className="text-center py-12 text-slate-600 dark:text-slate-400">
            Loading...
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title={isNew ? 'Create Automation Rule' : 'Edit Automation Rule'} />
      
      <AdminLayout currentPage="Automation">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/automation">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {isNew ? 'Create Automation Rule' : 'Edit Automation Rule'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Define conditions and actions for automated ticket management
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Main Form Card */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-100">Workflow Details</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Basic information about your automation rule
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Label htmlFor="isActive" className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Active
                      </span>
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                    Workflow Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Auto-assign High Priority Tickets"
                    className="mt-1"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">
                    Description
                  </Label>
                  <Input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    className="mt-1"
                  />
                </div>

                {/* Trigger */}
                <div>
                  <Label htmlFor="trigger" className="text-slate-700 dark:text-slate-300">
                    Trigger *
                  </Label>
                  <select
                    id="trigger"
                    value={formData.trigger}
                    onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="TICKET_CREATED">Ticket Created</option>
                    <option value="TICKET_UPDATED">Ticket Updated</option>
                    <option value="TICKET_ASSIGNED">Ticket Assigned</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Conditions Section */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 mt-6">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Conditions (IF)</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  All conditions must be met for the workflow to execute
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.conditions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No conditions. Workflow will execute for all tickets matching the trigger.
                  </div>
                ) : (
                  formData.conditions.map((condition, index) => {
                    const fieldDef = getFieldDef(condition.field);
                    const availableOperators = fieldDef?.operators || ['equals', 'not_equals'];
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <select
                          value={condition.field}
                          onChange={(e) => {
                            // Reset operator and value when field changes
                            const newFieldDef = getFieldDef(e.target.value);
                            updateCondition(index, 'field', e.target.value);
                            if (newFieldDef && !newFieldDef.operators.includes(condition.operator)) {
                              updateCondition(index, 'operator', newFieldDef.operators[0] || 'equals');
                            }
                            updateCondition(index, 'value', '');
                          }}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          {Object.entries(FIELD_REGISTRY).map(([key, def]) => (
                            <option key={key} value={key}>
                              {def.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          {availableOperators.map((op) => (
                            <option key={op} value={op}>
                              {op.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </option>
                          ))}
                        </select>

                        {renderConditionValueInput(condition, index)}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addCondition}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Condition
                </Button>
              </CardContent>
            </Card>

            {/* Actions Section */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 mt-6">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Actions (THEN) *</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Actions to execute when conditions are met (at least one required)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.actions.map((action, index) => (
                  <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={action.actionType}
                        onChange={(e) => updateAction(index, 'actionType', e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="ASSIGN_AGENT">Assign Agent</option>
                        <option value="UPDATE_STATUS">Update Status</option>
                        <option value="SET_PRIORITY">Set Priority</option>
                        <option value="SEND_NOTIFICATION">Send Notification</option>
                        <option value="UPDATE_FIELD">Update Field</option>
                      </select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      {getActionPayloadInput(action, index)}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addAction}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Action
                </Button>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-4 mt-6">
              <Link href="/admin/automation">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Workflow'}
              </Button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  );
}

export default AutomationBuilder;

