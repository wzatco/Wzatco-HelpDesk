import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Settings, Save, CheckCircle, AlertCircle, Loader2, Shield, Brain, Key, Eye, EyeOff, Upload, X, Ticket, Bell, Lock } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    appTitle: '',
    appEmail: ''
  });
  const [captchaSettings, setCaptchaSettings] = useState({
    captchaLength: 6,
    captchaType: 'alphanumeric',
    enabledPlacements: {
      adminLogin: true,
      customerTicket: false,
      passwordReset: false
    }
  });
  const [aiSettings, setAiSettings] = useState({
    apiKeys: {
      openai: '',
      anthropic: '',
      google: '',
      custom: ''
    },
    aiEnabled: false
  });
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false,
    google: false,
    custom: false
  });
  const [fileUploadSettings, setFileUploadSettings] = useState({
    maxUploadSize: '10',
    allowedFileTypes: [],
    clientPhoneUpload: true,
    ticketFileUpload: true
  });
  const [newFileType, setNewFileType] = useState('');
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
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle scroll to section on mount and hash change
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const sectionId = hash.substring(1); // Remove the #
      setActiveSection(sectionId);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300); // Small delay to ensure page is loaded
    }
  }, []);

  // Track if hash change is from user click (should scroll) or from scroll detection (shouldn't scroll)
  const isUserNavigation = useRef(true);

  // Handle hash changes (only scroll if it's from user navigation, not scroll detection)
  useEffect(() => {
    const handleHashChange = () => {
      if (!isUserNavigation.current) {
        isUserNavigation.current = true; // Reset flag
        return; // Don't scroll if hash was updated by scroll detection
      }

      const hash = window.location.hash;
      if (hash) {
        const sectionId = hash.substring(1);
        setActiveSection(sectionId);
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Intersection Observer to detect which section is in viewport
  useEffect(() => {
    const sections = [
      'basic-settings',
      'captcha-settings',
      'ai-settings',
      'file-upload-settings',
      'ticket-settings',
      'notification-settings',
      'security-settings'
    ];

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px', // Trigger when section is in upper 40% of viewport
      threshold: 0
    };

    const observerCallback = (entries) => {
      // Find the section that is most visible in the viewport
      let maxVisible = 0;
      let activeId = '';

      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxVisible) {
          maxVisible = entry.intersectionRatio;
          activeId = entry.target.id;
        }
      });

      // Also check all sections to find the one closest to the top
      if (!activeId) {
        const scrollPosition = window.scrollY + 100; // Offset for header
        let closestSection = '';
        let closestDistance = Infinity;

        sections.forEach(sectionId => {
          const element = document.getElementById(sectionId);
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const distance = Math.abs(elementTop - scrollPosition);

            if (elementTop <= scrollPosition + 200 && distance < closestDistance) {
              closestDistance = distance;
              closestSection = sectionId;
            }
          }
        });

        if (closestSection) {
          activeId = closestSection;
        }
      }

      if (activeId && activeId !== activeSection) {
        setActiveSection(activeId);
        // Update URL hash without triggering scroll
        if (window.location.hash !== `#${activeId}`) {
          isUserNavigation.current = false; // Mark as programmatic update
          window.history.replaceState(null, '', `#${activeId}`);
        }
      }
    };

    const observers = sections.map(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) {
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        observer.observe(element);
        return observer;
      }
      return null;
    }).filter(Boolean);

    // Also add scroll listener as fallback
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPosition = window.scrollY + 150; // Offset for header
        let closestSection = '';
        let closestDistance = Infinity;

        sections.forEach(sectionId => {
          const element = document.getElementById(sectionId);
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const distance = Math.abs(elementTop - scrollPosition);

            // Check if section is in viewport and closest to top
            if (rect.top <= 200 && rect.bottom >= 0 && distance < closestDistance) {
              closestDistance = distance;
              closestSection = sectionId;
            }
          }
        });

        if (closestSection && closestSection !== activeSection) {
          setActiveSection(closestSection);
          if (window.location.hash !== `#${closestSection}`) {
            isUserNavigation.current = false; // Mark as programmatic update
            window.history.replaceState(null, '', `#${closestSection}`);
          }
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observers.forEach(observer => observer.disconnect());
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeSection]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch basic settings
      const basicResponse = await fetch('/api/admin/settings/basic');
      const basicData = await basicResponse.json();
      
      if (basicData.success) {
        setSettings(basicData.settings);
      } else {
        showNotification('error', basicData.message || 'Failed to fetch basic settings');
      }

      // Fetch captcha settings
      const captchaResponse = await fetch('/api/admin/settings/captcha');
      const captchaData = await captchaResponse.json();
      
      if (captchaData.success) {
        setCaptchaSettings({
          captchaLength: captchaData.settings.captchaLength || 6,
          captchaType: captchaData.settings.captchaType || 'alphanumeric',
          enabledPlacements: captchaData.settings.enabledPlacements || {
            adminLogin: true,
            customerTicket: false,
            passwordReset: false
          }
        });
      }

      // Fetch AI settings
      const aiResponse = await fetch('/api/admin/settings/ai');
      const aiData = await aiResponse.json();
      
      if (aiData.success) {
        setAiSettings(aiData.settings);
      }

      // Fetch file upload settings
      const fileUploadResponse = await fetch('/api/admin/settings/file-upload');
      const fileUploadData = await fileUploadResponse.json();
      
      if (fileUploadData.success) {
        setFileUploadSettings(fileUploadData.settings);
      }

      // Fetch ticket settings
      const ticketResponse = await fetch('/api/admin/settings/ticket');
      const ticketData = await ticketResponse.json();
      
      if (ticketData.success) {
        setTicketSettings(ticketData.settings);
      }

      // Fetch notification settings
      const notificationResponse = await fetch('/api/admin/settings/notification');
      const notificationData = await notificationResponse.json();
      
      if (notificationData.success) {
        setNotificationSettings(notificationData.settings);
      }

      // Fetch security settings
      const securityResponse = await fetch('/api/admin/settings/security');
      const securityData = await securityResponse.json();
      
      if (securityData.success) {
        setSecuritySettings(securityData.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('error', 'An error occurred while fetching settings');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save captcha placement settings
  const handleCaptchaPlacementChange = async (placement, enabled) => {
    const updatedPlacements = {
      ...(captchaSettings.enabledPlacements || {}),
      [placement]: enabled
    };

    // Update local state immediately for instant UI feedback
    setCaptchaSettings({
      ...captchaSettings,
      enabledPlacements: updatedPlacements
    });

    // Save to backend
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
        // Revert on failure
        fetchSettings();
      }
    } catch (error) {
      console.error('Error updating captcha placement:', error);
      showNotification('error', 'An error occurred while updating captcha placement');
      // Revert on failure
      fetchSettings();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotification({ type: null, message: '' });

    try {
      // Save basic settings
      const basicResponse = await fetch('/api/admin/settings/basic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appTitle: settings.appTitle,
          appEmail: settings.appEmail
        })
      });

      const basicData = await basicResponse.json();

      if (!basicResponse.ok) {
        showNotification('error', basicData.message || 'Failed to save basic settings');
        setSaving(false);
        return;
      }

      // Save captcha settings
      const captchaResponse = await fetch('/api/admin/settings/captcha', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captchaLength: captchaSettings.captchaLength,
          captchaType: captchaSettings.captchaType,
          enabledPlacements: captchaSettings.enabledPlacements
        })
      });

      const captchaData = await captchaResponse.json();

      if (!captchaResponse.ok) {
        showNotification('error', captchaData.message || 'Failed to save captcha settings');
        setSaving(false);
        return;
      }

      // Save AI settings
      const aiResponse = await fetch('/api/admin/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeys: aiSettings.apiKeys,
          aiEnabled: aiSettings.aiEnabled
        })
      });

      const aiData = await aiResponse.json();

      if (!aiResponse.ok) {
        showNotification('error', aiData.message || 'Failed to save AI settings');
        setSaving(false);
        return;
      }

      // Save file upload settings
      const fileUploadResponse = await fetch('/api/admin/settings/file-upload', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUploadSize: fileUploadSettings.maxUploadSize,
          allowedFileTypes: fileUploadSettings.allowedFileTypes,
          clientPhoneUpload: fileUploadSettings.clientPhoneUpload,
          ticketFileUpload: fileUploadSettings.ticketFileUpload
        })
      });

      const fileUploadData = await fileUploadResponse.json();

      if (!fileUploadResponse.ok) {
        showNotification('error', fileUploadData.message || 'Failed to save file upload settings');
        setSaving(false);
        return;
      }

      // Save ticket settings
      const ticketResponse = await fetch('/api/admin/settings/ticket', {
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

      const ticketData = await ticketResponse.json();

      if (!ticketResponse.ok) {
        showNotification('error', ticketData.message || 'Failed to save ticket settings');
        setSaving(false);
        return;
      }

      // Save notification settings
      const notificationResponse = await fetch('/api/admin/settings/notification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationEnabled: notificationSettings.notificationEnabled,
          triggers: notificationSettings.triggers
        })
      });

      const notificationData = await notificationResponse.json();

      if (!notificationResponse.ok) {
        showNotification('error', notificationData.message || 'Failed to save notification settings');
        setSaving(false);
        return;
      }

      // Save security settings
      const securityResponse = await fetch('/api/admin/settings/security', {
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

      const securityData = await securityResponse.json();

      if (basicResponse.ok && captchaResponse.ok && aiResponse.ok && fileUploadResponse.ok && ticketResponse.ok && notificationResponse.ok && securityResponse.ok) {
        showNotification('success', 'Settings saved successfully');
      } else {
        showNotification('error', securityData.message || 'Failed to save security settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('error', 'An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, 3000);
  };

  return (
    <>
      <PageHead title="Settings" description="System settings and configuration" />
      
      <AdminLayout currentPage="Settings">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Settings className="w-8 h-8 text-violet-600" />
                Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Configure your help desk system</p>
            </div>
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <Card id="basic-settings" className="border border-violet-200 dark:border-slate-700 shadow-xl dark:bg-slate-800 bg-white rounded-2xl scroll-mt-6">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Basic Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        App Title *
                      </label>
                      <Input
                        type="text"
                        value={settings.appTitle}
                        onChange={(e) => setSettings({ ...settings, appTitle: e.target.value })}
                        required
                        className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        placeholder="e.g., HelpDesk Pro"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        The title displayed throughout the application
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        App Email *
                      </label>
                      <Input
                        type="email"
                        value={settings.appEmail}
                        onChange={(e) => setSettings({ ...settings, appEmail: e.target.value })}
                        required
                        className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        placeholder="e.g., support@helpdesk.com"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        The default support email address for the application
                      </p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed h-11 px-6 rounded-xl"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Captcha Settings */}
              <Card id="captcha-settings" className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl mt-6 scroll-mt-6">
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

                    {/* Captcha Placements */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Captcha Placements
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Choose where to show captcha verification to protect against automated attacks and spam.
                      </p>
                      <div className="space-y-3">
                        {/* Admin Login */}
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

                        {/* Customer Ticket Creation */}
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

                        {/* Password Reset */}
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
                  </div>
                </CardContent>
              </Card>

              {/* AI Settings */}
              <Card id="ai-settings" className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl mt-6 scroll-mt-6">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">AI Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Enable/Disable AI */}
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

                    {/* API Keys */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          API Keys
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                          Configure API keys for AI services. Keys are stored securely and can be masked for privacy.
                        </p>
                      </div>

                      {/* OpenAI API Key */}
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
                            placeholder="sk-..."
                            className="w-full h-11 rounded-xl border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKeys({ ...showApiKeys, openai: !showApiKeys.openai })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Anthropic API Key */}
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

                      {/* Google API Key */}
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

                      {/* Custom API Key */}
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
                  </div>
                </CardContent>
              </Card>

              {/* File Upload Settings */}
              <Card id="file-upload-settings" className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl mt-6 scroll-mt-6">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">File Upload Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Max Upload Size */}
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

                    {/* Allowed File Types */}
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

                    {/* Client Phone Upload Toggle */}
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

                    {/* Ticket File Upload Toggle */}
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
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Settings */}
              <Card id="ticket-settings" className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl mt-6 scroll-mt-6">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Ticket Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Any Staff Can Reply */}
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
                          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                            ticketSettings.anyStaffCanReply
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

                    {/* Hide Priority Input for Customer */}
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
                          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                            ticketSettings.hidePriorityCustomer
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

                    {/* Hide Priority in Admin Panel */}
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
                          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                            ticketSettings.hidePriorityAdmin
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

                    {/* Auto-Close Tickets */}
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
                          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                            ticketSettings.autoCloseEnabled
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

                    {/* Auto-Close Rule */}
                    {ticketSettings.autoCloseEnabled && (
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
                    )}

                    {/* Editable Closing Message */}
                    {ticketSettings.autoCloseEnabled && (
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
                    )}

                    {/* User Max Open Tickets Limit */}
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

                    {/* User Can Re-Open Tickets */}
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
                          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                            ticketSettings.userCanReopen
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

                    {/* Re-Open Time */}
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

                    {/* Positive Feedback Message */}
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

                    {/* Negative Feedback Message */}
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
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card id="notification-settings" className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl mt-6 scroll-mt-6">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Enable/Disable Notification System */}
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

                    {/* Notification Triggers */}
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
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card id="security-settings" className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl mt-6 scroll-mt-6">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Security Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Admin Login Security */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Admin Login Security
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Enable security features for admin login (captcha, rate limiting, etc.)
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

                    {/* Temporary Account Lock */}
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

                    {/* Account Lock Settings */}
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

                    {/* DoS Attack Protection */}
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

                    {/* Spam Email Blocklist */}
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
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
