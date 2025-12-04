import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import {
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Save,
  Loader2,
  RefreshCw,
  Settings,
  AlertCircle,
  Download
} from 'lucide-react';

// Simple toggle switch component
const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${disabled 
          ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50' 
          : checked 
            ? 'bg-emerald-500 dark:bg-emerald-600' 
            : 'bg-slate-300 dark:bg-slate-700'
        }
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};

export default function RoleAccessPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [modifiedRoles, setModifiedRoles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  useEffect(() => {
    fetchAllData();
  }, []);

  // Group pages by category
  const pageCategories = pages.reduce((acc, page) => {
    const category = page.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(page);
    return acc;
  }, {});

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const rolesRes = await fetch('/api/admin/roles');
      const rolesData = await rolesRes.json();
      
      if (!rolesRes.ok) {
        throw new Error('Failed to fetch roles');
      }

      const fetchedRoles = rolesData.roles || [];
      setRoles(fetchedRoles);

      const permissionsData = {};
      let allPages = [];

      for (const role of fetchedRoles) {
        try {
          const permRes = await fetch(`/api/admin/roles/${role.id}/permissions`);
          const permData = await permRes.json();
          
          if (permRes.ok) {
            if (allPages.length === 0) {
              allPages = permData.pages || [];
            }

            const rolePerms = {};
            permData.pages?.forEach(page => {
              rolePerms[page.pageName] = page.hasAccess;
            });
            permissionsData[role.id] = rolePerms;
          }
        } catch (error) {
          console.error(`Error fetching permissions for role ${role.id}:`, error);
        }
      }

      setPages(allPages);
      setPermissions(permissionsData);

      // Expand all categories by default
      setExpandedCategories(new Set(Object.keys(pageCategories)));

    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Failed to load role access data');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const togglePermission = (roleId, pageName) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.hasSuperPower) {
      showNotification('info', 'Super Admin role has all permissions by default');
      return;
    }

    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [pageName]: !prev[roleId]?.[pageName]
      }
    }));

    setModifiedRoles(prev => new Set([...prev, roleId]));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleSaveAll = async () => {
    if (modifiedRoles.size === 0) {
      showNotification('info', 'No changes to save');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const roleId of Array.from(modifiedRoles)) {
        try {
          const permissionsArray = Object.entries(permissions[roleId] || {}).map(([pageName, hasAccess]) => ({
            pageName,
            hasAccess
          }));

          const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions: permissionsArray })
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error saving permissions for role ${roleId}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        showNotification('success', `Permissions updated successfully for ${successCount} role(s)`);
        setModifiedRoles(new Set());
      } else if (successCount > 0) {
        showNotification('warning', `Updated ${successCount} role(s), but ${errorCount} failed`);
      } else {
        showNotification('error', 'Failed to update permissions');
      }

      await fetchAllData();
    } catch (error) {
      console.error('Error saving permissions:', error);
      showNotification('error', 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };


  const exportPermissions = () => {
    const data = {
      roles,
      permissions,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `role-permissions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('success', 'Permissions exported successfully');
  };

  return (
    <>
      <PageHead title="Role Access Control" description="Manage role permissions and access rights" />
      <AdminLayout currentPage="Role Access">
        <div className="space-y-6" style={{ paddingBottom: modifiedRoles.size > 0 ? '120px' : '0' }}>
          {/* Header Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl px-6 py-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <Shield className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                  Role Access Matrix
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1.5">
                  Control which pages each role can access
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={fetchAllData}
                  variant="outline"
                  className="h-11 rounded-2xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                
                <Button
                  onClick={exportPermissions}
                  variant="outline"
                  className="h-11 rounded-2xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/roles')}
                  className="h-11 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Roles
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                />
              </div>
            </div>
          </div>

          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Permissions Matrix Table */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-violet-600 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">Loading permissions...</p>
                </div>
              ) : roles.length === 0 ? (
                <div className="py-20 text-center text-slate-500 dark:text-slate-400">
                  <Shield className="w-20 h-20 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                  <p className="text-lg font-medium">No roles found</p>
                  <p className="text-sm mt-2 mb-6">Create roles first to manage permissions</p>
                  <Button
                    onClick={() => router.push('/admin/roles')}
                    className="rounded-2xl bg-violet-600 hover:bg-violet-700"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Create First Role
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/70 border-b-2 border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 min-w-[300px]">
                          Page / Module
                        </th>
                        {roles.map(role => (
                          <th key={role.id} className="px-6 py-4 text-center font-semibold min-w-[150px]">
                            <div className="flex flex-col items-center gap-2">
                              <div className={`
                                px-3 py-1.5 rounded-xl font-semibold text-sm
                                ${role.hasSuperPower 
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' 
                                  : 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                                }
                              `}>
                                {role.title}
                              </div>
                              {role.hasSuperPower && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                                  Super Admin
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {Object.entries(pageCategories).map(([category, categoryPages]) => {
                        const isExpanded = expandedCategories.has(category);
                        const visiblePages = categoryPages.filter(page => 
                          page.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          page.pageName?.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        if (visiblePages.length === 0 && searchQuery) return null;

                        return (
                          <React.Fragment key={category}>
                            {/* Category Header Row */}
                            <tr className="bg-slate-100 dark:bg-slate-800/50">
                              <td colSpan={roles.length + 1} className="px-6 py-3">
                                <button
                                  onClick={() => toggleCategory(category)}
                                  className="flex items-center gap-3 w-full hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-slate-500" />
                                  )}
                                  <span className="font-semibold text-lg text-slate-900 dark:text-white">
                                    {category}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                                    {categoryPages.length} pages
                                  </span>
                                </button>
                              </td>
                            </tr>

                            {/* Category Pages */}
                            {isExpanded && visiblePages.map(page => (
                              <tr 
                                key={page.pageName}
                                className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                      {page.label}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {page.pageName}
                                    </div>
                                  </div>
                                </td>
                                {roles.map(role => {
                                  const hasAccess = permissions[role.id]?.[page.pageName] || false;
                                  
                                  return (
                                    <td key={role.id} className="px-6 py-4 text-center">
                                      {role.hasSuperPower ? (
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                          <Check className="w-4 h-4" />
                                          <span className="text-xs font-medium">Always</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <ToggleSwitch
                                            checked={hasAccess}
                                            onChange={() => togglePermission(role.id, page.pageName)}
                                          />
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </AdminLayout>

      {/* Floating Save Changes Bar - Fixed to viewport bottom, always visible */}
      {modifiedRoles.size > 0 && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[9999]"
          style={{ position: 'fixed' }}
        >
          <div className="bg-gradient-to-t from-slate-900/80 via-slate-900/50 to-transparent dark:from-slate-950/90 dark:via-slate-950/50 pt-8 pb-6 px-6 backdrop-blur-md">
            <div className="max-w-7xl mx-auto">
              <Card className="border-2 border-violet-500 dark:border-violet-400 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <AlertCircle className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-lg">
                          {modifiedRoles.size} role{modifiedRoles.size !== 1 ? 's' : ''} modified
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Don't forget to save your changes
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          if (confirm('Discard all unsaved changes?')) {
                            fetchAllData();
                            setModifiedRoles(new Set());
                          }
                        }}
                        variant="outline"
                        className="h-12 rounded-2xl px-6 text-base font-semibold border-2"
                      >
                        <X className="w-5 h-5 mr-2" />
                        Discard
                      </Button>
                      <Button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold px-8 text-base shadow-xl shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Save All Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

