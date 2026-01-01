import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/input';
import { Brain, Key, Shield, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function AISettingsPage() {
  const [aiSettings, setAiSettings] = useState({
    apiKeys: {
      openai: '',
      anthropic: '',
      google: '',
      custom: ''
    },
    hasApiKeys: false,
    aiEnabled: false
  });
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false,
    google: false,
    custom: false
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
      const response = await fetch('/api/admin/settings/ai');
      const data = await response.json();
      
      if (data.success) {
        setAiSettings(data.settings);
      } else {
        showNotification('error', data.message || 'Failed to fetch AI settings');
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

  const saveAiSettings = async () => {
    setSavingSection('ai');
    try {
      const response = await fetch('/api/admin/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeys: aiSettings.apiKeys,
          aiEnabled: aiSettings.aiEnabled
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'AI settings saved');
      } else {
        showNotification('error', data.message || 'Failed to save AI settings');
      }
    } catch (error) {
      console.error('Error saving AI settings:', error);
      showNotification('error', 'An error occurred while saving AI settings');
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
    debouncedSave('ai', saveAiSettings);
  }, [aiSettings]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  return (
    <>
      <PageHead title="AI Settings" description="Configure AI-powered features and API keys" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Brain className="w-8 h-8 text-violet-600" />
                AI Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Configure AI-powered features for Widget Bot and chatbot</p>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> These API keys are used for the Widget Bot chatbot features. For AI-powered report analysis, use <a href="/admin/settings/integrations" className="underline hover:text-blue-800 dark:hover:text-blue-200">Integrations Settings</a>.
                </p>
              </div>
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
                  <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">AI Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Enable AI Features
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enable or disable AI-powered features across the platform
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={aiSettings.aiEnabled}
                          onChange={(e) => setAiSettings({ ...aiSettings, aiEnabled: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          aiSettings.aiEnabled
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {aiSettings.aiEnabled && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        API Keys
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Configure API keys for AI services. Keys are stored securely using HMAC hashing and AES encryption. 
                        Existing keys are masked for privacy. Enter a new key to update it.
                      </p>
                      {aiSettings.hasApiKeys && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            API keys are securely stored with HMAC hashing and encryption.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        OpenAI API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showApiKeys.openai ? 'text' : 'password'}
                          value={aiSettings.apiKeys.openai || ''}
                          onChange={(e) => setAiSettings({
                            ...aiSettings,
                            apiKeys: { ...aiSettings.apiKeys, openai: e.target.value }
                          })}
                          placeholder={aiSettings.apiKeys.openai && aiSettings.apiKeys.openai.includes('••••') ? "Enter new key to update" : "sk-..."}
                          className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-10"
                        />
                        {aiSettings.apiKeys.openai && aiSettings.apiKeys.openai.includes('••••') && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Key is stored. Enter a new key to update it.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, openai: !showApiKeys.openai })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Anthropic (Claude) API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showApiKeys.anthropic ? 'text' : 'password'}
                          value={aiSettings.apiKeys.anthropic || ''}
                          onChange={(e) => setAiSettings({
                            ...aiSettings,
                            apiKeys: { ...aiSettings.apiKeys, anthropic: e.target.value }
                          })}
                          placeholder="sk-ant-..."
                          className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, anthropic: !showApiKeys.anthropic })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showApiKeys.anthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Google AI API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showApiKeys.google ? 'text' : 'password'}
                          value={aiSettings.apiKeys.google || ''}
                          onChange={(e) => setAiSettings({
                            ...aiSettings,
                            apiKeys: { ...aiSettings.apiKeys, google: e.target.value }
                          })}
                          placeholder="AIza..."
                          className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, google: !showApiKeys.google })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showApiKeys.google ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Custom API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showApiKeys.custom ? 'text' : 'password'}
                          value={aiSettings.apiKeys.custom || ''}
                          onChange={(e) => setAiSettings({
                            ...aiSettings,
                            apiKeys: { ...aiSettings.apiKeys, custom: e.target.value }
                          })}
                          placeholder="Enter custom API key"
                          className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, custom: !showApiKeys.custom })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showApiKeys.custom ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        For custom AI service integrations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
                    {savingSection === 'ai' ? (
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

export default AISettingsPage;
export const getServerSideProps = withAuth();

