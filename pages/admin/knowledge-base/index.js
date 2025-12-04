import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { 
  FileText, 
  Plus, 
  Search as SearchIcon, 
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Tag,
  Calendar,
  User,
  X,
  Filter,
  CheckCircle2,
  Clock,
  Settings,
  FolderOpen,
  Loader2,
  Code,
  ChevronDown
} from 'lucide-react';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import ThemedSelect from '../../../components/ui/ThemedSelect';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { status } = router.query;
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(status || 'all'); // all, published, draft
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    status: 'draft',
    tags: [],
    isHtml: false,
    isPublic: true
  });
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [htmlPreview, setHtmlPreview] = useState({ show: false, content: '', title: '' });

  useEffect(() => {
    setIsMounted(true);
    fetchArticles();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (status) {
      setStatusFilter(status);
    }
  }, [status]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/knowledge-base/articles');
      const data = await response.json();
      
      if (response.ok) {
        setArticles(data.articles || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch articles');
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      showNotification('error', 'An error occurred while fetching articles');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/knowledge-base/categories');
      const data = await response.json();
      
      if (response.ok) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handlePreviewHtml = () => {
    if (!formData.content || !formData.content.trim()) {
      showNotification('error', 'Add some HTML content to preview');
      return;
    }
    setHtmlPreview({
      show: true,
      content: formData.content,
      title: formData.title || 'HTML Preview'
    });
  };

  const closeHtmlPreview = () => setHtmlPreview({ show: false, content: '', title: '' });

  const handleAddArticle = async (e) => {
    e.preventDefault();
    if (!formData.title || formData.title.trim() === '') {
      showNotification('error', 'Article title is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/knowledge-base/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim() || '',
          contentType: formData.isHtml ? 'html' : 'richtext',
          category: formData.category || null,
          status: formData.status,
          tags: formData.tags,
          isPublic: formData.isPublic
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Article created successfully');
        setShowAddModal(false);
        setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
        setTagInput('');
        await fetchArticles();
      } else {
        showNotification('error', data.message || 'Failed to create article');
      }
    } catch (error) {
      console.error('Error creating article:', error);
      showNotification('error', 'An error occurred while creating the article');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditArticle = async (e) => {
    e.preventDefault();
    if (!formData.title || formData.title.trim() === '') {
      showNotification('error', 'Article title is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/knowledge-base/articles/${selectedArticle.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim() || '',
          contentType: formData.isHtml ? 'html' : 'richtext',
          category: formData.category || null,
          status: formData.status,
          tags: formData.tags,
          isPublic: formData.isPublic
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Article updated successfully');
        setShowEditModal(false);
        setSelectedArticle(null);
        setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
        setTagInput('');
        await fetchArticles();
      } else {
        showNotification('error', data.message || 'Failed to update article');
      }
    } catch (error) {
      console.error('Error updating article:', error);
      showNotification('error', 'An error occurred while updating the article');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArticle = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/knowledge-base/articles/${selectedArticle.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Article deleted successfully');
        setShowDeleteModal(false);
        setSelectedArticle(null);
        await fetchArticles();
      } else {
        showNotification('error', data.message || 'Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      showNotification('error', 'An error occurred while deleting the article');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (article) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title || '',
      content: article.content || '',
      category: article.categoryId || '',
      status: article.status || 'draft',
      tags: article.tags || [],
      isPublic: article.isPublic !== false,
      isHtml: article.contentType === 'html'
    });
    setTagInput('');
    setShowEditModal(true);
  };

  const openDeleteModal = (article) => {
    setSelectedArticle(article);
    setShowDeleteModal(true);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || article.categoryId === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'draft': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300';
    }
  };

  return (
    <AdminLayout currentPage="Knowledge Base">
      <Head>
        <title>Knowledge Base - Admin Panel</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-none mx-auto space-y-6 p-6">
          {/* Enhanced Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
                    <BookOpen className="w-8 h-8" />
                    Knowledge Base
                  </h1>
                  <p className="text-violet-100 dark:text-violet-200 text-base sm:text-lg">Manage articles, categories, and help content</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button 
                    onClick={() => router.push('/admin/knowledge-base/categories')}
                    className="bg-white/10 text-white hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold border border-white/20"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Categories
                  </Button>
                  <Button 
                    onClick={() => {
        setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
                      setTagInput('');
                      setShowAddModal(true);
                    }}
                    className="bg-white text-violet-700 hover:bg-violet-50 dark:bg-white dark:text-violet-800 dark:hover:bg-violet-100 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    New Article
                  </Button>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Articles</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{articles.length}</p>
                  </div>
                  <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                    <FileText className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Published</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {articles.filter(a => a.status === 'published').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Drafts</p>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {articles.filter(a => a.status === 'draft').length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Categories</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{categories.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <FolderOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search articles by title or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="flex gap-2 border border-violet-200 dark:border-slate-700 rounded-xl p-1 bg-slate-50 dark:bg-slate-900/50">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Grid
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

          {/* Articles Grid/List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 animate-pulse">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No articles found
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by creating your first article'}
              </p>
              {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
                <Button
                  onClick={() => {
        setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
                    setTagInput('');
                    setShowAddModal(true);
                  }}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Article
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Card
                  key={article.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">
                            {article.title}
                          </h3>
                        </div>
                        {article.content && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">
                            {article.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge className={`${getStatusColor(article.status)} border-0 text-xs`}>
                        {article.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                      {article.category && (
                        <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-0 text-xs">
                          {article.category.name}
                        </Badge>
                      )}
                      {article.isPublic === false && (
                        <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-0 text-xs">
                          Private
                        </Badge>
                      )}
                    </div>

                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {article.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-xs px-2 py-1 text-slate-500 dark:text-slate-500">
                            +{article.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        {article.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(article.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/knowledge-base/articles/${article.id}`);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(article);
                          }}
                          className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(article);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {article.title}
                          </h3>
                          <Badge className={`${getStatusColor(article.status)} border-0 text-xs`}>
                            {article.status === 'published' ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        {article.content && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 ml-8 mb-3">
                            {article.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                          </p>
                        )}
                        <div className="flex items-center gap-4 ml-8 text-xs text-slate-500 dark:text-slate-400">
                          {article.category && (
                            <span className="flex items-center gap-1">
                              <FolderOpen className="w-3 h-3" />
                              {article.category.name}
                            </span>
                          )}
                          {article.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(article.createdAt).toLocaleDateString()}
                            </span>
                          )}
                          {article.tags && article.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {article.tags.length} tag{article.tags.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/knowledge-base/articles/${article.id}`);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(article);
                          }}
                          className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(article);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HTML Preview Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && htmlPreview.show && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeHtmlPreview();
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">HTML Preview</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{htmlPreview.title || 'Untitled article'}</p>
                </div>
              </div>
              <button
                onClick={closeHtmlPreview}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {htmlPreview.content ? (
                <div
                  className="prose prose-slate max-w-none dark:prose-invert prose-headings:mt-6 prose-headings:mb-3 prose-p:mb-4"
                  dangerouslySetInnerHTML={{ __html: htmlPreview.content }}
                />
              ) : (
                <p className="text-slate-500 dark:text-slate-400">No HTML content to preview.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Article Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showAddModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
              setTagInput('');
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Article</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
                  setTagInput('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddArticle} className="p-6 space-y-6">
              {/* Article Information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-600" />
                  Article Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Enter article title"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Content
                    </label>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>HTML Mode</span>
                        <input
                          type="checkbox"
                          checked={formData.isHtml}
                          onChange={(e) => setFormData({ ...formData, isHtml: e.target.checked, content: '' })}
                          className="h-4 w-4 accent-violet-600"
                        />
                      </div>
                    </div>
                     {formData.isHtml ? (
                       <>
                         <textarea
                           value={formData.content}
                           onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                           rows={10}
                           className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                           placeholder="<div>Enter HTML here...</div>"
                         />
                         <div className="flex justify-end">
                           <Button
                             type="button"
                             variant="outline"
                             onClick={handlePreviewHtml}
                             className="mt-3 border-violet-200 dark:border-slate-600 text-violet-700 dark:text-violet-200"
                           >
                             Preview HTML
                           </Button>
                         </div>
                       </>
                     ) : (
                    <RichTextEditor
                      value={formData.content}
                      onChange={(content) => setFormData({ ...formData, content })}
                      placeholder="Start typing your article content here..."
                    />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Category
                      </label>
                      <ThemedSelect
                        options={[
                          { value: '', label: 'No Category' },
                          ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                        ]}
                        value={formData.category}
                        onChange={(val) => setFormData({ ...formData, category: val })}
                        placeholder="Choose category"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Status
                      </label>
                      <ThemedSelect
                        options={[
                          { value: 'draft', label: 'Draft' },
                          { value: 'published', label: 'Published' }
                        ]}
                        value={formData.status}
                        onChange={(val) => setFormData({ ...formData, status: val })}
                        placeholder="Select status"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-violet-600" />
                  Tags
                </h3>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="flex-1 h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Enter a tag and press Enter"
                    />
                    <Button
                      type="button"
                      onClick={addTag}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-violet-900 dark:hover:text-violet-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Visibility */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-violet-600" />
                  Visibility
                </h3>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                      formData.isPublic
                        ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                    }`}>
                      {formData.isPublic && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Article is public</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Public articles are visible to all users</span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
                    setTagInput('');
                  }}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Add Article'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Article Modal - Similar structure to Add Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showEditModal && selectedArticle && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setSelectedArticle(null);
              setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
              setTagInput('');
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Article</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedArticle(null);
                  setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true, isHtml: false });
                  setTagInput('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditArticle} className="p-6 space-y-6">
              {/* Same form structure as Add Modal */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-600" />
                  Article Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Enter article title"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Content
                    </label>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>HTML Mode</span>
                        <input
                          type="checkbox"
                          checked={formData.isHtml}
                          onChange={(e) => setFormData({ ...formData, isHtml: e.target.checked, content: '' })}
                          className="h-4 w-4 accent-violet-600"
                        />
                      </div>
                    </div>
                     {formData.isHtml ? (
                       <>
                         <textarea
                           value={formData.content}
                           onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                           rows={10}
                           className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                           placeholder="<div>Enter HTML here...</div>"
                         />
                         <div className="flex justify-end">
                           <Button
                             type="button"
                             variant="outline"
                             onClick={handlePreviewHtml}
                             className="mt-3 border-violet-200 dark:border-slate-600 text-violet-700 dark:text-violet-200"
                           >
                             Preview HTML
                           </Button>
                         </div>
                       </>
                     ) : (
                    <RichTextEditor
                      value={formData.content}
                      onChange={(content) => setFormData({ ...formData, content })}
                      placeholder="Start typing your article content here..."
                    />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Category
                      </label>
                      <ThemedSelect
                        options={[
                          { value: '', label: 'No Category' },
                          ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                        ]}
                        value={formData.category}
                        onChange={(val) => setFormData({ ...formData, category: val })}
                        placeholder="Choose category"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Status
                      </label>
                      <ThemedSelect
                        options={[
                          { value: 'draft', label: 'Draft' },
                          { value: 'published', label: 'Published' }
                        ]}
                        value={formData.status}
                        onChange={(val) => setFormData({ ...formData, status: val })}
                        placeholder="Select status"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-violet-600" />
                  Tags
                </h3>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="flex-1 h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Enter a tag and press Enter"
                    />
                    <Button
                      type="button"
                      onClick={addTag}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-violet-900 dark:hover:text-violet-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Visibility */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-violet-600" />
                  Visibility
                </h3>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                      formData.isPublic
                        ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                    }`}>
                      {formData.isPublic && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Article is public</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Public articles are visible to all users</span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedArticle(null);
                    setFormData({ title: '', content: '', category: '', status: 'draft', tags: [], isPublic: true });
                    setTagInput('');
                  }}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Article'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showDeleteModal && selectedArticle && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setSelectedArticle(null);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Delete Article</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedArticle(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{selectedArticle.title}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedArticle(null);
                  }}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteArticle}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
}

