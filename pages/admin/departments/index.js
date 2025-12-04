import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { withAuth } from '../../../lib/withAuth';
import { 
  Building2, 
  Plus, 
  Search as SearchIcon, 
  Edit,
  Trash2,
  Users,
  Ticket as TicketIcon,
  Clock,
  Calendar,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  X
} from 'lucide-react';

// SLA & Working Hours Configuration Component
function SLAWorkingHoursConfig({ departmentId, departmentData, onUpdate }) {
  const [slaConfig, setSlaConfig] = useState({
    low: { 
      responseTime: 4, 
      responseTimeUnit: 'hours', 
      resolutionTime: 2, 
      resolutionTimeUnit: 'days',
      useBusinessHours: true
    },
    medium: { 
      responseTime: 2, 
      responseTimeUnit: 'hours', 
      resolutionTime: 1, 
      resolutionTimeUnit: 'days',
      useBusinessHours: true
    },
    high: { 
      responseTime: 1, 
      responseTimeUnit: 'hours', 
      resolutionTime: 8, 
      resolutionTimeUnit: 'hours',
      useBusinessHours: true
    },
    urgent: { 
      responseTime: 15, 
      responseTimeUnit: 'minutes', 
      resolutionTime: 4, 
      resolutionTimeUnit: 'hours',
      useBusinessHours: true
    }
  });
  const [workingHours, setWorkingHours] = useState({
    monday: { enabled: true, start: '09:00', end: '18:00' },
    tuesday: { enabled: true, start: '09:00', end: '18:00' },
    wednesday: { enabled: true, start: '09:00', end: '18:00' },
    thursday: { enabled: true, start: '09:00', end: '18:00' },
    friday: { enabled: true, start: '09:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '18:00' },
    sunday: { enabled: false, start: '09:00', end: '18:00' }
  });
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });

  useEffect(() => {
    if (departmentData) {
      if (departmentData.slaConfig) {
        // Handle backward compatibility - if old format (just numbers), convert to new format
        const config = departmentData.slaConfig;
        const migratedConfig = {};
        const defaults = {
          low: { responseTime: 4, responseTimeUnit: 'hours', resolutionTime: 2, resolutionTimeUnit: 'days', useBusinessHours: true },
          medium: { responseTime: 2, responseTimeUnit: 'hours', resolutionTime: 1, resolutionTimeUnit: 'days', useBusinessHours: true },
          high: { responseTime: 1, responseTimeUnit: 'hours', resolutionTime: 8, resolutionTimeUnit: 'hours', useBusinessHours: true },
          urgent: { responseTime: 15, responseTimeUnit: 'minutes', resolutionTime: 4, resolutionTimeUnit: 'hours', useBusinessHours: true }
        };
        
        ['low', 'medium', 'high', 'urgent'].forEach(priority => {
          if (config[priority]) {
            if (typeof config[priority] === 'object' && config[priority].responseTimeUnit) {
              // New format already
              migratedConfig[priority] = {
                ...defaults[priority],
                ...config[priority],
                useBusinessHours: config[priority].useBusinessHours !== false
              };
            } else {
              // Old format - convert minutes to hours/days
              const responseTime = config[priority].responseTime || 0;
              const resolutionTime = config[priority].resolutionTime || 0;
              migratedConfig[priority] = {
                responseTime: responseTime < 60 ? responseTime : Math.round(responseTime / 60),
                responseTimeUnit: responseTime < 60 ? 'minutes' : responseTime < 1440 ? 'hours' : 'days',
                resolutionTime: resolutionTime < 60 ? resolutionTime : Math.round(resolutionTime / 60),
                resolutionTimeUnit: resolutionTime < 60 ? 'minutes' : resolutionTime < 1440 ? 'hours' : 'days',
                useBusinessHours: config[priority].useBusinessHours !== false
              };
            }
          } else {
            // Use default values if not set
            migratedConfig[priority] = defaults[priority];
          }
        });
        setSlaConfig(migratedConfig);
      }
      if (departmentData.workingHours) {
        setWorkingHours(departmentData.workingHours);
      }
      if (departmentData.holidays) {
        setHolidays(Array.isArray(departmentData.holidays) ? departmentData.holidays : []);
      }
    }
  }, [departmentData]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/departments/${departmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slaConfig,
          workingHours,
          holidays
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Configuration saved successfully');
        if (onUpdate) {
          await onUpdate(departmentId);
        }
      } else {
        showNotification('error', data.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      showNotification('error', 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday].sort());
      setNewHoliday('');
    }
  };

  const removeHoliday = (date) => {
    setHolidays(holidays.filter(h => h !== date));
  };

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  return (
    <div className="space-y-6">
      {/* Dark mode styles for time/date input icons */}
      <style dangerouslySetInnerHTML={{__html: `
        html.dark input[type="date"]::-webkit-calendar-picker-indicator,
        html.dark input[type="date"]::-webkit-inner-spin-button,
        html.dark input[type="date"]::-webkit-clear-button,
        .dark input[type="date"]::-webkit-calendar-picker-indicator,
        .dark input[type="date"]::-webkit-inner-spin-button,
        .dark input[type="date"]::-webkit-clear-button {
          filter: invert(1) brightness(2) contrast(1.5) !important;
          cursor: pointer !important;
          opacity: 1 !important;
          padding: 2px !important;
          background: transparent !important;
        }
        html.dark input[type="date"]::-webkit-calendar-picker-indicator:hover,
        .dark input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1 !important;
          filter: invert(1) brightness(2.5) contrast(1.5) !important;
        }
        html.dark input[type="time"]::-webkit-calendar-picker-indicator,
        html.dark input[type="time"]::-webkit-inner-spin-button,
        html.dark input[type="time"]::-webkit-clear-button,
        .dark input[type="time"]::-webkit-calendar-picker-indicator,
        .dark input[type="time"]::-webkit-inner-spin-button,
        .dark input[type="time"]::-webkit-clear-button {
          filter: invert(1) brightness(2) contrast(1.5) !important;
          cursor: pointer !important;
          opacity: 1 !important;
          padding: 2px !important;
          background: transparent !important;
        }
        html.dark input[type="time"]::-webkit-calendar-picker-indicator:hover,
        .dark input[type="time"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1 !important;
          filter: invert(1) brightness(2.5) contrast(1.5) !important;
        }
        html.dark input[type="time"],
        html.dark input[type="date"],
        .dark input[type="time"],
        .dark input[type="date"] {
          color-scheme: dark !important;
        }
        html.dark input[type="time"]::-webkit-datetime-edit-text,
        html.dark input[type="time"]::-webkit-datetime-edit-hour-field,
        html.dark input[type="time"]::-webkit-datetime-edit-minute-field,
        html.dark input[type="time"]::-webkit-datetime-edit-ampm-field,
        html.dark input[type="date"]::-webkit-datetime-edit-text,
        html.dark input[type="date"]::-webkit-datetime-edit-day-field,
        html.dark input[type="date"]::-webkit-datetime-edit-month-field,
        html.dark input[type="date"]::-webkit-datetime-edit-year-field,
        .dark input[type="time"]::-webkit-datetime-edit-text,
        .dark input[type="time"]::-webkit-datetime-edit-hour-field,
        .dark input[type="time"]::-webkit-datetime-edit-minute-field,
        .dark input[type="time"]::-webkit-datetime-edit-ampm-field,
        .dark input[type="date"]::-webkit-datetime-edit-text,
        .dark input[type="date"]::-webkit-datetime-edit-day-field,
        .dark input[type="date"]::-webkit-datetime-edit-month-field,
        .dark input[type="date"]::-webkit-datetime-edit-year-field {
          color: rgb(255, 255, 255) !important;
        }
      `}} />
      {/* Notification Toast */}
      <NotificationToast 
        notification={notification} 
        onClose={() => setNotification({ type: null, message: '' })} 
      />

      {/* SLA Configuration */}
      <div>
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          SLA Configuration (ZOHO Style)
        </h4>
        <div className="space-y-4">
          {['urgent', 'high', 'medium', 'low'].map((priority) => (
            <div key={priority} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
              <div className="mb-3">
                <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                  {priority} Priority
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Response Time */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Response Time
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={slaConfig[priority]?.responseTime || 0}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: { ...slaConfig[priority], responseTime: parseInt(e.target.value) || 0 }
                      })}
                      className="flex-1 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                    <select
                      value={slaConfig[priority]?.responseTimeUnit || 'hours'}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: { ...slaConfig[priority], responseTimeUnit: e.target.value }
                      })}
                      className="px-3 py-2 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none text-sm"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                {/* Resolution Time */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Resolution Time
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={slaConfig[priority]?.resolutionTime || 0}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: { ...slaConfig[priority], resolutionTime: parseInt(e.target.value) || 0 }
                      })}
                      className="flex-1 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                    <select
                      value={slaConfig[priority]?.resolutionTimeUnit || 'days'}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: { ...slaConfig[priority], resolutionTimeUnit: e.target.value }
                      })}
                      className="px-3 py-2 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none text-sm"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Business Hours Toggle */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={slaConfig[priority]?.useBusinessHours !== false}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: { ...slaConfig[priority], useBusinessHours: e.target.checked }
                      })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      slaConfig[priority]?.useBusinessHours !== false
                        ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                    }`}>
                      {slaConfig[priority]?.useBusinessHours !== false && (
                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Calculate based on business hours (exclude holidays and non-working hours)
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Working Hours */}
      <div>
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          Working Hours
        </h4>
        <div className="space-y-3">
          {daysOfWeek.map((day) => (
            <div key={day.key} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 w-32">
                <label className="cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={workingHours[day.key]?.enabled || false}
                      onChange={(e) => setWorkingHours({
                        ...workingHours,
                        [day.key]: { ...workingHours[day.key], enabled: e.target.checked }
                      })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      workingHours[day.key]?.enabled
                        ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                    }`}>
                      {workingHours[day.key]?.enabled && (
                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  setWorkingHours({
                    ...workingHours,
                    [day.key]: { ...workingHours[day.key], enabled: !workingHours[day.key]?.enabled }
                  });
                }}>
                  {day.label}
                </label>
              </div>
              {workingHours[day.key]?.enabled && (
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative w-32">
                    <Input
                      type="time"
                      value={workingHours[day.key]?.start || '09:00'}
                      onChange={(e) => setWorkingHours({
                        ...workingHours,
                        [day.key]: { ...workingHours[day.key], start: e.target.value }
                      })}
                      className="w-full pr-9 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.previousElementSibling;
                        if (input) {
                          input.focus();
                          input.showPicker?.();
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 cursor-pointer hover:opacity-70 transition-opacity"
                      aria-label="Open time picker"
                    >
                      <Clock className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                    </button>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400">to</span>
                  <div className="relative w-32">
                    <Input
                      type="time"
                      value={workingHours[day.key]?.end || '18:00'}
                      onChange={(e) => setWorkingHours({
                        ...workingHours,
                        [day.key]: { ...workingHours[day.key], end: e.target.value }
                      })}
                      className="w-full pr-9 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.previousElementSibling;
                        if (input) {
                          input.focus();
                          input.showPicker?.();
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 cursor-pointer hover:opacity-70 transition-opacity"
                      aria-label="Open time picker"
                    >
                      <Clock className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div>
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          Holidays
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                className="w-full pr-9 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                placeholder="Select holiday date"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.previousElementSibling;
                  if (input) {
                    input.focus();
                    input.showPicker?.();
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 cursor-pointer hover:opacity-70 transition-opacity"
                aria-label="Open date picker"
              >
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              </button>
            </div>
            <Button
              type="button"
              onClick={addHoliday}
              disabled={!newHoliday}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          {holidays.length > 0 ? (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div key={holiday} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(holiday).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeHoliday(holiday)}
                    className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No holidays configured
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [activeTab, setActiveTab] = useState('list'); // 'list' or department ID
  const [openTabs, setOpenTabs] = useState([]); // Array of { id, name, data }
  const [loadingDetails, setLoadingDetails] = useState({}); // Map of department ID to loading state
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/departments?includeStats=true');
      const data = await response.json();
      
      if (response.ok) {
        setDepartments(data.departments || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      showNotification('error', 'An error occurred while fetching departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentDetails = async (id, openNewTab = false) => {
    // Check if tab already exists
    const existingTab = openTabs.find(tab => tab.id === id);
    if (existingTab && !openNewTab) {
      setActiveTab(id);
      return;
    }

    try {
      setLoadingDetails(prev => ({ ...prev, [id]: true }));
      const response = await fetch(`/api/admin/departments/${id}?includeAgents=true&includeStats=true`);
      const data = await response.json();
      
      if (response.ok) {
        const department = data.department;
        // Add or update tab
        setOpenTabs(prev => {
          const existingIndex = prev.findIndex(tab => tab.id === id);
          if (existingIndex >= 0) {
            // Update existing tab
            const updated = [...prev];
            updated[existingIndex] = { id, name: department.name, data: department };
            return updated;
          } else {
            // Add new tab
            return [...prev, { id, name: department.name, data: department }];
          }
        });
        setActiveTab(id);
      } else {
        showNotification('error', data.message || 'Failed to fetch department details');
      }
    } catch (error) {
      console.error('Error fetching department details:', error);
      showNotification('error', 'An error occurred while fetching department details');
    } finally {
      setLoadingDetails(prev => ({ ...prev, [id]: false }));
    }
  };

  const closeTab = (tabId, e) => {
    e.stopPropagation();
    setOpenTabs(prev => prev.filter(tab => tab.id !== tabId));
    // If closing active tab, switch to list or another tab
    if (activeTab === tabId) {
      const remainingTabs = openTabs.filter(tab => tab.id !== tabId);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : 'list');
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim() === '') {
      showNotification('error', 'Department name is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          isActive: formData.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Department created successfully');
        setShowAddModal(false);
        setFormData({ name: '', description: '', isActive: true });
        await fetchDepartments();
        // Notify sidebar to refresh departments
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('departmentUpdated'));
        }
        // Automatically open tab for newly created department
        if (data.department && data.department.id) {
          await fetchDepartmentDetails(data.department.id, true);
        }
      } else {
        showNotification('error', data.message || 'Failed to create department');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      showNotification('error', 'An error occurred while creating the department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim() === '') {
      showNotification('error', 'Department name is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/departments/${selectedDepartment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          isActive: formData.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Department updated successfully');
        setShowEditModal(false);
        setSelectedDepartment(null);
        setFormData({ name: '', description: '', isActive: true });
        await fetchDepartments();
        // Notify sidebar to refresh departments
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('departmentUpdated'));
        }
        // Update the tab if it's open
        const tabIndex = openTabs.findIndex(tab => tab.id === selectedDepartment.id);
        if (tabIndex >= 0) {
          await fetchDepartmentDetails(selectedDepartment.id, true);
        }
      } else {
        showNotification('error', data.message || 'Failed to update department');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      showNotification('error', 'An error occurred while updating the department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/departments/${selectedDepartment.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Department deleted successfully');
        setShowDeleteModal(false);
        const deletedId = selectedDepartment.id;
        setSelectedDepartment(null);
        await fetchDepartments();
        // Notify sidebar to refresh departments
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('departmentUpdated'));
        }
        // Close tab if it was open
        const tabToClose = openTabs.find(tab => tab.id === deletedId);
        if (tabToClose) {
          setOpenTabs(prev => prev.filter(tab => tab.id !== deletedId));
          // If closing active tab, switch to list or another tab
          if (activeTab === deletedId) {
            const remainingTabs = openTabs.filter(tab => tab.id !== deletedId);
            setActiveTab(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : 'list');
          }
        }
      } else {
        showNotification('error', data.message || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      showNotification('error', 'An error occurred while deleting the department');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (dept) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      isActive: dept.isActive
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (dept) => {
    setSelectedDepartment(dept);
    setShowDeleteModal(true);
  };

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (dept.description && dept.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'pending': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'resolved': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      case 'closed': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <AdminLayout currentPage="Departments">
      <Head>
        <title>Departments - Admin Panel</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-none mx-auto space-y-6 p-6">
          {/* Enhanced Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-2">Departments</h1>
                  <p className="text-violet-100 dark:text-violet-200 text-base sm:text-lg">Manage departments, teams, and routing rules</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button 
                    onClick={() => {
                      setFormData({ name: '', description: '', isActive: true });
                      setShowAddModal(true);
                    }}
                    className="bg-white text-violet-700 hover:bg-violet-50 dark:bg-white dark:text-violet-800 dark:hover:bg-violet-100 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Add Department
                  </Button>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-2">
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'list'
                ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Departments
          </button>
          {openTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.name}</span>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors"
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
            ))}
            </div>
          </div>

          {/* List View */}
          {activeTab === 'list' && (
            <>
              {/* Search & Filter Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search departments by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Departments Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 animate-pulse">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : filteredDepartments.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-12 text-center">
                  <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    No departments found
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {searchQuery ? 'Try adjusting your search query' : 'Get started by creating your first department'}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => {
                        setFormData({ name: '', description: '', isActive: true });
                        setShowAddModal(true);
                      }}
                      className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Department
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDepartments.map((dept) => (
                    <div
                      key={dept.id} 
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => fetchDepartmentDetails(dept.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                              {dept.name}
                            </h3>
                          </div>
                          {dept.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                              {dept.description}
                            </p>
                          )}
                        </div>
                        <Badge className={`${dept.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'} border-0`}>
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {dept.stats && (
                        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              {dept.stats.total}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Total Tickets</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                              {dept.stats.open}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Open</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(dept);
                          }}
                          className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 text-sm font-medium transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(dept);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Details View */}
          {activeTab !== 'list' && (() => {
            const currentTab = openTabs.find(tab => tab.id === activeTab);
            if (!currentTab) return null;
            const departmentDetails = currentTab.data;
            const isLoading = loadingDetails[activeTab];
            
            return (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                  </div>
                ) : (
                  <>
                    {/* Department Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {departmentDetails.name}
                          </h2>
                        </div>
                        <Badge className={`${departmentDetails.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'} border-0`}>
                          {departmentDetails.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="space-y-4">
                    {departmentDetails.description && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Description</label>
                        <p className="text-slate-900 dark:text-white mt-1">{departmentDetails.description}</p>
                      </div>
                    )}
                    
                    {departmentDetails.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <div className="text-3xl font-bold text-slate-900 dark:text-white">
                            {departmentDetails.stats.total}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Total Tickets</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                            {departmentDetails.stats.open}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Open</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {departmentDetails.stats.pending}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Pending</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {departmentDetails.stats.resolved}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Resolved</div>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>

                  {/* Agents */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Agents ({departmentDetails.agents?.length || 0})
                      </h3>
                    </div>
                    <div>
                    {departmentDetails.agents && departmentDetails.agents.length > 0 ? (
                      <div className="space-y-2">
                        {departmentDetails.agents.map((agent) => (
                          <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                {agent.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">{agent.name}</div>
                                {agent.email && (
                                  <div className="text-sm text-slate-600 dark:text-slate-400">{agent.email}</div>
                                )}
                              </div>
                            </div>
                            <Badge className={agent.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}>
                              {agent.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400 text-center py-8">
                        No agents assigned to this department
                      </p>
                    )}
                    </div>
                  </div>

                    {/* SLA & Working Hours Configuration */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <Settings className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          SLA & Working Hours Configuration
                        </h3>
                      </div>
                      <SLAWorkingHoursConfig 
                        departmentId={activeTab}
                        departmentData={departmentDetails}
                        onUpdate={fetchDepartmentDetails}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Add Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showAddModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setFormData({ name: '', description: '', isActive: true });
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Department</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', description: '', isActive: true });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddDepartment} className="p-6 space-y-6">
              {/* Department Information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-violet-600" />
                  Department Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., Technical Support, Customer Service"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the department's purpose and responsibilities..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-violet-600" />
                  Status
                </h3>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                      formData.isActive
                        ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                    }`}>
                      {formData.isActive && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Department is active</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Active departments can receive and process tickets</span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', description: '', isActive: true });
                  }}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Add Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDepartment && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-violet-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Edit Department</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEditDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Technical, Operations, Service"
                    className="w-full h-11 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the department..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <label htmlFor="isActiveEdit" className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="isActiveEdit"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        formData.isActive
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                      }`}>
                        {formData.isActive && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Department is active</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Enable this department to receive tickets</span>
                    </div>
                  </label>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    disabled={submitting}
                    className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Updating...' : 'Update Department'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedDepartment && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-700 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Department</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to delete <strong>{selectedDepartment.name}</strong>? This will only work if the department has no agents or tickets assigned.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteDepartment}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Deleting...' : 'Delete Department'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export const getServerSideProps = withAuth();


