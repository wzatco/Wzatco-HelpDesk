import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';

function FileUploadSettingsPage() {
  const [fileUploadSettings, setFileUploadSettings] = useState({
    maxUploadSize: '10',
    allowedFileTypes: [],
    clientPhoneUpload: true,
    ticketFileUpload: true
  });
  const [newFileType, setNewFileType] = useState('');
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
      const response = await fetch('/api/admin/settings/file-upload');
      const data = await response.json();
      
      if (data.success) {
        setFileUploadSettings(data.settings);
      } else {
        showNotification('error', data.message || 'Failed to fetch file upload settings');
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

  const saveFileUploadSettings = async () => {
    setSavingSection('file-upload');
    try {
      const response = await fetch('/api/admin/settings/file-upload', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUploadSize: fileUploadSettings.maxUploadSize,
          allowedFileTypes: fileUploadSettings.allowedFileTypes,
          clientPhoneUpload: fileUploadSettings.clientPhoneUpload,
          ticketFileUpload: fileUploadSettings.ticketFileUpload
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'File upload settings saved');
      } else {
        showNotification('error', data.message || 'Failed to save file upload settings');
      }
    } catch (error) {
      console.error('Error saving file upload settings:', error);
      showNotification('error', 'An error occurred while saving file upload settings');
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
    debouncedSave('file-upload', saveFileUploadSettings);
  }, [fileUploadSettings]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  return (
    <>
      <PageHead title="File Upload Settings" description="Configure file upload restrictions and permissions" />
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Upload className="w-8 h-8 text-violet-600" />
                File Upload Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Configure file upload restrictions and permissions</p>
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
                  <Upload className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">File Upload Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Max Upload Size (MB) *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={fileUploadSettings.maxUploadSize}
                      onChange={(e) => setFileUploadSettings({ 
                        ...fileUploadSettings, 
                        maxUploadSize: e.target.value 
                      })}
                      required
                      className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="10"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Maximum file size allowed for uploads in megabytes (1-1000 MB)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Allowed File Types *
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        type="text"
                        value={newFileType}
                        onChange={(e) => setNewFileType(e.target.value)}
                        placeholder="e.g., image/jpeg, application/pdf"
                        className="flex-1 h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newFileType.trim() && !fileUploadSettings.allowedFileTypes.includes(newFileType.trim())) {
                              setFileUploadSettings({
                                ...fileUploadSettings,
                                allowedFileTypes: [...fileUploadSettings.allowedFileTypes, newFileType.trim()]
                              });
                              setNewFileType('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (newFileType.trim() && !fileUploadSettings.allowedFileTypes.includes(newFileType.trim())) {
                            setFileUploadSettings({
                              ...fileUploadSettings,
                              allowedFileTypes: [...fileUploadSettings.allowedFileTypes, newFileType.trim()]
                            });
                            setNewFileType('');
                          }
                        }}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {fileUploadSettings.allowedFileTypes.map((type, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm border border-violet-200 dark:border-violet-800"
                        >
                          {type}
                          <button
                            type="button"
                            onClick={() => {
                              setFileUploadSettings({
                                ...fileUploadSettings,
                                allowedFileTypes: fileUploadSettings.allowedFileTypes.filter((_, i) => i !== index)
                              });
                            }}
                            className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {fileUploadSettings.allowedFileTypes.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        No file types added. Add MIME types (e.g., image/jpeg, application/pdf)
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Enter MIME types (e.g., image/jpeg, application/pdf, video/mp4). Press Enter or click Add to add a type.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Client Phone Upload
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Allow customers to upload files from their mobile devices
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={fileUploadSettings.clientPhoneUpload}
                          onChange={(e) => setFileUploadSettings({ ...fileUploadSettings, clientPhoneUpload: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          fileUploadSettings.clientPhoneUpload
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {fileUploadSettings.clientPhoneUpload && (
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
                        Ticket File Upload
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Allow file attachments when creating or updating tickets
                      </p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={fileUploadSettings.ticketFileUpload}
                          onChange={(e) => setFileUploadSettings({ ...fileUploadSettings, ticketFileUpload: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          fileUploadSettings.ticketFileUpload
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {fileUploadSettings.ticketFileUpload && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
                    {savingSection === 'file-upload' ? (
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

export default FileUploadSettingsPage;
export const getServerSideProps = withAuth();

