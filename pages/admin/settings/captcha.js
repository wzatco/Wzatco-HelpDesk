import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/input';
import { Shield, Lock, Ticket, CheckCircle, Loader2 } from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function CaptchaSettingsPage() {
  const [captchaSettings, setCaptchaSettings] = useState({
    captchaLength: 6,
    captchaType: 'alphanumeric',
    enabledPlacements: {
      adminLogin: true,
      customerTicket: false,
      passwordReset: false
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
      const response = await fetch('/api/admin/settings/captcha');
      const data = await response.json();
      
      if (data.success) {
        setCaptchaSettings({
          captchaLength: data.settings.captchaLength || 6,
          captchaType: data.settings.captchaType || 'alphanumeric',
          enabledPlacements: data.settings.enabledPlacements || {
            adminLogin: true,
            customerTicket: false,
            passwordReset: false
          }
        });
      } else {
        showNotification('error', data.message || 'Failed to fetch captcha settings');
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

  const handleCaptchaPlacementChange = async (placement, enabled) => {
    const updatedPlacements = {
      ...(captchaSettings.enabledPlacements || {}),
      [placement]: enabled
    };

    setCaptchaSettings({
      ...captchaSettings,
      enabledPlacements: updatedPlacements
    });

    try {
      const response = await fetch('/api/admin/settings/captcha', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledPlacements: updatedPlacements
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Captcha placement updated successfully');
      } else {
        showNotification('error', data.message || 'Failed to update captcha placement');
        fetchSettings();
      }
    } catch (error) {
      console.error('Error updating captcha placement:', error);
      showNotification('error', 'An error occurred while updating captcha placement');
      fetchSettings();
    }
  };

  const saveCaptchaSettings = async () => {
    setSavingSection('captcha');
    try {
      const response = await fetch('/api/admin/settings/captcha', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captchaLength: captchaSettings.captchaLength,
          captchaType: captchaSettings.captchaType,
          enabledPlacements: captchaSettings.enabledPlacements
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Captcha settings saved');
      } else {
        showNotification('error', data.message || 'Failed to save captcha settings');
      }
    } catch (error) {
      console.error('Error saving captcha settings:', error);
      showNotification('error', 'An error occurred while saving captcha settings');
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
    debouncedSave('captcha', saveCaptchaSettings);
  }, [captchaSettings.captchaLength, captchaSettings.captchaType]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  return (
    <>
      <PageHead title="Captcha Settings" description="Configure captcha verification settings" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Shield className="w-8 h-8 text-violet-600" />
                Captcha Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Configure captcha verification to protect against automated attacks</p>
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
                  <Shield className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Captcha Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Captcha Length *
                    </label>
                    <Input
                      type="number"
                      min="4"
                      max="10"
                      value={captchaSettings.captchaLength}
                      onChange={(e) => setCaptchaSettings({ 
                        ...captchaSettings, 
                        captchaLength: parseInt(e.target.value) || 6 
                      })}
                      required
                      className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="6"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Number of characters in the captcha code (4-10 characters)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Captcha Type *
                    </label>
                    <select
                      value={captchaSettings.captchaType}
                      onChange={(e) => setCaptchaSettings({ 
                        ...captchaSettings, 
                        captchaType: e.target.value 
                      })}
                      required
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="alphanumeric">Alphanumeric (Letters and Numbers)</option>
                      <option value="numeric">Numeric (Numbers Only)</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Choose whether the captcha should include letters and numbers, or numbers only
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Captcha Placements
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Choose where to show captcha verification to protect against automated attacks and spam.
                    </p>
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        captchaSettings.enabledPlacements?.adminLogin
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            captchaSettings.enabledPlacements?.adminLogin
                              ? 'bg-emerald-500/20'
                              : 'bg-slate-500/20'
                          }`}>
                            <Lock className={`w-5 h-5 ${
                              captchaSettings.enabledPlacements?.adminLogin
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Admin Login</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Security verification for admin panel access</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={captchaSettings.enabledPlacements?.adminLogin || false}
                              onChange={(e) => handleCaptchaPlacementChange('adminLogin', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-600 transition-colors"></div>
                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-md"></div>
                          </div>
                        </label>
                      </div>

                      <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        captchaSettings.enabledPlacements?.customerTicket
                          ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            captchaSettings.enabledPlacements?.customerTicket
                              ? 'bg-violet-500/20'
                              : 'bg-slate-500/20'
                          }`}>
                            <Ticket className={`w-5 h-5 ${
                              captchaSettings.enabledPlacements?.customerTicket
                                ? 'text-violet-600 dark:text-violet-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Customer Ticket Creation</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Prevent spam tickets from bots and automated systems</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={captchaSettings.enabledPlacements?.customerTicket || false}
                              onChange={(e) => handleCaptchaPlacementChange('customerTicket', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-violet-500 dark:peer-checked:bg-violet-600 transition-colors"></div>
                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-md"></div>
                          </div>
                        </label>
                      </div>

                      <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        captchaSettings.enabledPlacements?.passwordReset
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            captchaSettings.enabledPlacements?.passwordReset
                              ? 'bg-blue-500/20'
                              : 'bg-slate-500/20'
                          }`}>
                            <Shield className={`w-5 h-5 ${
                              captchaSettings.enabledPlacements?.passwordReset
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Password Reset Forms</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Protect password reset and account recovery</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={captchaSettings.enabledPlacements?.passwordReset || false}
                              onChange={(e) => handleCaptchaPlacementChange('passwordReset', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-500 dark:peer-checked:bg-blue-600 transition-colors"></div>
                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-md"></div>
                          </div>
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                      Toggle to enable or disable captcha protection on each form. Changes are saved automatically and take effect immediately.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
                    {savingSection === 'captcha' ? (
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

export default CaptchaSettingsPage;
export const getServerSideProps = withAuth();

