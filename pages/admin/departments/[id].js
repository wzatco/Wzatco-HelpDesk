// Individual Department Detail Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Badge } from '../../../components/ui/badge';
import { withAuth } from '../../../lib/withAuth';
import { 
  Building2, 
  ArrowLeft,
  Users,
  Settings,
  Edit,
  Trash2,
  Loader2
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
        const config = typeof departmentData.slaConfig === 'string' 
          ? JSON.parse(departmentData.slaConfig) 
          : departmentData.slaConfig;
        
        const defaults = {
          low: { responseTime: 4, responseTimeUnit: 'hours', resolutionTime: 2, resolutionTimeUnit: 'days', useBusinessHours: true },
          medium: { responseTime: 2, responseTimeUnit: 'hours', resolutionTime: 1, resolutionTimeUnit: 'days', useBusinessHours: true },
          high: { responseTime: 1, responseTimeUnit: 'hours', resolutionTime: 8, resolutionTimeUnit: 'hours', useBusinessHours: true },
          urgent: { responseTime: 15, responseTimeUnit: 'minutes', resolutionTime: 4, resolutionTimeUnit: 'hours', useBusinessHours: true }
        };
        
        const migratedConfig = {};
        ['low', 'medium', 'high', 'urgent'].forEach(priority => {
          if (config[priority]) {
            if (typeof config[priority] === 'object' && config[priority].responseTimeUnit) {
              migratedConfig[priority] = {
                ...defaults[priority],
                ...config[priority],
                useBusinessHours: config[priority].useBusinessHours !== false
              };
            } else {
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slaConfig,
          workingHours,
          holidays
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'SLA and working hours updated successfully');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        showNotification('error', data.message || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      showNotification('error', 'An error occurred while saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    if (newHoliday.trim() && !holidays.includes(newHoliday.trim())) {
      setHolidays([...holidays, newHoliday.trim()]);
      setNewHoliday('');
    }
  };

  const removeHoliday = (holiday) => {
    setHolidays(holidays.filter(h => h !== holiday));
  };

  return (
    <div className="space-y-6">
      {notification.type && (
        <NotificationToast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ type: null, message: '' })}
        />
      )}

      {/* SLA Configuration */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">SLA Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['urgent', 'high', 'medium', 'low'].map((priority) => (
            <div key={priority} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
                {priority}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Response Time</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={slaConfig[priority].responseTime}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: {
                          ...slaConfig[priority],
                          responseTime: parseInt(e.target.value) || 0
                        }
                      })}
                      className="w-16 h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <select
                      value={slaConfig[priority].responseTimeUnit}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: {
                          ...slaConfig[priority],
                          responseTimeUnit: e.target.value
                        }
                      })}
                      className="h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Resolution Time</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={slaConfig[priority].resolutionTime}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: {
                          ...slaConfig[priority],
                          resolutionTime: parseInt(e.target.value) || 0
                        }
                      })}
                      className="w-16 h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <select
                      value={slaConfig[priority].resolutionTimeUnit}
                      onChange={(e) => setSlaConfig({
                        ...slaConfig,
                        [priority]: {
                          ...slaConfig[priority],
                          resolutionTimeUnit: e.target.value
                        }
                      })}
                      className="h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={slaConfig[priority].useBusinessHours}
                    onChange={(e) => setSlaConfig({
                      ...slaConfig,
                      [priority]: {
                        ...slaConfig[priority],
                        useBusinessHours: e.target.checked
                      }
                    })}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Business Hours Only</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Working Hours</h4>
        <div className="space-y-2">
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
            <div key={day} className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 w-32">
                <input
                  type="checkbox"
                  checked={workingHours[day].enabled}
                  onChange={(e) => setWorkingHours({
                    ...workingHours,
                    [day]: {
                      ...workingHours[day],
                      enabled: e.target.checked
                    }
                  })}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{day}</span>
              </label>
              {workingHours[day].enabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={workingHours[day].start}
                    onChange={(e) => setWorkingHours({
                      ...workingHours,
                      [day]: {
                        ...workingHours[day],
                        start: e.target.value
                      }
                    })}
                    className="h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <span className="text-slate-600 dark:text-slate-400">to</span>
                  <input
                    type="time"
                    value={workingHours[day].end}
                    onChange={(e) => setWorkingHours({
                      ...workingHours,
                      [day]: {
                        ...workingHours[day],
                        end: e.target.value
                      }
                    })}
                    className="h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Holidays</h4>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addHoliday()}
            placeholder="Enter holiday date (e.g., 2024-12-25)"
            className="flex-1 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={addHoliday}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Add
          </button>
        </div>
        {holidays.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {holidays.map((holiday, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                {holiday}
                <button
                  type="button"
                  onClick={() => removeHoliday(holiday)}
                  className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Configuration'
        )}
      </button>
    </div>
  );
}

function DepartmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDepartment();
    }
  }, [id]);

  const fetchDepartment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/departments/${id}?includeAgents=true&includeStats=true`);
      const data = await response.json();
      
      if (response.ok && data.department) {
        setDepartment(data.department);
      } else {
        showNotification('error', data.message || 'Failed to fetch department');
      }
    } catch (error) {
      console.error('Error fetching department:', error);
      showNotification('error', 'An error occurred while fetching department');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Department deleted successfully');
        setTimeout(() => {
          router.push('/admin/departments');
        }, 1000);
      } else {
        showNotification('error', data.message || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      showNotification('error', 'An error occurred while deleting department');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  if (loading) {
    return (
      <AdminLayout>
        <Head>
          <title>Loading Department - WZATCO Admin</title>
        </Head>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!department) {
    return (
      <AdminLayout>
        <Head>
          <title>Department Not Found - WZATCO Admin</title>
        </Head>
        <div className="flex flex-col items-center justify-center h-96">
          <Building2 className="w-12 h-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Department Not Found</h2>
          <Link
            href="/admin/departments"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            Back to Departments
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>{department.name} - Departments - WZATCO Admin</title>
      </Head>

      {notification.type && (
        <NotificationToast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ type: null, message: '' })}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/departments"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Building2 className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                {department.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Department Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/departments?edit=${id}`}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Department Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {department.name}
              </h2>
            </div>
            <Badge className={`${department.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'} border-0`}>
              {department.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="space-y-4">
            {department.description && (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Description</label>
                <p className="text-slate-900 dark:text-white mt-1">{department.description}</p>
              </div>
            )}
            
            {department.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {department.stats.total}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Tickets</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {department.stats.open}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Open</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {department.stats.pending}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Pending</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {department.stats.resolved}
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
              Agents ({department.agents?.length || 0})
            </h3>
          </div>
          <div>
            {department.agents && department.agents.length > 0 ? (
              <div className="space-y-2">
                {department.agents.map((agent) => (
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
            departmentId={id}
            departmentData={department}
            onUpdate={fetchDepartment}
          />
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-violet-200 dark:border-slate-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Delete Department</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete "{department.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default DepartmentDetailPage;

export const getServerSideProps = withAuth();

