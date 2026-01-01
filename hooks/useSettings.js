import { useState, useEffect } from 'react';

/**
 * Client-side hook to fetch and use settings
 */
export function useSettings() {
  const [settings, setSettings] = useState({
    appTitle: 'HelpDesk Pro',
    appEmail: 'support@helpdesk.com'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/basic');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, refetch: fetchSettings };
}

