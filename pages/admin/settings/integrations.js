import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { withAuth } from '../../../lib/withAuth';
import { 
  Plug2, 
  Brain,
  Eye, 
  EyeOff,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [integrationSettings, setIntegrationSettings] = useState({
    googleClientId: '',
    googleClientSecret: '',
    isGoogleAuthEnabled: false,
    aiApiKey: '',
    aiProvider: 'openai',
    isAiEnabled: false
  });

  const [showIntegrationKeys, setShowIntegrationKeys] = useState({
    googleClientId: false,
    googleClientSecret: false,
    aiApiKey: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  // Auto-save when settings change
  useEffect(() => {
    if (hasUnsavedChanges && !saving) {
      const timer = setTimeout(() => {
        handleSave();
      }, 1000); // Auto-save after 1 second of no changes

      return () => clearTimeout(timer);
    }
  }, [integrationSettings, hasUnsavedChanges]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/integrations');
      const data = await response.json();
      
      if (data.success) {
        setIntegrationSettings(data.settings);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error fetching integration settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setIntegrationSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/admin/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleClientId: integrationSettings.googleClientId,
          googleClientSecret: integrationSettings.googleClientSecret,
          isGoogleAuthEnabled: integrationSettings.isGoogleAuthEnabled,
          aiApiKey: integrationSettings.aiApiKey,
          aiProvider: integrationSettings.aiProvider,
          isAiEnabled: integrationSettings.isAiEnabled
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSaveResult({
          type: 'success',
          message: data.message || 'Saved!'
        });
        setHasUnsavedChanges(false);
      } else {
        setSaveResult({
          type: 'error',
          message: data.message || 'Failed to save'
        });
      }
    } catch (error) {
      console.error('Error saving integration settings:', error);
      setSaveResult({
        type: 'error',
        message: 'Failed to save'
      });
    } finally {
      setSaving(false);
      // Auto-hide notification after 3 seconds
      setTimeout(() => setSaveResult(null), 3000);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Integrations Settings - Admin</title>
        </Head>
        <AdminLayout currentPage="Integrations Settings">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Integrations Settings - Admin</title>
      </Head>
      <AdminLayout currentPage="Integrations Settings">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Plug2 className="w-8 h-8 text-violet-600" />
                Integrations Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Manage Google Authentication and AI Assistant integrations
              </p>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> The AI settings here are specifically for admin report analysis features. For Widget Bot AI, use <a href="/admin/settings/ai" className="underline hover:text-blue-800 dark:hover:text-blue-200">AI Settings</a>.
                </p>
              </div>
            </div>
            
            {/* Auto-save status */}
            <div className="flex items-center gap-2 text-sm">
              {saving && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              {!saving && saveResult?.type === 'success' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Saved</span>
                </div>
              )}
              {!saving && hasUnsavedChanges && !saveResult && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span>Unsaved changes</span>
                </div>
              )}
            </div>
          </div>

          {/* Save Result Notification */}
          {saveResult && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              saveResult.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {saveResult.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{saveResult.message}</span>
            </div>
          )}

          {/* Google Authentication Section */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Google Authentication</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Allow widget users to sign in with Google</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Enable Google Auth Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Enable Google Login
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Allow customers to authenticate using their Google account
                    </p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={integrationSettings.isGoogleAuthEnabled}
                        onChange={(e) => updateSetting('isGoogleAuthEnabled', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        integrationSettings.isGoogleAuthEnabled
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                      }`}>
                        {integrationSettings.isGoogleAuthEnabled && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Google Client ID */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Google Client ID
                  </label>
                  <div className="relative">
                    <Input
                      type={showIntegrationKeys.googleClientId ? 'text' : 'password'}
                      value={integrationSettings.googleClientId}
                      onChange={(e) => updateSetting('googleClientId', e.target.value)}
                      className="w-full h-11 pr-12 rounded-xl border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                      placeholder="Enter Google OAuth Client ID"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIntegrationKeys({ ...showIntegrationKeys, googleClientId: !showIntegrationKeys.googleClientId })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showIntegrationKeys.googleClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Get this from Google Cloud Console → APIs & Services → Credentials
                  </p>
                </div>

                {/* Google Client Secret */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Google Client Secret
                  </label>
                  <div className="relative">
                    <Input
                      type={showIntegrationKeys.googleClientSecret ? 'text' : 'password'}
                      value={integrationSettings.googleClientSecret}
                      onChange={(e) => updateSetting('googleClientSecret', e.target.value)}
                      className="w-full h-11 pr-12 rounded-xl border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                      placeholder="Enter Google OAuth Client Secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIntegrationKeys({ ...showIntegrationKeys, googleClientSecret: !showIntegrationKeys.googleClientSecret })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showIntegrationKeys.googleClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Keep this secret secure and never share it publicly
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Assistant Section */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">AI Assistant</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Configure AI-powered report analysis</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">For Admin Reports Only • Widget Bot uses separate AI Settings</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Enable AI Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Enable AI Analysis
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Allow AI-powered insights and recommendations in reports
                    </p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={integrationSettings.isAiEnabled}
                        onChange={(e) => updateSetting('isAiEnabled', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        integrationSettings.isAiEnabled
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                      }`}>
                        {integrationSettings.isAiEnabled && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                {/* AI Provider Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    AI Provider
                  </label>
                  <select
                    value={integrationSettings.aiProvider}
                    onChange={(e) => updateSetting('aiProvider', e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="openai">OpenAI (GPT-3.5 Turbo)</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Choose which AI service to use for analysis
                  </p>
                </div>

                {/* AI API Key */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <Input
                      type={showIntegrationKeys.aiApiKey ? 'text' : 'password'}
                      value={integrationSettings.aiApiKey}
                      onChange={(e) => updateSetting('aiApiKey', e.target.value)}
                      className="w-full h-11 pr-12 rounded-xl border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                      placeholder={`Enter ${integrationSettings.aiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API Key`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowIntegrationKeys({ ...showIntegrationKeys, aiApiKey: !showIntegrationKeys.aiApiKey })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showIntegrationKeys.aiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {integrationSettings.aiProvider === 'openai' 
                      ? 'Get your API key from platform.openai.com/api-keys'
                      : 'Get your API key from Google AI Studio'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Save Button (hidden, auto-save is active) */}
          <div className="hidden">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all h-11 px-8 rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Integration Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();
