import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { withAuth } from '../../../lib/withAuth';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

export default function TicketTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    message: '',
    category: '',
    priority: 'low',
    productId: '',
    departmentId: '',
    tags: [],
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchTemplates();
    fetchProducts();
    fetchDepartments();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ticket-templates');
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showNotification('error', 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?includeInactive=false');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/admin/departments');
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/ticket-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Template created successfully');
        setShowAddModal(false);
        resetForm();
        fetchTemplates();
      } else {
        showNotification('error', data.message || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      showNotification('error', 'An error occurred while creating template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/ticket-templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Template updated successfully');
        setShowEditModal(false);
        resetForm();
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        showNotification('error', data.message || 'Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      showNotification('error', 'An error occurred while updating template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/ticket-templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Template deleted successfully');
        setShowDeleteModal(false);
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        showNotification('error', data.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showNotification('error', 'An error occurred while deleting template');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subject: '',
      message: '',
      category: '',
      priority: 'low',
      productId: '',
      departmentId: '',
      tags: [],
      isActive: true
    });
  };

  const openEditModal = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      subject: template.subject || '',
      message: template.message,
      category: template.category || '',
      priority: template.priority || 'low',
      productId: template.productId || '',
      departmentId: template.departmentId || '',
      tags: template.tags ? (typeof template.tags === 'string' ? JSON.parse(template.tags) : template.tags) : [],
      isActive: template.isActive
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  const filteredTemplates = templates.filter(template => {
    const searchLower = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      (template.description && template.description.toLowerCase().includes(searchLower)) ||
      (template.category && template.category.toLowerCase().includes(searchLower)) ||
      (template.subject && template.subject.toLowerCase().includes(searchLower))
    );
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <AdminLayout currentPage="Ticket Templates">
      <div className="p-2 sm:p-4">
        <div className="w-full">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ticket Templates</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Manage templates for common ticket issues</p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Search */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates by name, description, category, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Templates List */}
          {loading ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-12 text-center">
              <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery ? 'No templates found matching your search.' : 'No templates yet. Create your first template to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 hover:shadow-lg transition-all ${!template.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {template.name}
                      </h3>
                      {template.category && (
                        <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-0">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {template.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-0 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  {template.subject && (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Subject: <span className="font-normal">{template.subject}</span>
                    </p>
                  )}
                  {template.priority && (
                    <Badge className={`mb-2 border-0 ${getPriorityColor(template.priority)}`}>
                      {template.priority.charAt(0).toUpperCase() + template.priority.slice(1)} Priority
                    </Badge>
                  )}
                  {template.product && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Product: {template.product.name}
                    </p>
                  )}
                  {template.department && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Department: {template.department.name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(template)}
                      className="flex-1 border-slate-300 dark:border-slate-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteModal(template)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showAddModal ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddModal(false);
            resetForm();
          }
        }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-violet-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Template</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Projector Not Turning On"
                  className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of when to use this template"
                  className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Pre-filled ticket subject"
                  className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Message Content *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  placeholder="Enter the template message content..."
                  className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Technical, Service"
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Product (Optional)
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Department (Optional)
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-900 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 cursor-pointer accent-violet-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Active</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Enable this template for use</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {submitting ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Edit Modal - Similar structure to Add Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showEditModal ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowEditModal(false);
            resetForm();
            setSelectedTemplate(null);
          }
        }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-violet-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Template</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                  setSelectedTemplate(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-6">
              {/* Same form fields as Add Modal */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Message Content *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Product (Optional)
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Department (Optional)
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-900 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 cursor-pointer accent-violet-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Active</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Enable this template for use</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                    setSelectedTemplate(null);
                  }}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {submitting ? 'Updating...' : 'Update Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Delete Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showDeleteModal ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDeleteModal(false);
            setSelectedTemplate(null);
          }
        }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full border border-violet-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Template</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Are you sure you want to delete this template?
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
                This will permanently delete <strong>{selectedTemplate?.name}</strong>. This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTemplate(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </AdminLayout>
  );
}

export const getServerSideProps = withAuth();


