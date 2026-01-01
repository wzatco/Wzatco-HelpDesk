import { useState, useEffect } from 'react';
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
  User,
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
      <style dangerouslySetInnerHTML={{
        __html: `
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
                    <div className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${slaConfig[priority]?.useBusinessHours !== false
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
                    <div className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${workingHours[day.key]?.enabled
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
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    departmentHeadId: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [showHeadDropdown, setShowHeadDropdown] = useState(false);
  const [headSearchQuery, setHeadSearchQuery] = useState('');

  useEffect(() => {
    setIsMounted(true);
    fetchDepartments();
    fetchAgents();
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

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      const data = await response.json();

      if (response.ok) {
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
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
          departmentHeadId: formData.departmentHeadId || null,
          isActive: formData.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Department created successfully');
        setShowAddModal(false);
        setFormData({ name: '', description: '', departmentHeadId: '', isActive: true });
        await fetchDepartments();
        // Notify sidebar to refresh departments
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('departmentUpdated'));
        }
        // Navigate to the newly created department page
        if (data.department && data.department.id) {
          router.push(`/admin/departments/${data.department.id}`);
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
          departmentHeadId: formData.departmentHeadId || null,
          isActive: formData.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Department updated successfully');
        setShowEditModal(false);
        setSelectedDepartment(null);
        setFormData({ name: '', description: '', departmentHeadId: '', isActive: true });
        await fetchDepartments();
        // Notify sidebar to refresh departments
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('departmentUpdated'));
        }
        // Navigate to the updated department page
        router.push(`/admin/departments/${selectedDepartment.id}`);
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
      departmentHeadId: dept.departmentHeadId || '',
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
                      setFormData({ name: '', description: '', departmentHeadId: '', isActive: true });
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

          {/* Departments List */}
          <div>
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
                      setFormData({ name: '', description: '', departmentHeadId: '', isActive: true });
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
                    onClick={() => router.push(`/admin/departments/${dept.id}`)}
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
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isMounted && typeof window !== 'undefined' && document.body && showAddModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setFormData({ name: '', description: '', departmentHeadId: '', isActive: true });
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
                  setFormData({ name: '', description: '', departmentHeadId: '', isActive: true });
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

                  {/* Department Head */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Department Head
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowHeadDropdown(!showHeadDropdown)}
                        className="w-full h-11 px-4 rounded-xl border-2 border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent flex items-center justify-between hover:border-violet-300 dark:hover:border-slate-600 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          <span className={formData.departmentHeadId ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                            {formData.departmentHeadId
                              ? agents.find(a => a.id === formData.departmentHeadId)?.name || 'No head assigned'
                              : 'Select department head'}
                          </span>
                        </span>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showHeadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showHeadDropdown && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowHeadDropdown(false)}
                          />

                          {/* Dropdown */}
                          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-hidden">
                            {/* Search */}
                            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                              <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  value={headSearchQuery}
                                  onChange={(e) => setHeadSearchQuery(e.target.value)}
                                  placeholder="Search agents..."
                                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>

                            {/* Options */}
                            <div className="max-h-60 overflow-y-auto">
                              {/* No head option */}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, departmentHeadId: '' });
                                  setShowHeadDropdown(false);
                                  setHeadSearchQuery('');
                                }}
                                className={`w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${!formData.departmentHeadId ? 'bg-violet-50 dark:bg-slate-700' : ''
                                  }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                  <User className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">No head assigned</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Department will have no head</div>
                                </div>
                                {!formData.departmentHeadId && (
                                  <CheckCircle2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                )}
                              </button>

                              {/* Admin options */}
                              {agents
                                .filter(agent =>
                                  !headSearchQuery ||
                                  agent.name.toLowerCase().includes(headSearchQuery.toLowerCase()) ||
                                  agent.email?.toLowerCase().includes(headSearchQuery.toLowerCase())
                                )
                                .map(agent => (
                                  <button
                                    key={agent.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, departmentHeadId: agent.id });
                                      setShowHeadDropdown(false);
                                      setHeadSearchQuery('');
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${formData.departmentHeadId === agent.id ? 'bg-violet-50 dark:bg-slate-700' : ''
                                      }`}
                                  >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                      {agent.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{agent.name}</div>
                                      {agent.email && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{agent.email}</div>
                                      )}
                                    </div>
                                    {formData.departmentHeadId === agent.id && (
                                      <CheckCircle2 className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                    )}
                                  </button>
                                ))}

                              {agents.filter(agent =>
                                !headSearchQuery ||
                                agent.name.toLowerCase().includes(headSearchQuery.toLowerCase()) ||
                                agent.email?.toLowerCase().includes(headSearchQuery.toLowerCase())
                              ).length === 0 && (
                                  <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No agents found</p>
                                  </div>
                                )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
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
                    <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${formData.isActive
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
                    setFormData({ name: '', description: '', departmentHeadId: '', isActive: true });
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
      )
      }

      {/* Edit Modal */}
      {
        showEditModal && selectedDepartment && (
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

                  {/* Department Head */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Department Head
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowHeadDropdown(!showHeadDropdown)}
                        className="w-full h-11 px-4 rounded-xl border-2 border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent flex items-center justify-between hover:border-violet-300 dark:hover:border-slate-600 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          <span className={formData.departmentHeadId ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                            {formData.departmentHeadId
                              ? agents.find(a => a.id === formData.departmentHeadId)?.name || 'No head assigned'
                              : 'Select department head'}
                          </span>
                        </span>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showHeadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showHeadDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowHeadDropdown(false)} />
                          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-hidden">
                            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                              <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  value={headSearchQuery}
                                  onChange={(e) => setHeadSearchQuery(e.target.value)}
                                  placeholder="Search agents..."
                                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => { setFormData({ ...formData, departmentHeadId: '' }); setShowHeadDropdown(false); setHeadSearchQuery(''); }}
                                className={`w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${!formData.departmentHeadId ? 'bg-violet-50 dark:bg-slate-700' : ''}`}
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                  <User className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">No head assigned</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Department will have no head</div>
                                </div>
                                {!formData.departmentHeadId && <CheckCircle2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
                              </button>
                              {agents.filter(agent => !headSearchQuery || agent.name.toLowerCase().includes(headSearchQuery.toLowerCase()) || agent.email?.toLowerCase().includes(headSearchQuery.toLowerCase())).map(agent => (
                                <button
                                  key={agent.id}
                                  type="button"
                                  onClick={() => { setFormData({ ...formData, departmentHeadId: agent.id }); setShowHeadDropdown(false); setHeadSearchQuery(''); }}
                                  className={`w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${formData.departmentHeadId === agent.id ? 'bg-violet-50 dark:bg-slate-700' : ''}`}
                                >
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                    {agent.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{agent.name}</div>
                                    {agent.email && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{agent.email}</div>}
                                  </div>
                                  {formData.departmentHeadId === agent.id && <CheckCircle2 className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />}
                                </button>
                              ))}
                              {agents.filter(agent => !headSearchQuery || agent.name.toLowerCase().includes(headSearchQuery.toLowerCase()) || agent.email?.toLowerCase().includes(headSearchQuery.toLowerCase())).length === 0 && (
                                <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No agents found</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
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
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${formData.isActive
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
        )
      }

      {/* Delete Modal */}
      {
        showDeleteModal && selectedDepartment && (
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
        )
      }
    </AdminLayout >
  );
}

export const getServerSideProps = withAuth();


