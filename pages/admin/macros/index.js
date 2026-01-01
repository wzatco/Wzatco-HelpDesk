import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { 
  FileCode, 
  Plus, 
  Search as SearchIcon, 
  Edit,
  Trash2,
  X,
  Loader2,
  Tag,
  Keyboard,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function MacrosPage() {
  const router = useRouter();
  const [macros, setMacros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMacro, setEditingMacro] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: '',
    shortcut: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    setIsMounted(true);
    fetchMacros();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const fetchMacros = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/macros', {
        credentials: 'include' // Include cookies in request
      });
      const data = await response.json();
      
      if (data.success) {
        setMacros(data.data || []);
        // Extract unique categories
        const uniqueCategories = [...new Set(data.data?.map(m => m.category).filter(Boolean) || [])];
        setCategories(uniqueCategories);
      } else {
        showNotification('error', data.message || 'Failed to fetch macros');
      }
    } catch (error) {
      console.error('Error fetching macros:', error);
      showNotification('error', 'An error occurred while fetching macros');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      content: '',
      category: '',
      shortcut: '',
      isActive: true
    });
    setEditingMacro(null);
    setShowModal(true);
  };

  const handleEdit = (macro) => {
    setFormData({
      name: macro.name,
      content: macro.content,
      category: macro.category || '',
      shortcut: macro.shortcut || '',
      isActive: macro.isActive
    });
    setEditingMacro(macro);
    setShowModal(true);
  };

  const handleDelete = async (macro) => {
    if (!confirm(`Are you sure you want to delete "${macro.name}"?`)) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/macros/${macro.id}`, {
        method: 'DELETE',
        credentials: 'include' // Include cookies in request
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Macro deleted successfully');
        fetchMacros();
      } else {
        showNotification('error', data.message || 'Failed to delete macro');
      }
    } catch (error) {
      console.error('Error deleting macro:', error);
      showNotification('error', 'An error occurred while deleting macro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.name.trim() || !formData.content.trim()) {
      showNotification('error', 'Name and content are required');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingMacro 
        ? `/api/admin/macros/${editingMacro.id}`
        : '/api/admin/macros';
      
      const method = editingMacro ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', data.message || (editingMacro ? 'Macro updated successfully' : 'Macro created successfully'));
        setShowModal(false);
        setEditingMacro(null);
        setFormData({
          name: '',
          content: '',
          category: '',
          shortcut: '',
          isActive: true
        });
        fetchMacros();
      } else {
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          showNotification('error', data.errors[0]?.message || data.message || 'Validation failed');
        } else {
          showNotification('error', data.message || data.error || 'Failed to save macro');
        }
      }
    } catch (error) {
      console.error('Error saving macro:', error);
      showNotification('error', `An error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (macro) => {
    try {
      const response = await fetch(`/api/admin/macros/${macro.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ isActive: !macro.isActive })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', `Macro ${!macro.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchMacros();
      } else {
        showNotification('error', data.message || 'Failed to update macro');
      }
    } catch (error) {
      console.error('Error updating macro:', error);
      showNotification('error', 'An error occurred while updating macro');
    }
  };

  const filteredMacros = macros.filter(macro => {
    const matchesSearch = !searchQuery || 
      macro.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      macro.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (macro.shortcut && macro.shortcut.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || macro.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout currentPage="Macros">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
              Message Templates
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Create and manage reusable message templates
            </p>
          </div>
          <Button 
            onClick={handleAdd} 
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/50 dark:shadow-violet-900/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Macro
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search macros..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Macros Table */}
        {loading ? (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-600" />
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading macros...</p>
            </CardContent>
          </Card>
        ) : filteredMacros.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <FileCode className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                {macros.length === 0 ? 'No macros created yet' : 'No macros found matching your search'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMacros.map((macro) => (
              <Card key={macro.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {macro.name}
                        </h3>
                        {!macro.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {macro.category && (
                          <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {macro.category}
                          </Badge>
                        )}
                        {macro.shortcut && (
                          <Badge variant="outline" className="text-xs font-mono">
                            <Keyboard className="w-3 h-3 mr-1" />
                            {macro.shortcut}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                        {macro.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Updated {new Date(macro.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(macro)}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(macro)}
                        className={macro.isActive ? "border-yellow-300 dark:border-yellow-600" : "border-green-300 dark:border-green-600"}
                      >
                        {macro.isActive ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(macro)}
                        className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled={submitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && isMounted && typeof window !== 'undefined' && document.body && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submitting) {
                setShowModal(false);
                setEditingMacro(null);
              }
            }}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                    {editingMacro ? 'Edit Macro' : 'Create Macro'}
                  </h2>
                  <button
                    onClick={() => {
                      if (!submitting) {
                        setShowModal(false);
                        setEditingMacro(null);
                      }
                    }}
                    disabled={submitting}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Greeting, Closing, FAQ Response"
                      className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-violet-500 dark:focus:ring-violet-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Content *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter the message template..."
                      rows={6}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Category
                      </label>
                      <Input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Greetings, FAQs"
                        className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-violet-500 dark:focus:ring-violet-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Shortcut
                      </label>
                      <Input
                        type="text"
                        value={formData.shortcut}
                        onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                        placeholder="e.g., /greet"
                        className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-violet-500 dark:focus:ring-violet-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-violet-600 dark:text-violet-400 border-slate-300 dark:border-slate-600 rounded focus:ring-violet-500 dark:focus:ring-violet-400 bg-white dark:bg-slate-700"
                    />
                    <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                      Active
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!submitting) {
                          setShowModal(false);
                          setEditingMacro(null);
                        }
                      }}
                      disabled={submitting}
                      className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/50 dark:shadow-violet-900/50"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingMacro ? 'Update Macro' : 'Create Macro'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

        <NotificationToast
          notification={notification}
          onClose={() => setNotification({ type: null, message: '' })}
        />
      </div>
    </AdminLayout>
  );
}

export default MacrosPage;
export const getServerSideProps = withAuth();

