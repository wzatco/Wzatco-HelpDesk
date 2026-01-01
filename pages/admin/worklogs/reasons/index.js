import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import PageHead from '../../../../components/admin/PageHead';
import NotificationToast from '../../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import StyledSelect from '../../../../components/ui/StyledSelect';
import { 
  ClipboardList, 
  Plus, 
  Search as SearchIcon, 
  Edit,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { withAuth } from '../../../../lib/withAuth';

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

function WorklogReasonsPage() {
  const router = useRouter();
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingReason, setEditingReason] = useState(null);
  const [deletingReason, setDeletingReason] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'BREAK',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchReasons();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const fetchReasons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/worklogs/reasons', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setReasons(data.data || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch worklog reasons');
      }
    } catch (error) {
      console.error('Error fetching worklog reasons:', error);
      showNotification('error', 'An error occurred while fetching worklog reasons');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      type: 'BREAK',
      isActive: true
    });
    setEditingReason(null);
    setShowModal(true);
  };

  const handleEdit = (reason) => {
    setFormData({
      name: reason.name,
      type: reason.type,
      isActive: reason.isActive
    });
    setEditingReason(reason);
    setShowModal(true);
  };

  const handleDeleteClick = (reason) => {
    setDeletingReason(reason);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingReason) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/worklogs/reasons/${deletingReason.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', data.message || 'Reason deleted successfully');
        setShowDeleteModal(false);
        setDeletingReason(null);
        fetchReasons();
      } else {
        showNotification('error', data.message || 'Failed to delete reason');
      }
    } catch (error) {
      console.error('Error deleting reason:', error);
      showNotification('error', 'An error occurred while deleting reason');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.name.trim()) {
      showNotification('error', 'Name is required');
      return;
    }

    if (!formData.type) {
      showNotification('error', 'Type is required');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingReason 
        ? `/api/admin/worklogs/reasons/${editingReason.id}`
        : '/api/admin/worklogs/reasons';
      
      const method = editingReason ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', editingReason ? 'Reason updated successfully' : 'Reason created successfully');
        setShowModal(false);
        setEditingReason(null);
        setFormData({
          name: '',
          type: 'BREAK',
          isActive: true
        });
        fetchReasons();
      } else {
        showNotification('error', data.message || 'Failed to save reason');
      }
    } catch (error) {
      console.error('Error saving reason:', error);
      showNotification('error', `An error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (reason) => {
    try {
      const response = await fetch(`/api/admin/worklogs/reasons/${reason.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !reason.isActive })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', `Reason ${!reason.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchReasons();
      } else {
        showNotification('error', data.message || 'Failed to update reason');
      }
    } catch (error) {
      console.error('Error toggling reason status:', error);
      showNotification('error', 'An error occurred while updating reason');
    }
  };

  const filteredReasons = reasons.filter(reason => {
    const matchesSearch = reason.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'BREAK':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'WORK':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'OTHER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const typeOptions = [
    { value: 'BREAK', name: 'Break' },
    { value: 'WORK', name: 'Work' },
    { value: 'OTHER', name: 'Other' }
  ];

  return (
    <>
      <PageHead title="Worklog Reasons" />
      <AdminLayout currentPage="Worklog Reasons">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                Worklog Reasons
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Manage reasons agents can select when stopping their work timer
              </p>
            </div>
            <Button
              onClick={handleAdd}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Reason
            </Button>
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search reasons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Reasons ({filteredReasons.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600 dark:text-violet-400" />
                </div>
              ) : filteredReasons.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  {searchQuery ? 'No reasons found matching your search' : 'No worklog reasons found. Create your first reason to get started.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReasons.map((reason) => (
                        <tr 
                          key={reason.id} 
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {reason.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(reason.type)}`}>
                              {reason.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleActive(reason)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                reason.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {reason.isActive ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  Inactive
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(reason)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                title="Edit reason"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(reason)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete reason"
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

          {/* Create/Edit Modal */}
          <Modal 
            show={showModal} 
            onClose={() => {
              setShowModal(false);
              setEditingReason(null);
              setFormData({ name: '', type: 'BREAK', isActive: true });
            }} 
            title={editingReason ? 'Edit Worklog Reason' : 'Add Worklog Reason'}
            isMounted={isMounted}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Lunch Break, Meeting, End of Shift"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <StyledSelect
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value })}
                  options={typeOptions}
                  placeholder="Select type"
                  required
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active (visible to agents)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingReason(null);
                    setFormData({ name: '', type: 'BREAK', isActive: true });
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingReason ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingReason ? 'Update Reason' : 'Create Reason'
                  )}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal 
            show={showDeleteModal} 
            onClose={() => {
              setShowDeleteModal(false);
              setDeletingReason(null);
            }} 
            title="Delete Worklog Reason"
            isMounted={isMounted}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Are you sure you want to delete this reason?
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {deletingReason && (
                      <>
                        <strong>{deletingReason.name}</strong> will be {deletingReason.isActive ? 'deactivated' : 'permanently deleted'}.
                        {deletingReason.isActive && ' If any worklogs use this reason, it will be deactivated instead of deleted.'}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingReason(null);
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </AdminLayout>
    </>
  );
}

export default WorklogReasonsPage;
export const getServerSideProps = withAuth();

