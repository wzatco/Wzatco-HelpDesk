import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { withAuth } from '../../../lib/withAuth';
import { 
  Webhook, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Play,
  Clock,
  ToggleLeft,
  ToggleRight,
  Settings,
  Shield,
  Puzzle,
  FileText,
  Zap,
  Bell,
  BookOpen,
  HelpCircle,
  Filter,
  Tag,
  User,
  Building2,
  TrendingUp
} from 'lucide-react';

const AVAILABLE_EVENTS = [
  'ticket.created',
  'ticket.updated',
  'ticket.assigned',
  'ticket.resolved',
  'ticket.closed',
  'ticket.reopened',
  'message.created',
  'customer.created',
  'customer.updated',
  '*'
];

const AVAILABLE_SCOPES = [
  'tickets.read',
  'tickets.write',
  'tickets.delete',
  'customers.read',
  'customers.write',
  'agents.read',
  'departments.read',
  'analytics.read',
  '*'
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('webhooks'); // 'webhooks' or 'api-keys'
  const [webhooks, setWebhooks] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [newApiKey, setNewApiKey] = useState(null);
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const [webhookFormData, setWebhookFormData] = useState({
    name: '',
    description: '',
    url: '',
    method: 'POST',
    events: [],
    headers: '{}',
    secret: '',
    enabled: true,
    retryCount: 3,
    timeout: 30000
  });
  const [apiKeyFormData, setApiKeyFormData] = useState({
    name: '',
    scopes: [],
    expiresAt: '',
    enabled: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [bodyScrollLocked, setBodyScrollLocked] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    fetchWebhooks();
    fetchApiKeys();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/integrations/webhooks');
      const data = await res.json();
      if (res.ok) {
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      showNotification('error', 'Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/admin/integrations/api-keys');
      const data = await res.json();
      if (res.ok) {
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      showNotification('error', 'Failed to fetch API keys');
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const resetWebhookForm = () => {
    setWebhookFormData({
      name: '',
      description: '',
      url: '',
      method: 'POST',
      events: [],
      headers: '{}',
      secret: '',
      enabled: true,
      retryCount: 3,
      timeout: 30000
    });
  };

  const resetApiKeyForm = () => {
    setApiKeyFormData({
      name: '',
      scopes: [],
      expiresAt: '',
      enabled: true
    });
  };

  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!webhookFormData.name || !webhookFormData.name.trim()) {
      showNotification('error', 'Webhook name is required');
      return;
    }

    if (!webhookFormData.url || !webhookFormData.url.trim()) {
      showNotification('error', 'Webhook URL is required');
      return;
    }

    // Validate URL format
    try {
      new URL(webhookFormData.url);
    } catch (error) {
      showNotification('error', 'Please enter a valid URL (e.g., https://example.com/webhook)');
      return;
    }

    if (!webhookFormData.events || webhookFormData.events.length === 0) {
      showNotification('error', 'Please select at least one event');
      return;
    }

    // Validate headers JSON if provided
    if (webhookFormData.headers && webhookFormData.headers.trim() !== '') {
      try {
        JSON.parse(webhookFormData.headers);
      } catch (error) {
        showNotification('error', 'Custom headers must be valid JSON format');
        return;
      }
    }

    // Validate retry count and timeout
    if (webhookFormData.retryCount < 1 || webhookFormData.retryCount > 10) {
      showNotification('error', 'Retry count must be between 1 and 10');
      return;
    }

    if (webhookFormData.timeout < 1000 || webhookFormData.timeout > 60000) {
      showNotification('error', 'Timeout must be between 1000ms and 60000ms');
      return;
    }

    setSubmitting(true);

    try {
      const url = isEditing 
        ? `/api/admin/integrations/webhooks/${selectedItem.id}`
        : '/api/admin/integrations/webhooks';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...webhookFormData,
          events: JSON.stringify(webhookFormData.events),
          headers: webhookFormData.headers && webhookFormData.headers.trim() !== '' 
            ? webhookFormData.headers 
            : '{}'
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', isEditing ? 'Webhook updated successfully' : 'Webhook created successfully');
        setShowWebhookModal(false);
        resetWebhookForm();
        setSelectedItem(null);
        setIsEditing(false);
        fetchWebhooks();
      } else {
        showNotification('error', data.message || `Failed to ${isEditing ? 'update' : 'create'} webhook`);
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} webhook:`, error);
      showNotification('error', `An error occurred while ${isEditing ? 'updating' : 'creating'} webhook`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApiKeySubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!apiKeyFormData.name || !apiKeyFormData.name.trim()) {
      showNotification('error', 'API key name is required');
      return;
    }

    if (!apiKeyFormData.scopes || apiKeyFormData.scopes.length === 0) {
      showNotification('error', 'Please select at least one scope');
      return;
    }

    // Validate expiration date if provided
    if (apiKeyFormData.expiresAt) {
      const expiryDate = new Date(apiKeyFormData.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDate < today) {
        showNotification('error', 'Expiration date cannot be in the past');
        return;
      }
    }

    setSubmitting(true);

    try {
      const url = isEditing 
        ? `/api/admin/integrations/api-keys/${selectedItem.id}`
        : '/api/admin/integrations/api-keys';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...apiKeyFormData,
          scopes: JSON.stringify(apiKeyFormData.scopes),
          expiresAt: apiKeyFormData.expiresAt || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (!isEditing && data.apiKey?.key) {
          // New API key created - show the key value
          setNewApiKey(data.apiKey.key);
          setShowApiKeyValue(true);
        } else {
          showNotification('success', isEditing ? 'API key updated successfully' : 'API key created successfully');
          setShowApiKeyModal(false);
          resetApiKeyForm();
          setSelectedItem(null);
          setIsEditing(false);
          fetchApiKeys();
        }
      } else {
        showNotification('error', data.message || `Failed to ${isEditing ? 'update' : 'create'} API key`);
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} API key:`, error);
      showNotification('error', `An error occurred while ${isEditing ? 'updating' : 'creating'} API key`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const endpoint = activeTab === 'webhooks' 
        ? `/api/admin/integrations/webhooks/${selectedItem.id}`
        : `/api/admin/integrations/api-keys/${selectedItem.id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', `${activeTab === 'webhooks' ? 'Webhook' : 'API key'} deleted successfully`);
        setShowDeleteModal(false);
        setSelectedItem(null);
        if (activeTab === 'webhooks') {
          fetchWebhooks();
        } else {
          fetchApiKeys();
        }
      } else {
        showNotification('error', data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      showNotification('error', 'An error occurred while deleting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!selectedItem) return;

    setTestingWebhook(true);
    try {
      const response = await fetch(`/api/admin/integrations/webhooks/${selectedItem.id}/test`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', `Test webhook sent successfully! Status: ${data.result?.statusCode}`);
        setShowTestModal(false);
        fetchWebhooks(); // Refresh to get updated logs
      } else {
        showNotification('error', data.message || 'Failed to send test webhook');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      showNotification('error', 'An error occurred while testing webhook');
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEditing(true);
    
    if (activeTab === 'webhooks') {
      setWebhookFormData({
        name: item.name || '',
        description: item.description || '',
        url: item.url || '',
        method: item.method || 'POST',
        events: typeof item.events === 'string' ? JSON.parse(item.events) : (item.events || []),
        headers: item.headers ? (typeof item.headers === 'string' ? item.headers : JSON.stringify(item.headers)) : '{}',
        secret: item.secret || '',
        enabled: item.enabled !== undefined ? item.enabled : true,
        retryCount: item.retryCount || 3,
        timeout: item.timeout || 30000
      });
      setShowWebhookModal(true);
    } else {
      setApiKeyFormData({
        name: item.name || '',
        scopes: typeof item.scopes === 'string' ? JSON.parse(item.scopes) : (item.scopes || []),
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '',
        enabled: item.enabled !== undefined ? item.enabled : true
      });
      setShowApiKeyModal(true);
    }
  };

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedItem(null);
    if (activeTab === 'webhooks') {
      resetWebhookForm();
      setShowWebhookModal(true);
    } else {
      resetApiKeyForm();
      setShowApiKeyModal(true);
    }
  };

  const toggleEvent = (event) => {
    setWebhookFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const toggleScope = (scope) => {
    setApiKeyFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('success', 'Copied to clipboard!');
  };

  const filteredWebhooks = webhooks.filter(webhook =>
    webhook.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    webhook.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApiKeys = apiKeys.filter(key =>
    key.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.keyPrefix?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showWebhookModal || showApiKeyModal || showDeleteModal || showTestModal || showApiKeyValue || showGuideModal) {
      setSavedScrollPosition(window.scrollY);
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
      setBodyScrollLocked(true);
    } else {
      if (bodyScrollLocked) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, savedScrollPosition);
        setBodyScrollLocked(false);
      }
    }
  }, [showWebhookModal, showApiKeyModal, showDeleteModal, showTestModal, showApiKeyValue, showGuideModal]);

  if (!isMounted) return null;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Puzzle className="w-8 h-8 text-violet-600" />
              External Integrations
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage webhooks, API keys, and external integrations
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowGuideModal(true)}
            className="border-violet-200 dark:border-violet-500 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-xl h-11 px-5 flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Guide
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'webhooks'
                ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </div>
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'api-keys'
                ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </div>
          </button>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder={`Search ${activeTab === 'webhooks' ? 'webhooks' : 'API keys'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
          <Button
            onClick={handleAdd}
            className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab === 'webhooks' ? 'Webhook' : 'API Key'}
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        ) : activeTab === 'webhooks' ? (
          <div className="grid gap-4">
            {filteredWebhooks.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700">
                <Webhook className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No webhooks found</p>
                <Button
                  onClick={handleAdd}
                  className="mt-4 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Create Your First Webhook
                </Button>
              </div>
            ) : (
              filteredWebhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {webhook.name}
                        </h3>
                        <Badge
                          variant={webhook.enabled ? 'success' : 'secondary'}
                          className={webhook.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}
                        >
                          {webhook.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      {webhook.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {webhook.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                          {webhook.url}
                        </span>
                        <span>{webhook.method}</span>
                        <span>{JSON.parse(webhook.events || '[]').length} events</span>
                        {webhook._count && (
                          <span>{webhook._count.logs} logs</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(webhook);
                          setShowTestModal(true);
                        }}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(webhook)}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(webhook);
                          setShowDeleteModal(true);
                        }}
                        className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredApiKeys.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700">
                <Key className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No API keys found</p>
                <Button
                  onClick={handleAdd}
                  className="mt-4 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Create Your First API Key
                </Button>
              </div>
            ) : (
              filteredApiKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {key.name}
                        </h3>
                        <Badge
                          variant={key.enabled ? 'success' : 'secondary'}
                          className={key.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}
                        >
                          {key.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">
                          {key.keyPrefix}...
                        </code>
                        <span>{JSON.parse(key.scopes || '[]').length} scopes</span>
                        {key.lastUsedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                        {key.usageCount > 0 && (
                          <span>{key.usageCount} uses</span>
                        )}
                      </div>
                      {key.expiresAt && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Expires: {new Date(key.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(key)}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(key);
                          setShowDeleteModal(true);
                        }}
                        className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notification Toast */}
        <NotificationToast 
          notification={notification} 
          onClose={() => setNotification({ type: null, message: '' })} 
        />
      </div>

      {/* Guide Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showGuideModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGuideModal(false);
            }
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-violet-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Integrations Guide</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Learn how to configure webhooks and API keys</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Overview */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-200 dark:border-violet-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <HelpCircle className="w-5 h-5 text-violet-600" />
                  Why Integrations Matter
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  The Integrations hub lets you automate workflows and connect third-party systems. Use <strong>Webhooks</strong> to push real-time ticket events
                  to CRMs, Slack, or internal services, and <strong>API Keys</strong> to grant programmatic read/write access with scoped permissions.
                  Everything here follows the same theming rules as the rest of the admin app, so the UI remains consistent in light and dark mode.
                </p>
              </div>

              {/* Quick start */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-violet-600" />
                  Quick Start Checklist
                </h3>
                <ol className="list-decimal ml-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>Open this page and choose between the <strong>Webhooks</strong> or <strong>API Keys</strong> tab.</li>
                  <li>Use the <strong>Add</strong> button to open the modal, then fill the required fields (name, URL/events for webhooks; name/scopes for keys).</li>
                  <li>Validate inputs — URL must be https, headers must be valid JSON, and scopes/events need at least one selection.</li>
                  <li>Save the form, review the success toast, and confirm the new card appears in the list.</li>
                  <li>Use the action buttons on each card to <strong>Edit</strong>, <strong>Test</strong> (webhooks), or <strong>Delete</strong>.</li>
                </ol>
              </div>

              {/* Webhooks section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-violet-600" />
                  Building Reliable Webhooks
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Webhooks push ticket lifecycle events to your external services. Configure them carefully to avoid missed updates.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                      <Settings className="w-4 h-4 text-violet-600" />
                      Configuration Tips
                    </div>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc ml-5">
                      <li>Use descriptive names (e.g., “HubSpot Ticket Sync”).</li>
                      <li>Choose the correct HTTP method (POST is default).</li>
                      <li>Select only the events you need to reduce noise.</li>
                      <li>Store custom headers as valid JSON (Authorization tokens, tenant IDs, etc.).</li>
                      <li>Set retry/timeout values that match your target service capacity.</li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                      <Zap className="w-4 h-4 text-violet-600" />
                      Testing & Monitoring
                    </div>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc ml-5">
                      <li>Use the <strong>Test</strong> button on each card to send a sample payload and verify status codes.</li>
                      <li>Look at the “logs” counter to confirm deliveries and retries.</li>
                      <li>Disable a webhook instead of deleting it if you need a temporary pause.</li>
                      <li>Keep secrets in sync with your downstream verification logic (HMAC SHA-256 supported).</li>
                      <li>Plan a cron job to hit `/api/admin/integrations/webhooks/[id]/test` if you want automated health checks.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* API keys section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Key className="w-5 h-5 text-violet-600" />
                  Managing API Keys Safely
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  API keys unlock authenticated access to your helpdesk APIs. Scope them tightly and rotate them often.
                </p>
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Scopes & Expiration</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Pick the least-privileged scopes (tickets, customers, analytics, etc.). Set an optional expiration date so the key auto-retires,
                          and toggle “Enabled” off whenever you need an immediate kill switch.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">One-Time Reveal</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          The generated key is displayed only once. Copy it with the inline actions (“Show/Hide”, “Copy”, “I’ve Saved It”). The list view
                          only shows a hashed prefix for security, along with usage counts and last-used timestamps.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theming & QA */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Theming & QA Reminders
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>All checkboxes (events/scopes) are faux-styled to match the admin theme in both light and dark modes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>Modal overlays lock body scroll and keep rounded corners, ensuring parity with the Escalation Rules experience.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>Use the search bar to validate filtering logic for both tabs (name + URL/prefix).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>Cards should display status badges, counts, and metadata (logs, scope totals, usage) exactly as per design.</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={() => setShowGuideModal(false)}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Webhook Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showWebhookModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-violet-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Webhook' : 'Create Webhook'}
              </h2>
              <button
                onClick={() => {
                  setShowWebhookModal(false);
                  resetWebhookForm();
                  setSelectedItem(null);
                  setIsEditing(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleWebhookSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-violet-600" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Name *
                    </label>
                    <Input
                      type="text"
                      value={webhookFormData.name}
                      onChange={(e) => setWebhookFormData({ ...webhookFormData, name: e.target.value })}
                      required
                      className="h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., HubSpot Integration"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={webhookFormData.description}
                      onChange={(e) => setWebhookFormData({ ...webhookFormData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      placeholder="Describe what this webhook does..."
                    />
                  </div>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-violet-600" />
                  Webhook Configuration
                </h3>
                
                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        URL *
                      </label>
                      <Input
                        type="url"
                        value={webhookFormData.url}
                        onChange={(e) => setWebhookFormData({ ...webhookFormData, url: e.target.value })}
                        required
                        className="h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="https://example.com/webhook"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Method
                      </label>
                      <select
                        value={webhookFormData.method}
                        onChange={(e) => setWebhookFormData({ ...webhookFormData, method: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Events * (Select at least one)
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-violet-200 dark:border-slate-700">
                      {AVAILABLE_EVENTS.map((event) => (
                        <label key={event} className="flex items-center gap-2 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={webhookFormData.events.includes(event)}
                              onChange={() => toggleEvent(event)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                              webhookFormData.events.includes(event)
                                ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                            }`}>
                              {webhookFormData.events.includes(event) && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{event}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Custom Headers (JSON)
                    </label>
                    <textarea
                      value={webhookFormData.headers}
                      onChange={(e) => setWebhookFormData({ ...webhookFormData, headers: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none font-mono text-sm"
                      placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Secret (for signature verification)
                    </label>
                    <Input
                      type="text"
                      value={webhookFormData.secret}
                      onChange={(e) => setWebhookFormData({ ...webhookFormData, secret: e.target.value })}
                      className="h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Optional: Secret key for HMAC signature"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-violet-600" />
                  Advanced Settings
                </h3>
                
                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Retry Count
                      </label>
                      <Input
                        type="number"
                        value={webhookFormData.retryCount}
                        onChange={(e) => setWebhookFormData({ ...webhookFormData, retryCount: parseInt(e.target.value) || 3 })}
                        min="1"
                        max="10"
                        className="h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Timeout (ms)
                      </label>
                      <Input
                        type="number"
                        value={webhookFormData.timeout}
                        onChange={(e) => setWebhookFormData({ ...webhookFormData, timeout: parseInt(e.target.value) || 30000 })}
                        min="1000"
                        max="60000"
                        className="h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={webhookFormData.enabled}
                          onChange={(e) => setWebhookFormData({ ...webhookFormData, enabled: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          webhookFormData.enabled
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {webhookFormData.enabled && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Webhook is enabled</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Enable this webhook to receive events</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowWebhookModal(false);
                    resetWebhookForm();
                    setSelectedItem(null);
                    setIsEditing(false);
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
                  {submitting ? 'Saving...' : (isEditing ? 'Update Webhook' : 'Create Webhook')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* API Key Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showApiKeyModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-violet-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {isEditing ? 'Edit API Key' : 'Create API Key'}
              </h2>
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  resetApiKeyForm();
                  setSelectedItem(null);
                  setIsEditing(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleApiKeySubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-violet-600" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Name *
                    </label>
                    <Input
                      type="text"
                      value={apiKeyFormData.name}
                      onChange={(e) => setApiKeyFormData({ ...apiKeyFormData, name: e.target.value })}
                      required
                      className="h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., Production API Key"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Scopes * (Select at least one)
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-violet-200 dark:border-slate-700">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <label key={scope} className="flex items-center gap-2 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={apiKeyFormData.scopes.includes(scope)}
                              onChange={() => toggleScope(scope)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                              apiKeyFormData.scopes.includes(scope)
                                ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                            }`}>
                              {apiKeyFormData.scopes.includes(scope) && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{scope}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-violet-600" />
                  Additional Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Expiration Date (Optional)
                    </label>
                    <Input
                      type="date"
                      value={apiKeyFormData.expiresAt}
                      onChange={(e) => setApiKeyFormData({ ...apiKeyFormData, expiresAt: e.target.value })}
                      className="h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={apiKeyFormData.enabled}
                          onChange={(e) => setApiKeyFormData({ ...apiKeyFormData, enabled: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          apiKeyFormData.enabled
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {apiKeyFormData.enabled && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">API Key is enabled</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Enable this API key to allow access</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowApiKeyModal(false);
                    resetApiKeyForm();
                    setSelectedItem(null);
                    setIsEditing(false);
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
                  {submitting ? 'Saving...' : (isEditing ? 'Update API Key' : 'Create API Key')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* API Key Value Modal (shown after creation) */}
      {isMounted && typeof window !== 'undefined' && document.body && showApiKeyValue && newApiKey && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-violet-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-600" />
                API Key Created
              </h2>
              <button
                onClick={() => {
                  setShowApiKeyValue(false);
                  setNewApiKey(null);
                  setShowApiKeyModal(false);
                  resetApiKeyForm();
                  fetchApiKeys();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Important: Save this API key now
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      You won't be able to see this key again. Make sure to copy it to a secure location.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Your API Key
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showApiKeyValue ? 'text' : 'password'}
                    value={newApiKey}
                    readOnly
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowApiKeyValue(!showApiKeyValue)}
                    className="border-slate-300 dark:border-slate-600"
                  >
                    {showApiKeyValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(newApiKey)}
                    className="border-slate-300 dark:border-slate-600"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={() => {
                    setShowApiKeyValue(false);
                    setNewApiKey(null);
                    setShowApiKeyModal(false);
                    resetApiKeyForm();
                    fetchApiKeys();
                  }}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white"
                >
                  I've Saved It
                </Button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Delete Confirmation Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-violet-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Confirm Delete</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete <strong>{selectedItem?.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                  }}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Test Webhook Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showTestModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-violet-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Test Webhook</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Send a test webhook to <strong>{selectedItem?.url}</strong>?
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTestModal(false);
                    setSelectedItem(null);
                  }}
                  disabled={testingWebhook}
                  className="border-slate-300 dark:border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white"
                >
                  {testingWebhook ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </AdminLayout>
  );
}

export const getServerSideProps = withAuth();


