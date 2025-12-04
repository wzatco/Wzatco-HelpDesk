import { useState, useEffect } from 'react';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import PageHead from '../../../../components/admin/PageHead';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/button';
import { withAuth } from '../../../../lib/withAuth';
import { 
  Plus, 
  Workflow, 
  Edit2, 
  Trash2,
  CheckCircle,
  Circle,
  FileText,
  GitBranch,
  Play,
  Pause,
  Eye
} from 'lucide-react';

export default function SLAWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sla/workflows');
      const data = await response.json();
      
      if (data.success) {
        setWorkflows(data.workflows || []);
      } else {
        setError(data.message || 'Failed to fetch workflows');
      }
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError('Failed to load SLA workflows');
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkflow = async (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/admin/sla/workflows/${id}`, {
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

  const toggleWorkflowStatus = async (id, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/sla/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentStatus,
          isDraft: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchWorkflows(); // Refresh list
      } else {
        alert(data.message || 'Failed to update workflow');
      }
    } catch (err) {
      console.error('Error updating workflow:', err);
      alert('Failed to update workflow status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNodeCount = (workflowData) => {
    try {
      const data = typeof workflowData === 'string' ? JSON.parse(workflowData) : workflowData;
      return data?.nodes?.length || 0;
    } catch {
      return 0;
    }
  };

  const getConnectionCount = (workflowData) => {
    try {
      const data = typeof workflowData === 'string' ? JSON.parse(workflowData) : workflowData;
      return data?.edges?.length || 0;
    } catch {
      return 0;
    }
  };

  return (
    <>
      <PageHead title="SLA Workflows" description="Manage SLA workflow automations" />
      
      <AdminLayout currentPage="SLA Management">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">SLA Workflows</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Visual workflow automation for SLA management and escalations
              </p>
            </div>
            <Link href="/admin/sla/workflows/builder">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Workflows</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{workflows.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                    <Workflow className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {workflows.filter(w => w.isActive).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Drafts</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {workflows.filter(w => w.isDraft).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Inactive</p>
                    <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                      {workflows.filter(w => !w.isActive && !w.isDraft).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                    <Pause className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Main Content Card */}
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 bg-slate-50 dark:bg-slate-900/50">
              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && workflows.length === 0 && (
                <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                  <CardContent className="p-12">
                    <div className="text-center max-w-md mx-auto">
                      <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Workflow className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Workflows Yet</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Create your first workflow to automate SLA management and escalations
                      </p>
                      <Link href="/admin/sla/workflows/builder">
                        <button className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium mx-auto">
                          <Plus className="w-4 h-4" />
                          Create Your First Workflow
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Workflows List */}
              {!loading && !error && workflows.length > 0 && (
                <div className="space-y-4">
                  {workflows.map((workflow) => (
                    <Card key={workflow.id} className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-200">
                      <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      {/* Left: Workflow Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {workflow.name}
                          </h3>
                          
                          {/* Status Badges */}
                          <div className="flex items-center gap-2">
                            {workflow.isDraft && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                <FileText className="w-3 h-3 mr-1" />
                                Draft
                              </span>
                            )}
                            {workflow.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                <Play className="w-3 h-3 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <Pause className="w-3 h-3 mr-1" />
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {workflow.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            {workflow.description}
                          </p>
                        )}

                        {/* Workflow Stats */}
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <GitBranch className="w-4 h-4" />
                            <span>{getNodeCount(workflow.workflowData)} nodes</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <span>{getConnectionCount(workflow.workflowData)} connections</span>
                          </div>
                          {workflow.policy && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <span className="text-violet-600 dark:text-violet-400 font-medium">
                                  {workflow.policy.name}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 mt-2">
                          <span>Created: {formatDate(workflow.createdAt)}</span>
                          {workflow.publishedAt && (
                            <>
                              <span>•</span>
                              <span>Published: {formatDate(workflow.publishedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/admin/sla/workflows/builder?workflowId=${workflow.id}`}>
                          <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </Link>
                        <Link href={`/admin/sla/workflows/builder?workflowId=${workflow.id}`}>
                          <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </Link>

                        <button
                          onClick={() => toggleWorkflowStatus(workflow.id, workflow.isActive)}
                          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                            workflow.isActive
                              ? 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                              : 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300'
                          }`}
                          title={workflow.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {workflow.isActive ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => deleteWorkflow(workflow.id)}
                          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title="Delete Workflow"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </CardContent>
          </Card>

          {/* Info Banner */}
          {!loading && !error && workflows.length > 0 && (
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 mt-4">
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  You have <strong className="text-slate-900 dark:text-slate-100">{workflows.length}</strong> workflow{workflows.length === 1 ? '' : 's'} configured.
                </p>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Workflow className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      About Workflows
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Workflows automate SLA management, escalations, and notifications. Only <strong>Active</strong> workflows will execute. <strong>Drafts</strong> are saved but not active. Edit any workflow to configure triggers, timers, conditions, and actions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();


