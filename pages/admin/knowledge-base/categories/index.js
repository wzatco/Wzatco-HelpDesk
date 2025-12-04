import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createPortal } from 'react-dom';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../../components/ui/NotificationToast';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import {
  FolderTree,
  FolderOpen,
  Layers,
  Search as SearchIcon,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  Info,
  X,
  AlertTriangle,
  Check
} from 'lucide-react';

const defaultFormState = {
  name: '',
  description: '',
  parentId: '',
  order: 0,
  isActive: true
};

export default function KnowledgeBaseCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentFilter, setParentFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [showInactive]);

  useEffect(() => {
    if (!isMounted) return;
    if (showAddModal || showEditModal || showDeleteModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal, showEditModal, showDeleteModal, isMounted]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/knowledge-base/categories?includeInactive=${showInactive}`);
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories || []);
      } else {
        showNotification('error', data.message || 'Failed to load categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showNotification('error', 'An error occurred while loading categories');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 4500);
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setSelectedCategory(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      parentId: category.parentId || '',
      order: category.order ?? 0,
      isActive: category.isActive
    });
    setShowEditModal(true);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('error', 'Category name is required');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/knowledge-base/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          parentId: formData.parentId || null,
          order: Number(formData.order) || 0
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Category created successfully');
        setShowAddModal(false);
        resetForm();
        fetchCategories();
      } else {
        showNotification('error', data.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification('error', 'An error occurred while creating the category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!formData.name.trim()) {
      showNotification('error', 'Category name is required');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/knowledge-base/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          parentId: formData.parentId || null,
          order: Number(formData.order) || 0,
          isActive: formData.isActive
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Category updated successfully');
        setShowEditModal(false);
        resetForm();
        fetchCategories();
      } else {
        showNotification('error', data.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification('error', 'An error occurred while updating the category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/knowledge-base/categories/${selectedCategory.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Category deleted successfully');
        setShowDeleteModal(false);
        resetForm();
        fetchCategories();
      } else {
        showNotification('error', data.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('error', 'An error occurred while deleting the category');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories
    .filter((category) => {
      const matchesSearch =
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesParent =
        parentFilter === 'all'
          ? true
          : parentFilter === 'root'
          ? !category.parentId
          : category.parentId === parentFilter;
      return matchesSearch && matchesParent;
    })
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.name.localeCompare(b.name);
      }
      return a.order - b.order;
    });

  const topLevelCategories = categories.filter((cat) => !cat.parentId);
  const nestedCategories = categories.filter((cat) => cat.parentId);
  const activeCategories = categories.filter((cat) => cat.isActive);

  const childCount = (id) => categories.filter((cat) => cat.parentId === id).length;

const renderStatusBadge = (isActive) => (
    <Badge className={`${isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'} border-0 text-xs`}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

const ThemedSelect = ({ options, value, onChange, placeholder = 'Select option' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/40 via-purple-500/40 to-indigo-500/40 opacity-70 pointer-events-none ${open ? 'shadow-lg shadow-violet-500/20' : ''}`}></div>
        <button
          type="button"
          className="relative w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-white/10 dark:border-white/5 text-left flex items-center justify-between text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 transition-all"
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className={`text-sm ${selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-violet-600 dark:text-violet-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl z-50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value || 'none'}
                  className={`w-full px-4 py-3 flex items-center justify-between text-sm transition-colors ${isSelected ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-200' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-violet-600 dark:text-violet-300" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

  return (
    <AdminLayout currentPage="Knowledge Base">
      <Head>
        <title>Knowledge Base Categories - Admin Panel</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-violet-700 to-indigo-700 dark:from-violet-800 dark:via-violet-900 dark:to-indigo-950 p-6 sm:p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/5 dark:bg-black/10"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3 mb-2">
                <FolderTree className="w-9 h-9" />
                Knowledge Base Categories
              </h1>
              <p className="text-violet-100 dark:text-violet-200 max-w-2xl">
                Organize your knowledge base hierarchy, manage parent/child relationships, and keep article collections tidy for both light and dark themes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={openAddModal}
                className="bg-white text-violet-700 hover:bg-violet-50 dark:bg-white dark:text-violet-800 dark:hover:bg-violet-100 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </div>
          </div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10"></div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10"></div>
        </div>

        <NotificationToast notification={notification} onClose={() => setNotification({ type: null, message: '' })} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Categories</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{categories.length}</p>
            </div>
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <FolderOpen className="w-6 h-6 text-violet-600 dark:text-violet-300" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Top-level</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{topLevelCategories.length}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Layers className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{activeCategories.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <ChevronDown className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search categories by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                value={parentFilter}
                onChange={(e) => setParentFilter(e.target.value)}
                className="h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="all">All Parents</option>
                <option value="root">Top Level Only</option>
                {topLevelCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        showInactive
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow shadow-violet-500/30'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {showInactive && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">Show inactive</span>
                </label>
              </div>
              <div className="flex gap-2 border border-violet-200 dark:border-slate-700 rounded-xl p-1 bg-slate-50 dark:bg-slate-900/50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-sm p-6 animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-sm p-12 text-center">
            <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No categories found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {searchQuery || parentFilter !== 'all' || showInactive ? 'Try adjusting your filters' : 'Create your first knowledge base category to begin'}
            </p>
            {!searchQuery && parentFilter === 'all' && !showInactive && (
              <Button onClick={openAddModal} className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{category.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {renderStatusBadge(category.isActive)}
                      {category.parent && (
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0 text-xs">
                          Parent: {category.parent.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-300 transition-colors"
                      title="Edit category"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(category);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{category.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Order: {category.order ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Articles: {category._count?.articles ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Children: {childCount(category.id)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCategories.map((category) => (
                <div key={category.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{category.name}</h3>
                      {renderStatusBadge(category.isActive)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 ml-8">
                      {category.parent && (
                        <span className="flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />
                          Parent: {category.parent.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Articles: {category._count?.articles ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Children: {childCount(category.id)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ChevronDown className="w-3 h-3" />
                        Order: {category.order ?? 0}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 ml-8 line-clamp-2">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => openEditModal(category)} className="border-slate-300 dark:border-slate-700">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCategory(category);
                        setShowDeleteModal(true);
                      }}
                      className="border-red-200 text-red-600 dark:border-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isMounted && showAddModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddModal(false);
                resetForm();
              }
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-violet-600" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add Category</h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
      <form onSubmit={handleAddCategory} className="p-6 space-y-6 bg-slate-50/60 dark:bg-slate-900/30 rounded-b-2xl">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200/60 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Basics</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Category Identity</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Getting Started"
                className="h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 text-slate-900 dark:text-white p-4 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Optional context about when to use this category"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200/60 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Structure</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hierarchy & Ordering</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Parent Category</label>
              <ThemedSelect
                options={[
                  { value: '', label: 'No parent (top-level)' },
                  ...categories
                    .filter((cat) => !cat.parentId)
                    .map((cat) => ({ value: cat.id, label: cat.name }))
                ]}
                value={formData.parentId}
                onChange={(val) => setFormData({ ...formData, parentId: val })}
                placeholder="Choose parent category"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                min={0}
                className="h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lower numbers appear first inside their parent.</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 text-sm text-slate-600 dark:text-slate-400 flex gap-3">
            <Info className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <span>Need a sub-category? Pick a parent and we’ll keep the spacing + theming aligned with the rest of the knowledge base cards.</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
            className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20" disabled={submitting}>
            {submitting ? 'Saving...' : 'Create Category'}
          </Button>
        </div>
      </form>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Modal */}
      {isMounted && showEditModal && selectedCategory &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                resetForm();
              }
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-violet-600" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Edit Category</h2>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateCategory} className="p-6 space-y-6 bg-slate-50/60 dark:bg-slate-900/30 rounded-b-2xl">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200/60 dark:border-slate-700 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Basics</p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Update Category Details</h3>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 text-slate-900 dark:text-white p-4 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200/60 dark:border-slate-700 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Structure</p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hierarchy & Ordering</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Parent Category</label>
                    <ThemedSelect
                      options={[
                        { value: '', label: 'No parent (top-level)' },
                        ...categories
                          .filter((cat) => !cat.parentId || cat.parentId !== selectedCategory.id)
                          .filter((cat) => cat.id !== selectedCategory.id)
                          .map((cat) => ({ value: cat.id, label: cat.name }))
                      ]}
                      value={formData.parentId}
                      onChange={(val) => setFormData({ ...formData, parentId: val })}
                      placeholder="Choose parent category"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Order</label>
                      <Input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                        className="h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lower numbers appear first inside their parent.</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                            formData.isActive
                              ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow shadow-violet-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {formData.isActive && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Category is active</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Inactive categories are hidden from article creation dropdowns.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Update Category'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Modal */}
      {isMounted && showDeleteModal && selectedCategory &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteModal(false);
                resetForm();
              }
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-red-100 dark:border-red-800 rounded-t-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Category</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-600 dark:text-slate-300">
                  Are you sure you want to delete <span className="font-semibold">{selectedCategory.name}</span>? Any articles using this category will revert to uncategorized.
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  You must remove/reassign all child categories and articles before deleting.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteModal(false);
                      resetForm();
                    }}
                    className="border-slate-300 dark:border-slate-700"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700 text-white" disabled={submitting}>
                    {submitting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AdminLayout>
  );
}


