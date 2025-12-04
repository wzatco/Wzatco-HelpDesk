import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Download,
  Maximize2,
  X,
  CheckCircle2,
  XCircle,
  Save,
  Loader2
} from 'lucide-react';

const Modal = ({ show, onClose, title, children, isMounted }) => {
  if (!isMounted || !show || typeof window === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    displayAs: '',
    hasSuperPower: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [bodyScrollLocked, setBodyScrollLocked] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (res.ok) {
        setRoles(data.roles || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch roles');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      showNotification('error', 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleAdd = () => {
    setFormData({ title: '', displayAs: '', hasSuperPower: false });
    setShowAddModal(true);
    lockBodyScroll();
  };

  const handleEdit = (role) => {
    setSelectedRole(role);
    setFormData({
      title: role.title,
      displayAs: role.displayAs || '',
      hasSuperPower: role.hasSuperPower || false
    });
    setShowEditModal(true);
    lockBodyScroll();
  };

  const handleDelete = (role) => {
    setSelectedRole(role);
    setShowDeleteModal(true);
    lockBodyScroll();
  };

  const lockBodyScroll = () => {
    if (typeof window !== 'undefined') {
      setSavedScrollPosition(window.scrollY);
      setBodyScrollLocked(true);
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollPosition}px`;
      document.body.style.width = '100%';
    }
  };

  const unlockBodyScroll = () => {
    if (typeof window !== 'undefined') {
      setBodyScrollLocked(false);
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, savedScrollPosition);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = selectedRole 
        ? `/api/admin/roles/${selectedRole.id}`
        : '/api/admin/roles';
      const method = selectedRole ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        showNotification('success', selectedRole ? 'Role updated successfully' : 'Role created successfully');
        setShowAddModal(false);
        setShowEditModal(false);
        unlockBodyScroll();
        setSelectedRole(null);
        setFormData({ title: '', displayAs: '', hasSuperPower: false });
        fetchRoles();
      } else {
        showNotification('error', data.message || 'Failed to save role');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      showNotification('error', 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRole) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        showNotification('success', 'Role deleted successfully');
        setShowDeleteModal(false);
        unlockBodyScroll();
        setSelectedRole(null);
        fetchRoles();
      } else {
        showNotification('error', data.message || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('error', 'Failed to delete role');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.displayAs && role.displayAs.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const roleStats = [
    {
      label: 'Total Roles',
      value: roles.length,
      subtitle: 'Active blueprints',
      gradient: 'from-violet-600 to-purple-600'
    },
    {
      label: 'Super Roles',
      value: roles.filter(r => r.hasSuperPower).length,
      subtitle: 'Full platform access',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      label: 'Ticket Badges',
      value: roles.filter(r => r.displayAs).length,
      subtitle: 'Custom display labels',
      gradient: 'from-indigo-500 to-cyan-500'
    }
  ];

  return (
    <>
      <PageHead title="Role List" description="Manage user roles and permissions" />
      <AdminLayout currentPage="Role List">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl px-6 py-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Access Control</p>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">Role List</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Manage role hierarchy, badges and superpowers.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={fetchRoles}
                variant="outline"
                className="h-11 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={handleAdd}
                className="h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search roles, display names, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-inner focus:ring-violet-500"
            />
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {roleStats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-3xl p-5 text-white bg-gradient-to-br ${stat.gradient} shadow-lg shadow-violet-500/30`}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">{stat.label}</p>
                <p className="text-4xl font-semibold mt-3">{stat.value}</p>
                <p className="text-sm text-white/80 mt-1">{stat.subtitle}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center">
                <p className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">No roles found</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? 'Try another search query or clear the filters.'
                    : 'Create your first role to start organizing permissions.'}
                </p>
              </div>
            ) : (
              filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-5 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.45)] backdrop-blur"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold flex items-center justify-center shadow-lg shadow-violet-500/40">
                        {role.title?.charAt(0)?.toUpperCase() || 'R'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{role.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">ID: {role.id.slice(0, 10)}...</p>
                      </div>
                    </div>
                    {role.hasSuperPower && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-xs font-semibold">
                        Super Admin
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Ticket Badge</span>
                      {role.displayAs ? (
                        <span className="px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-200 text-xs font-semibold">
                          {role.displayAs}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Agents</span>
                      <span className="text-sm font-medium">{role._count?.agents ?? 0}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <Button
                      onClick={() => handleEdit(role)}
                      className="flex-1 h-10 rounded-2xl bg-slate-900/90 dark:bg-slate-800 text-white hover:bg-slate-900"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Role
                    </Button>
                    <Button
                      onClick={() => handleDelete(role)}
                      variant="outline"
                      className="h-10 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-200 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        <Modal
          show={showAddModal || showEditModal}
          isMounted={isMounted}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedRole(null);
            setFormData({ title: '', displayAs: '', hasSuperPower: false });
            unlockBodyScroll();
          }}
          title={selectedRole ? 'Edit Role' : 'Add New Role'}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Shield className="w-4 h-4 inline mr-2" />
                Title *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g., Supervisor, Agent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                On Ticket Display As
              </label>
              <Input
                type="text"
                value={formData.displayAs}
                onChange={(e) => setFormData({ ...formData, displayAs: e.target.value })}
                className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g., Support, Service"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                How this role appears on tickets (optional)
              </p>
            </div>

            <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-white/10 shadow-inner">
              <div>
                <label className="block text-sm font-semibold text-white mb-1">
                  Has Super Power
                </label>
                <p className="text-xs text-slate-300">
                  Allow this role to bypass every permission layer and control system-wide settings.
                </p>
              </div>
              <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                <span className={`text-xs font-semibold ${formData.hasSuperPower ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {formData.hasSuperPower ? 'ENABLED' : 'DISABLED'}
                </span>
                <div className={`relative w-14 h-7 rounded-full transition-colors ${formData.hasSuperPower ? 'bg-emerald-400/70' : 'bg-white/20'}`}>
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white shadow-lg transition-all ${
                      formData.hasSuperPower ? 'right-1' : 'left-1'
                    }`}
                  ></div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hasSuperPower}
                  onChange={(e) => setFormData({ ...formData, hasSuperPower: e.target.checked })}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {selectedRole ? 'Update Role' : 'Create Role'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedRole(null);
                  setFormData({ title: '', displayAs: '', hasSuperPower: false });
                  unlockBodyScroll();
                }}
                variant="outline"
                className="h-11 rounded-xl border-violet-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          show={showDeleteModal}
          isMounted={isMounted}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRole(null);
            unlockBodyScroll();
          }}
          title="Delete Role"
        >
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete the role <strong className="text-slate-900 dark:text-white">{selectedRole?.title}</strong>?
            </p>
            {selectedRole?._count?.agents > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-800 dark:text-yellow-200 text-sm">
                This role is assigned to {selectedRole._count.agents} agent(s). You cannot delete it until all agents are reassigned.
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={confirmDelete}
                disabled={submitting || (selectedRole?._count?.agents > 0)}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRole(null);
                  unlockBodyScroll();
                }}
                variant="outline"
                className="h-11 rounded-xl border-violet-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </AdminLayout>
    </>
  );
}

