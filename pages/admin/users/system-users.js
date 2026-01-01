// System Users Page - Shows list of Admins and Agents
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { 
  Users, 
  Search as SearchIcon,
  Shield,
  User,
  Mail,
  Phone,
  Building2,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function SystemUsersPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, admin, agent
  const [notification, setNotification] = useState({ type: null, message: '' });

  useEffect(() => {
    fetchSystemUsers();
  }, []);

  const fetchSystemUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users/system-users');
      const data = await response.json();

      if (response.ok && data.success) {
        setAdmins(data.admins || []);
        setAgents(data.agents || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch system users');
      }
    } catch (error) {
      console.error('Error fetching system users:', error);
      showNotification('error', 'An error occurred while fetching system users');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  // Filter users based on search and type
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = !searchQuery || 
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (admin.email && admin.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = !searchQuery || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.email && agent.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const allUsers = [
    ...filteredAdmins.map(u => ({ ...u, type: 'admin' })),
    ...filteredAgents.map(u => ({ ...u, type: 'agent' }))
  ].filter(user => {
    if (typeFilter === 'all') return true;
    return user.type === typeFilter;
  });

  return (
    <AdminLayout>
      <Head>
        <title>System Users - Admin Panel</title>
      </Head>

      {notification.type && (
        <NotificationToast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ type: null, message: '' })}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              System Users
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage admins and agents
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  typeFilter === 'admin'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admins ({filteredAdmins.length})
              </button>
              <button
                onClick={() => setTypeFilter('agent')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  typeFilter === 'agent'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <User className="w-4 h-4" />
                Agents ({filteredAgents.length})
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : allUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No users found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery ? 'Try adjusting your search query' : 'No system users available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {user.name}
                      </h3>
                      <Badge className={user.type === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}>
                        {user.type === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            Agent
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {user.role || 'No role assigned'}
                    </p>
                    {user.department && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Building2 className="w-3 h-3" />
                        {user.department}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {user.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Phone className="w-4 h-4" />
                      {user.phone}
                    </div>
                  )}
                </div>

                {user.type === 'agent' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        // Use slug if available (preferred), otherwise use ID
                        // The API handles both slug and ID lookups
                        const identifier = user.slug || user.id;
                        console.log('🚀 Navigating to agent profile:', { 
                          slug: user.slug, 
                          id: user.id, 
                          userId: user.userId,
                          using: identifier 
                        });
                        router.push(`/admin/agents/${identifier}`);
                      }}
                      className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium flex items-center gap-1 w-full text-left"
                    >
                      View Profile
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default SystemUsersPage;

export const getServerSideProps = withAuth();

