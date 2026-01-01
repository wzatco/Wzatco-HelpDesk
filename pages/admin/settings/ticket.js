import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/input';
import { Ticket, CheckCircle, Loader2, Tag, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { withAuth } from '../../../lib/withAuth';

function TicketSettingsPage() {
  const [ticketSettings, setTicketSettings] = useState({
    anyStaffCanReply: false,
    hidePriorityCustomer: false,
    hidePriorityAdmin: false,
    autoCloseEnabled: false,
    autoCloseHours: '24',
    closingMessage: 'This ticket has been automatically closed due to inactivity.',
    userMaxOpenTickets: '5',
    userCanReopen: true,
    reopenTimeDays: '7',
    positiveFeedbackMessage: 'Thank you for your positive feedback!',
    negativeFeedbackMessage: 'We apologize for the inconvenience. Our team will review your feedback and work to improve our service.'
  });
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const saveTimeouts = useRef({});
  const isInitialLoad = useRef(true);

  // Issue Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    isActive: true,
    order: 0
  });

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/ticket');
      const data = await response.json();

      if (data.success) {
        setTicketSettings(data.settings);
      } else {
        showNotification('error', data.message || 'Failed to fetch ticket settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('error', 'An error occurred while fetching settings');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
    }
  };

  const saveTicketSettings = async () => {
    setSavingSection('ticket');
    try {
      const response = await fetch('/api/admin/settings/ticket', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anyStaffCanReply: ticketSettings.anyStaffCanReply,
          hidePriorityCustomer: ticketSettings.hidePriorityCustomer,
          hidePriorityAdmin: ticketSettings.hidePriorityAdmin,
          autoCloseEnabled: ticketSettings.autoCloseEnabled,
          autoCloseHours: ticketSettings.autoCloseHours,
          closingMessage: ticketSettings.closingMessage,
          userMaxOpenTickets: ticketSettings.userMaxOpenTickets,
          userCanReopen: ticketSettings.userCanReopen,
          reopenTimeDays: ticketSettings.reopenTimeDays,
          positiveFeedbackMessage: ticketSettings.positiveFeedbackMessage,
          negativeFeedbackMessage: ticketSettings.negativeFeedbackMessage
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Ticket settings saved');
      } else {
        showNotification('error', data.message || 'Failed to save ticket settings');
      }
    } catch (error) {
      console.error('Error saving ticket settings:', error);
      showNotification('error', 'An error occurred while saving ticket settings');
    } finally {
      setSavingSection(null);
    }
  };

  const debouncedSave = (section, saveFunction, delay = 1500) => {
    if (saveTimeouts.current[section]) {
      clearTimeout(saveTimeouts.current[section]);
    }
    saveTimeouts.current[section] = setTimeout(() => {
      saveFunction();
      delete saveTimeouts.current[section];
    }, delay);
  };

  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    if (loading || isInitialLoad.current) return;
    debouncedSave('ticket', saveTicketSettings);
  }, [ticketSettings]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  // Issue Categories functions
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/admin/issue-categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch issue categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showNotification('error', 'An error occurred while fetching categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      showNotification('error', 'Category name is required');
      return;
    }

    try {
      const response = await fetch('/api/admin/issue-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Category created successfully');
        setCategoryForm({ name: '', description: '', isActive: true, order: 0 });
        setShowCategoryForm(false);
        fetchCategories();
      } else {
        showNotification('error', data.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification('error', 'An error occurred while creating category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!categoryForm.name.trim()) {
      showNotification('error', 'Category name is required');
      return;
    }

    try {
      const response = await fetch(`/api/admin/issue-categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Category updated successfully');
        setEditingCategory(null);
        setCategoryForm({ name: '', description: '', isActive: true, order: 0 });
        fetchCategories();
      } else {
        showNotification('error', data.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification('error', 'An error occurred while updating category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category? It will be deactivated if used in tickets.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/issue-categories/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', data.message || 'Category deleted successfully');
        fetchCategories();
      } else {
        showNotification('error', data.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('error', 'An error occurred while deleting category');
    }
  };

  const startEdit = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
      order: category.order
    });
    setShowCategoryForm(true);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', isActive: true, order: 0 });
    setShowCategoryForm(false);
  };

  return (
    <>
      <PageHead title="Ticket Settings" description="Configure ticket behavior and rules" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Ticket className="w-8 h-8 text-violet-600" />
                Ticket Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Configure ticket behavior, auto-close rules, and user limits</p>
            </div>
          </div>

          <NotificationToast
            notification={notification}
            onClose={() => setNotification({ type: null, message: '' })}
          />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : (
            <Card className="border border-violet-200 dark:border-slate-700 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Ticket className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Ticket Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Any Staff Can Reply
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Allow any staff member to reply to tickets, not just assigned agents
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={ticketSettings.anyStaffCanReply}
                          onChange={(e) => setTicketSettings({ ...ticketSettings, anyStaffCanReply: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${ticketSettings.anyStaffCanReply
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                          }`}>
                          {ticketSettings.anyStaffCanReply && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Hide Priority Input for Customer
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Hide the priority selection field when customers create tickets
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={ticketSettings.hidePriorityCustomer}
                          onChange={(e) => setTicketSettings({ ...ticketSettings, hidePriorityCustomer: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${ticketSettings.hidePriorityCustomer
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                          }`}>
                          {ticketSettings.hidePriorityCustomer && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Hide Priority in Admin Panel
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Hide the priority field in the admin panel ticket views
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={ticketSettings.hidePriorityAdmin}
                          onChange={(e) => setTicketSettings({ ...ticketSettings, hidePriorityAdmin: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${ticketSettings.hidePriorityAdmin
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                          }`}>
                          {ticketSettings.hidePriorityAdmin && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Auto-Close Tickets
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Automatically close tickets after a period of inactivity
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={ticketSettings.autoCloseEnabled}
                          onChange={(e) => setTicketSettings({ ...ticketSettings, autoCloseEnabled: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${ticketSettings.autoCloseEnabled
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                          }`}>
                          {ticketSettings.autoCloseEnabled && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {ticketSettings.autoCloseEnabled && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Auto-Close Rule (Hours) *
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="8760"
                          value={ticketSettings.autoCloseHours}
                          onChange={(e) => setTicketSettings({
                            ...ticketSettings,
                            autoCloseHours: e.target.value
                          })}
                          required
                          className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          placeholder="24"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Close inactive tickets after this many hours (1-8760 hours = 1 year)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Editable Closing Message *
                        </label>
                        <textarea
                          value={ticketSettings.closingMessage}
                          onChange={(e) => setTicketSettings({
                            ...ticketSettings,
                            closingMessage: e.target.value
                          })}
                          required
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                          placeholder="This ticket has been automatically closed due to inactivity."
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Message displayed when tickets are automatically closed
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      User Max Open Tickets Limit *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={ticketSettings.userMaxOpenTickets}
                      onChange={(e) => setTicketSettings({
                        ...ticketSettings,
                        userMaxOpenTickets: e.target.value
                      })}
                      required
                      className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="5"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Maximum number of open tickets a user can have at once (1-100)
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        User Can Re-Open Tickets
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Allow users to reopen closed tickets within the specified time period
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={ticketSettings.userCanReopen}
                          onChange={(e) => setTicketSettings({ ...ticketSettings, userCanReopen: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${ticketSettings.userCanReopen
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                          }`}>
                          {ticketSettings.userCanReopen && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {ticketSettings.userCanReopen && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Re-Open Time (Days) *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={ticketSettings.reopenTimeDays}
                        onChange={(e) => setTicketSettings({
                          ...ticketSettings,
                          reopenTimeDays: e.target.value
                        })}
                        required
                        className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        placeholder="7"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Number of days after closure when users can still reopen tickets (1-365 days)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Positive Feedback Message *
                    </label>
                    <textarea
                      value={ticketSettings.positiveFeedbackMessage}
                      onChange={(e) => setTicketSettings({
                        ...ticketSettings,
                        positiveFeedbackMessage: e.target.value
                      })}
                      required
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      placeholder="Thank you for your positive feedback!"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Message displayed when users provide positive feedback
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Negative Feedback Message *
                    </label>
                    <textarea
                      value={ticketSettings.negativeFeedbackMessage}
                      onChange={(e) => setTicketSettings({
                        ...ticketSettings,
                        negativeFeedbackMessage: e.target.value
                      })}
                      required
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      placeholder="We apologize for the inconvenience. Our team will review your feedback and work to improve our service."
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Message displayed when users provide negative feedback
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
                    {savingSection === 'ticket' ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Auto-saved</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issue Categories Management */}
          <Card className="border border-violet-200 dark:border-slate-700 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Issue Categories</CardTitle>
                </div>
                {!showCategoryForm && (
                  <Button
                    onClick={() => {
                      setShowCategoryForm(true);
                      setEditingCategory(null);
                      setCategoryForm({ name: '', description: '', isActive: true, order: 0 });
                    }}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category Form */}
                  {showCategoryForm && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Category Name *
                          </label>
                          <Input
                            type="text"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            placeholder="e.g., Technical, Billing, Warranty"
                            className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Description
                          </label>
                          <textarea
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                            placeholder="Optional description for this category"
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Order
                            </label>
                            <Input
                              type="number"
                              value={categoryForm.order}
                              onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                              className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Active
                              </label>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Show in dropdowns
                              </p>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={categoryForm.isActive}
                                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${categoryForm.isActive
                                  ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30'
                                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                                  }`}>
                                  {categoryForm.isActive && (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {editingCategory ? 'Update' : 'Create'} Category
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            variant="outline"
                            className="border-slate-300 dark:border-slate-600"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Categories List */}
                  {categories.length === 0 ? (
                    <div className="text-center py-12">
                      <Tag className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">No categories found. Create your first category to get started.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Description</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Order</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((category) => (
                            <tr key={category.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">
                                {category.name}
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                                {category.description || '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-center text-slate-600 dark:text-slate-400">
                                {category.order}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  category.isActive
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  {category.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => startEdit(category)}
                                    className="p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                    title="Edit category"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete category"
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

export default TicketSettingsPage;
export const getServerSideProps = withAuth();

