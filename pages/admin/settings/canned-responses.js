import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Settings, Plus, Search as SearchIcon, Edit, Trash2, X, Loader2, Globe, Lock, FileText } from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';
import StyledSelect from '../../../components/ui/StyledSelect';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

// Modal component
const Modal = ({ show, onClose, title, children, isMounted }) => {
  if (!isMounted || !show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

function CannedResponsesPage() {
  const router = useRouter();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [responseToDelete, setResponseToDelete] = useState(null);
  const [formData, setFormData] = useState({
    shortcut: '',
    content: '',
    category: '',
    isPublic: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await fetch(`/api/admin/canned-responses?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setResponses(data.data || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch responses');
      }
    } catch (error) {
      showNotification('error', 'Error fetching canned responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchResponses();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, 3000);
  };

  const handleAdd = () => {
    setEditingResponse(null);
    setFormData({
      shortcut: '',
      content: '',
      category: '',
      isPublic: false
    });
    setShowModal(true);
  };

  const handleEdit = (response) => {
    setEditingResponse(response);
    setFormData({
      shortcut: response.shortcut,
      content: response.content,
      category: response.category || '',
      isPublic: response.isPublic
    });
    setShowModal(true);
  };

  const handleDelete = (response) => {
    setResponseToDelete(response);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingResponse
        ? `/api/admin/canned-responses/${editingResponse.id}`
        : '/api/admin/canned-responses';
      
      const method = editingResponse ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', editingResponse ? 'Response updated successfully' : 'Response created successfully');
        setShowModal(false);
        fetchResponses();
      } else {
        showNotification('error', data.message || 'Operation failed');
      }
    } catch (error) {
      showNotification('error', 'Error saving response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!responseToDelete) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/canned-responses/${responseToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Response deleted successfully');
        setShowDeleteModal(false);
        setResponseToDelete(null);
        fetchResponses();
      } else {
        showNotification('error', data.message || 'Failed to delete response');
      }
    } catch (error) {
      showNotification('error', 'Error deleting response');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredResponses = responses.filter(response => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      response.shortcut.toLowerCase().includes(query) ||
      response.content.toLowerCase().includes(query) ||
      (response.category && response.category.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <PageHead title="Canned Responses" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <FileText className="w-8 h-8 text-violet-600" />
                Canned Responses
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Create shortcuts (macros) for quick replies. Type <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-sm">/shortcut</code> in chat to use them.
              </p>
            </div>
            <Button
              onClick={handleAdd}
              className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Response
            </Button>
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by shortcut, content, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Shortcut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Content Preview
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Visibility
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredResponses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                          {searchQuery ? 'No responses found' : 'No canned responses yet. Create your first one!'}
                        </td>
                      </tr>
                    ) : (
                      filteredResponses.map((response) => (
                        <tr key={response.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-sm font-medium">
                              /{response.shortcut}
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 max-w-md">
                              {response.content}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {response.category ? (
                              <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {response.category}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {response.isPublic ? (
                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1 w-fit">
                                <Globe className="w-3 h-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 w-fit">
                                <Lock className="w-3 h-3" />
                                Private
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(response)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(response)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create/Edit Modal */}
          <Modal show={showModal} onClose={() => setShowModal(false)} title={editingResponse ? 'Edit Canned Response' : 'Create Canned Response'} isMounted={isMounted}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Shortcut <span className="text-red-500">*</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">(e.g., "wifi", "reset", "refund")</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">/</span>
                  <Input
                    type="text"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase() })}
                    placeholder="wifi"
                    required
                    className="flex-1"
                    disabled={editingResponse}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Type <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">/{formData.shortcut || 'shortcut'}</code> in chat to use this response
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the full message content..."
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category <span className="text-xs text-slate-500 dark:text-slate-400">(Optional)</span>
                </label>
                <Input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Technical, Billing, General"
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="form-checkbox h-5 w-5 text-violet-600 rounded focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600"
                />
                <label htmlFor="isPublic" className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Make this response public (visible to all agents/admins)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={() => setShowModal(false)} disabled={submitting} variant="outline">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingResponse ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingResponse ? 'Update Response' : 'Create Response'
                  )}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Canned Response" isMounted={isMounted}>
            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                Are you sure you want to delete the response <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">/{responseToDelete?.shortcut}</code>? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={() => setShowDeleteModal(false)} disabled={submitting} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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

export default CannedResponsesPage;
export const getServerSideProps = withAuth();

