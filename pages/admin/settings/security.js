import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Lock, X, CheckCircle, Loader2 } from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function SecuritySettingsPage() {
  const [securitySettings, setSecuritySettings] = useState({
    adminLoginSecurity: true,
    accountLockEnabled: true,
    accountLockAttempts: '5',
    accountLockMinutes: '15',
    dosProtection: true,
    spamEmailBlocklist: []
  });
  const [newSpamEmail, setNewSpamEmail] = useState('');
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
      const response = await fetch('/api/admin/settings/security');
      const data = await response.json();
      
      if (data.success) {
        setSecuritySettings(data.settings);
      } else {
        showNotification('error', data.message || 'Failed to fetch security settings');
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

  const saveSecuritySettings = async () => {
    setSavingSection('security');
    try {
      const response = await fetch('/api/admin/settings/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminLoginSecurity: securitySettings.adminLoginSecurity,
          accountLockEnabled: securitySettings.accountLockEnabled,
          accountLockAttempts: securitySettings.accountLockAttempts,
          accountLockMinutes: securitySettings.accountLockMinutes,
          dosProtection: securitySettings.dosProtection,
          spamEmailBlocklist: securitySettings.spamEmailBlocklist
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Security settings saved');
      } else {
        showNotification('error', data.message || 'Failed to save security settings');
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
      showNotification('error', 'An error occurred while saving security settings');
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
    debouncedSave('security', saveSecuritySettings);
  }, [securitySettings]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  return (
    <>
      <PageHead title="Security Settings" description="Configure security and protection settings" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Lock className="w-8 h-8 text-violet-600" />
                Security Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Configure security features and protection mechanisms</p>
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
                  <Lock className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Security Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Admin Login Security
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enable security features for admin login (rate limiting, account lock, etc.)
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={securitySettings.adminLoginSecurity}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, adminLoginSecurity: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          securitySettings.adminLoginSecurity
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {securitySettings.adminLoginSecurity && (
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
                        Temporary Account Lock
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Lock accounts after multiple failed login attempts
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={securitySettings.accountLockEnabled}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, accountLockEnabled: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          securitySettings.accountLockEnabled
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {securitySettings.accountLockEnabled && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {securitySettings.accountLockEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Failed Attempts Before Lock *
                        </label>
                        <Input
                          type="number"
                          min="3"
                          max="10"
                          value={securitySettings.accountLockAttempts}
                          onChange={(e) => setSecuritySettings({ 
                            ...securitySettings, 
                            accountLockAttempts: e.target.value 
                          })}
                          required
                          className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          placeholder="5"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Number of failed attempts (3-10)
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Lock Duration (Minutes) *
                        </label>
                        <Input
                          type="number"
                          min="5"
                          max="60"
                          value={securitySettings.accountLockMinutes}
                          onChange={(e) => setSecuritySettings({ 
                            ...securitySettings, 
                            accountLockMinutes: e.target.value 
                          })}
                          required
                          className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          placeholder="15"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Minutes to lock account (5-60)
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        DoS Attack Protection
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enable rate limiting and protection against denial-of-service attacks
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={securitySettings.dosProtection}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, dosProtection: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          securitySettings.dosProtection
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {securitySettings.dosProtection && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Spam Email Blocklist
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      Block specific email addresses or domains from creating tickets or accounts
                    </p>
                    <div className="flex gap-2 mb-2">
                      <Input
                        type="text"
                        value={newSpamEmail}
                        onChange={(e) => setNewSpamEmail(e.target.value)}
                        placeholder="e.g., spam@example.com or @spamdomain.com"
                        className="flex-1 h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSpamEmail.trim() && !securitySettings.spamEmailBlocklist.includes(newSpamEmail.trim())) {
                              setSecuritySettings({
                                ...securitySettings,
                                spamEmailBlocklist: [...securitySettings.spamEmailBlocklist, newSpamEmail.trim()]
                              });
                              setNewSpamEmail('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (newSpamEmail.trim() && !securitySettings.spamEmailBlocklist.includes(newSpamEmail.trim())) {
                            setSecuritySettings({
                              ...securitySettings,
                              spamEmailBlocklist: [...securitySettings.spamEmailBlocklist, newSpamEmail.trim()]
                            });
                            setNewSpamEmail('');
                          }
                        }}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {securitySettings.spamEmailBlocklist.map((email, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => {
                              setSecuritySettings({
                                ...securitySettings,
                                spamEmailBlocklist: securitySettings.spamEmailBlocklist.filter((_, i) => i !== index)
                              });
                            }}
                            className="ml-1 hover:text-red-900 dark:hover:text-red-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {securitySettings.spamEmailBlocklist.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        No blocked emails. Add email addresses or domains (e.g., @spamdomain.com)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
                    {savingSection === 'security' ? (
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

export default SecuritySettingsPage;
export const getServerSideProps = withAuth();

