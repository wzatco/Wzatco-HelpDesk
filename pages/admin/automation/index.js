import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { withAuth } from '../../../lib/withAuth';

export const getServerSideProps = withAuth();
import { 
  Plus, 
  Edit2, 
  Trash2,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Settings
} from 'lucide-react';

function AutomationRules() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/automation');
      const data = await response.json();
      
      if (data.success) {
        setWorkflows(data.workflows || []);
      } else {
        setError(data.message || 'Failed to fetch workflows');
      }
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/automation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setWorkflows(workflows.map(w => 
          w.id === id ? { ...w, isActive: !currentStatus } : w
        ));
      } else {
        alert(data.message || 'Failed to update workflow status');
      }
    } catch (err) {
      console.error('Error toggling workflow status:', err);
      alert('Failed to update workflow status');
    }
  };

  const deleteWorkflow = async (id) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;

    try {
      const response = await fetch(`/api/admin/automation/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setWorkflows(workflows.filter(w => w.id !== id));
      } else {
        alert(data.message || 'Failed to delete workflow');
      }
    } catch (err) {
      console.error('Error deleting workflow:', err);
      alert('Failed to delete workflow');
    }
  };

  const getTriggerLabel = (trigger) => {
    const labels = {
      'TICKET_CREATED': 'Ticket Created',
      'TICKET_UPDATED': 'Ticket Updated',
      'TICKET_ASSIGNED': 'Ticket Assigned',
    };
    return labels[trigger] || trigger;
  };

  return (
    <>
      <PageHead title="Automation Rules" description="Manage automation workflows" />
      
      <AdminLayout currentPage="Automation">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Automation Rules</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Create and manage automated workflows for ticket management
              </p>
            </div>
            <Link href="/admin/automation/builder/new">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create New Rule
              </Button>
            </Link>
          </div>

          {/* Main Content Card */}
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Active Rules ({workflows.filter(w => w.isActive).length} / {workflows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  Loading workflows...
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600 dark:text-red-400">
                  {error}
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    No automation rules yet. Create your first rule to get started.
                  </p>
                  <Link href="/admin/automation/builder/new">
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Rule
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Trigger
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Conditions
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Actions
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflows.map((workflow) => (
                        <tr 
                          key={workflow.id} 
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {workflow.name}
                            </div>
                            {workflow.description && (
                              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {workflow.description}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {getTriggerLabel(workflow.trigger)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {workflow.conditions?.length || 0} condition(s)
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {workflow.actions?.length || 0} action(s)
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => toggleActive(workflow.id, workflow.isActive)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                workflow.isActive
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                              title={workflow.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {workflow.isActive ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Circle className="w-4 h-4" />
                                  Inactive
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/automation/builder/${workflow.id}`}>
                                <button className="p-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Link>
                              <button
                                onClick={() => deleteWorkflow(workflow.id)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

export default AutomationRules;

