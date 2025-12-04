import { useState, useEffect } from 'react';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import PageHead from '../../../../components/admin/PageHead';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/button';
import { 
  Plus, 
  Clock, 
  Edit2, 
  Trash2,
  CheckCircle2,
  Circle,
  ArrowRight,
  FileText,
  Eye
} from 'lucide-react';

export default function SLAPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sla/policies');
      const data = await response.json();
      
      if (data.success) {
        setPolicies(data.policies || []);
      } else {
        setError(data.message || 'Failed to fetch policies');
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to load SLA policies');
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const response = await fetch(`/api/admin/sla/policies/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setPolicies(policies.filter(p => p.id !== id));
      } else {
        alert(data.message || 'Failed to delete policy');
      }
    } catch (err) {
      console.error('Error deleting policy:', err);
      alert('Failed to delete policy');
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <>
      <PageHead title="SLA Policies" description="Manage Service Level Agreement policies" />
      
      <AdminLayout currentPage="SLA Management">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">SLA Policies</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Define response and resolution time policies for different priority levels
              </p>
            </div>
            <Link href="/admin/sla/policies/new">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Policy
              </Button>
            </Link>
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
              {!loading && !error && policies.length === 0 && (
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

              {/* Policies Grid */}
              {!loading && !error && policies.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {policies.map((policy) => (
                    <Card key={policy.id} className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-200 hover:shadow-lg">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                              {policy.name}
                            </CardTitle>
                            {policy.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                                {policy.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 ml-2">
                            {policy.isDefault && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                Default
                              </span>
                            )}
                            {policy.isActive ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* SLA Times Grid */}
                        <div className="space-y-3 mb-4">
                          {/* Urgent Priority */}
                          <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                            <span className="text-xs font-semibold text-red-700 dark:text-red-300">Urgent</span>
                            <div className="text-right">
                              <div className="text-xs text-red-600 dark:text-red-400">
                                {formatTime(policy.urgentResponseTime)} / {formatTime(policy.urgentResolutionTime)}
                              </div>
                            </div>
                          </div>

                          {/* High Priority */}
                          <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">High</span>
                            <div className="text-right">
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                {formatTime(policy.highResponseTime)} / {formatTime(policy.highResolutionTime)}
                              </div>
                            </div>
                          </div>

                          {/* Medium Priority */}
                          <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Medium</span>
                            <div className="text-right">
                              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                {formatTime(policy.mediumResponseTime)} / {formatTime(policy.mediumResolutionTime)}
                              </div>
                            </div>
                          </div>

                          {/* Low Priority */}
                          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50">
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300">Low</span>
                            <div className="text-right">
                              <div className="text-xs text-green-600 dark:text-green-400">
                                {formatTime(policy.lowResponseTime)} / {formatTime(policy.lowResolutionTime)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                          <Clock className="w-3 h-3" />
                          <span>{policy.useBusinessHours ? 'Business Hours' : '24/7'}</span>
                          <span>•</span>
                          <span>{policy.timezone || 'UTC'}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/sla/policies/edit/${policy.id}`} className="flex-1">
                            <button className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </Link>
                          <Link href={`/admin/sla/policies/edit/${policy.id}`} className="flex-1">
                            <button className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                          </Link>
                          <Link href={`/admin/sla/workflows/builder?policyId=${policy.id}`} className="flex-1">
                            <button className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                              <ArrowRight className="w-4 h-4" />
                              Workflows
                            </button>
                          </Link>
                          {!policy.isDefault && (
                            <button
                              onClick={() => deletePolicy(policy.id)}
                              className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                              title="Delete Policy"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Banner */}
          {!loading && !error && policies.length > 0 && (
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 mt-4">
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  You have <strong className="text-slate-900 dark:text-slate-100">{policies.length}</strong> SLA {policies.length === 1 ? 'policy' : 'policies'} configured.
                </p>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      About SLA Times
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Times shown are <strong>Response / Resolution</strong> targets. Response time is how quickly an agent must respond to a new ticket. Resolution time is how long until the issue must be fully resolved.
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

