import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function NotificationSettingsPage() {
  const [notificationSettings, setNotificationSettings] = useState({
    notificationEnabled: true,
    triggers: {
      ticketCreated: true,
      ticketAssigned: true,
      ticketUpdated: true,
      ticketResolved: true,
      ticketClosed: true,
      messageReceived: true,
      mentionReceived: true,
      slaRisk: true,
      slaBreached: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const saveTimeouts = useRef({});
  const isInitialLoad = useRef(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/notification');
      const data = await response.json();
      
      if (data.success) {
        setNotificationSettings(data.settings);
      } else {
        showNotification('error', data.message || 'Failed to fetch notification settings');
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

  const saveNotificationSettings = async () => {
    setSavingSection('notification');
    try {
      const response = await fetch('/api/admin/settings/notification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationEnabled: notificationSettings.notificationEnabled,
          triggers: notificationSettings.triggers
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Notification settings saved');
      } else {
        showNotification('error', data.message || 'Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showNotification('error', 'An error occurred while saving notification settings');
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
    debouncedSave('notification', saveNotificationSettings);
  }, [notificationSettings]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  return (
    <>
      <PageHead title="Notification Settings" description="Configure notification triggers and preferences" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Bell className="w-8 h-8 text-violet-600" />
                Notification Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Configure which events trigger notifications</p>
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
                  <Bell className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Enable Notification System
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enable or disable the entire notification system across the platform
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={notificationSettings.notificationEnabled}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, notificationEnabled: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          notificationSettings.notificationEnabled
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {notificationSettings.notificationEnabled && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {notificationSettings.notificationEnabled && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                        Configure Notification Triggers
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Select which events should trigger notifications
                      </p>
                      <div className="space-y-3">
                        {Object.entries(notificationSettings.triggers).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600">
                            <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={(e) => setNotificationSettings({
                                    ...notificationSettings,
                                    triggers: {
                                      ...notificationSettings.triggers,
                                      [key]: e.target.checked
                                    }
                                  })}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                                  value
                                    ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                                }`}>
                                  {value && (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <span className="capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
                    {savingSection === 'notification' ? (
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
        </div>
      </AdminLayout>
    </>
  );
}

export default NotificationSettingsPage;
export const getServerSideProps = withAuth();

