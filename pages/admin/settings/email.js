import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { withAuth } from '../../../lib/withAuth';
import { 
  Mail, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Settings,
  TestTube,
  Save,
  Loader2
} from 'lucide-react';

export default function EmailSettingsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState('assignment');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Email configuration state (editable)
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '465',
    encryption: 'ssl',
    username: '',
    password: '',
    fromAddress: '',
    fromName: '',
    replyTo: '',
    debug: false
  });

  // Load email settings on mount
  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/email');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setEmailConfig({
            host: data.settings.host || '',
            port: data.settings.port?.toString() || '465',
            encryption: data.settings.encryption || 'ssl',
            username: data.settings.username || '',
            password: data.settings.password || '', // Will be masked
            fromAddress: data.settings.fromAddress || '',
            fromName: data.settings.fromName || '',
            replyTo: data.settings.replyTo || '',
            debug: data.settings.debug || false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/admin/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: emailConfig.host.trim(),
          port: parseInt(emailConfig.port, 10),
          encryption: emailConfig.encryption,
          username: emailConfig.username.trim(),
          password: emailConfig.password && emailConfig.password !== '••••••••••••••••' ? emailConfig.password.trim() : undefined,
          fromAddress: emailConfig.fromAddress.trim(),
          fromName: emailConfig.fromName.trim(),
          replyTo: emailConfig.replyTo.trim() || null,
          debug: emailConfig.debug
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSaveResult({
          success: true,
          message: 'Email settings saved successfully!'
        });
        // Reload settings to get updated values
        await fetchEmailSettings();
      } else {
        setSaveResult({
          success: false,
          message: data.message || 'Failed to save email settings'
        });
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'Failed to save email settings',
        error: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setEmailConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestResult({
        success: false,
        message: 'Please enter a valid email address'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType,
          recipientEmail: testEmail
        })
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to send test email',
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Email Settings - WZATCO Admin</title>
      </Head>
      <AdminLayout currentPage="Email Settings">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Mail className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              Email Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Configure and test email notifications</p>
          </div>

          {/* Email Configuration */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Amazon SES SMTP Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        SMTP Host <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={emailConfig.host}
                        onChange={(e) => handleConfigChange('host', e.target.value)}
                        placeholder="email-smtp.ap-south-1.amazonaws.com"
                        className="bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        SMTP Port <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        value={emailConfig.port}
                        onChange={(e) => handleConfigChange('port', e.target.value)}
                        placeholder="465"
                        className="bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Encryption <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={emailConfig.encryption}
                        onChange={(e) => handleConfigChange('encryption', e.target.value)}
                        className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="ssl">SSL</option>
                        <option value="tls">TLS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        SMTP Username <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={emailConfig.username}
                        onChange={(e) => handleConfigChange('username', e.target.value)}
                        placeholder="SMTP Username"
                        className="bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        SMTP Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={emailConfig.password}
                          onChange={(e) => handleConfigChange('password', e.target.value)}
                          placeholder={emailConfig.password === '••••••••••••••••' ? 'Enter new password or leave blank to keep current' : 'Enter password'}
                          className="bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {emailConfig.password === '••••••••••••••••' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Leave blank to keep current password, or enter new password
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        From Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        value={emailConfig.fromAddress}
                        onChange={(e) => handleConfigChange('fromAddress', e.target.value)}
                        placeholder="no-reply@wzatco.com"
                        className="bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        From Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={emailConfig.fromName}
                        onChange={(e) => handleConfigChange('fromName', e.target.value)}
                        placeholder="Wzatco Support Desk"
                        className="bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Reply-To Address
                      </label>
                      <Input
                        type="email"
                        value={emailConfig.replyTo}
                        onChange={(e) => handleConfigChange('replyTo', e.target.value)}
                        placeholder="support@wzatco.com"
                        className="bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="debug"
                      checked={emailConfig.debug}
                      onChange={(e) => handleConfigChange('debug', e.target.checked)}
                      className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600"
                    />
                    <label htmlFor="debug" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Enable Debug Mode
                    </label>
                  </div>
                  
                  {/* Save Button and Result */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <strong>Note:</strong> Changes are saved to the database and will override environment variables.
                      </p>
                      <Button
                        onClick={handleSave}
                        disabled={saving || !emailConfig.host || !emailConfig.port || !emailConfig.username || !emailConfig.fromAddress || !emailConfig.fromName}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Configuration
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {saveResult && (
                      <div className={`mt-4 p-4 rounded-xl border-2 ${
                        saveResult.success
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}>
                        <div className="flex items-start gap-3">
                          {saveResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-semibold ${
                              saveResult.success
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-red-800 dark:text-red-200'
                            }`}>
                              {saveResult.success ? 'Settings Saved!' : 'Save Failed'}
                            </p>
                            <p className={`text-sm mt-1 ${
                              saveResult.success
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}>
                              {saveResult.message}
                            </p>
                            {saveResult.error && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono">
                                {saveResult.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TestTube className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Test Email Functionality
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Recipient Email Address
                  </label>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Test Email Type
                  </label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="assignment">Ticket Assignment</option>
                    <option value="status_change">Status Change</option>
                    <option value="mention">Mention Notification</option>
                    <option value="sla_risk">SLA Risk Alert</option>
                  </select>
                </div>
                <Button
                  onClick={handleTestEmail}
                  disabled={testing || !testEmail}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {testing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending Test Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>

                {/* Test Result */}
                {testResult && (
                  <div className={`p-4 rounded-xl border-2 ${
                    testResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-start gap-3">
                      {testResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          testResult.success
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          {testResult.success ? 'Test Email Sent Successfully!' : 'Test Email Failed'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          testResult.success
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {testResult.message}
                        </p>
                        {testResult.messageId && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-mono">
                            Message ID: {testResult.messageId}
                          </p>
                        )}
                        {testResult.error && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono">
                            Error: {testResult.error}
                          </p>
                        )}
                        {testResult.connectionOk === false && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                            <strong>Connection Issue:</strong> Please verify your SMTP credentials and network connection.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Email Templates Preview */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Email Notification Types
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Ticket Assignment</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Sent when a ticket is assigned to an agent
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Status Change</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Sent when ticket status is updated
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">@Mention</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Sent when someone is mentioned in a comment
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">SLA Risk Alert</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Sent when a ticket is at risk of breaching SLA
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();


