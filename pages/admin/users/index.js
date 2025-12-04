import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import ThemedSelect from '../../../components/ui/ThemedSelect';
import { Users, Shield, RefreshCw, Search, UserCheck, UserX, Mail, Building2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import usePermissions from '../../../hooks/usePermissions';

export default function UsersPage() {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Permission check - redirect if no access
  useEffect(() => {
    // Wait for both auth and permissions to load before checking
    if (!authLoading && !permissionsLoading) {
      if (!hasPermission('admin.users')) {
        router.push('/admin/login');
      }
    }
  }, [authLoading, permissionsLoading, hasPermission, router]);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [notification, setNotification] = useState({ type: null, message: '' });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to load users' }));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Users fetched:', data);
      
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        console.error('Invalid users data:', data);
        setUsers([]);
        showNotification('error', 'Invalid data format received');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('error', error.message || 'Unable to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 4000);
  };

  const handleRoleChange = async (userId, roleId) => {
    try {
      setUpdatingUserId(userId);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Role updated successfully');
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? { ...user, roleId: data.user.roleId, role: data.user.role }
              : user
          )
        );
      } else {
        showNotification('error', data.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('error', 'Unable to update role');
    } finally {
      setUpdatingUserId('');
    }
  };

  const handleStatusChange = async (userId, status) => {
    try {
      setUpdatingUserId(userId);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `User status changed to ${status}`);
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? { ...user, status: data.user.status }
              : user
          )
        );
      } else {
        showNotification('error', data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('error', 'Unable to update status');
    } finally {
      setUpdatingUserId('');
    }
  };

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    return users.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' ? true : user.status === statusFilter;
      const matchesType = typeFilter === 'all' ? true : user.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [users, searchQuery, statusFilter, typeFilter]);

  return (
    <>
      <PageHead title="Users" description="Manage platform users and their roles" />
      <AdminLayout currentPage="Users">
        <div className="space-y-6">
          <header className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl px-6 py-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Directory
              </p>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">Users</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                All agents, supervisors, leads and admins created in the platform.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchUsers}
                className="h-11 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </header>

          <NotificationToast
            notification={notification}
            onClose={() => setNotification({ type: null, message: '' })}
          />

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-wrap items-center gap-3 shadow-lg">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                Status
              </span>
              <ThemedSelect
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'archived', label: 'Archived' }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                Type
              </span>
              <ThemedSelect
                options={[
                  { value: 'all', label: 'All types' },
                  { value: 'agent', label: 'Agent' },
                  { value: 'supervisor', label: 'Supervisor' },
                  { value: 'team_lead', label: 'Team Lead' },
                  { value: 'admin', label: 'Admin' }
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </div>
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search name, email, or role"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-inner"
              />
            </div>
          </div>

          <Card className="border border-transparent bg-white/85 dark:bg-slate-900/60 rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Users className="w-8 h-8 text-violet-600 animate-pulse" />
                </div>
              ) : !Array.isArray(users) || users.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                    No users found in the system
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                    Create agents first, then their user accounts will be generated automatically
                  </p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                  No users match the current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/60 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">
                          Linked Agent
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">
                          Change Status
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">
                          Assign Role
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/70 dark:bg-slate-900/40 divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <div className="text-base font-semibold text-slate-900 dark:text-white">
                                {user.name || 'Unknown User'}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Mail className="w-4 h-4" />
                                {user.email || 'No email'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {user.role ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-200 text-xs font-semibold">
                                {user.role.title}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300 capitalize">
                            {user.type || 'agent'}
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                            {user.agent ? (
                              <div className="space-y-1">
                                <div className="font-medium">{user.agent.slug}</div>
                                {user.agent.department && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Building2 className="w-3 h-3" />
                                    {user.agent.department.name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No agent profile</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <ThemedSelect
                              options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'archived', label: 'Archived' }
                              ]}
                              value={user.status || 'active'}
                              onChange={(value) => handleStatusChange(user.id, value)}
                              placeholder="Set status"
                              className="min-w-[180px]"
                              disabled={updatingUserId === user.id}
                            />
                          </td>
                          <td className="px-6 py-5 text-right">
                            <ThemedSelect
                              options={[
                                { value: '', label: 'No role' },
                                ...roles.map((role) => ({
                                  value: role.id,
                                  label: role.title
                                }))
                              ]}
                              value={user.roleId || ''}
                              onChange={(value) => handleRoleChange(user.id, value || null)}
                              placeholder="Assign role"
                              className="min-w-[220px]"
                              disabled={updatingUserId === user.id}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {!loading && users.length > 0 && (
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
