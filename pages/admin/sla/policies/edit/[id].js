import { useState, useEffect } from 'react';
import AdminLayout from '../../../../../components/admin/universal/AdminLayout';
import PageHead from '../../../../../components/admin/PageHead';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';

import { withAuth } from '../../../../../lib/withAuth';
export default function EditSLAPolicy() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    isActive: true,
    
    // Response times (in minutes)
    lowResponseTime: 480,
    mediumResponseTime: 240,
    highResponseTime: 60,
    urgentResponseTime: 15,
    
    // Resolution times (in minutes)
    lowResolutionTime: 2880,
    mediumResolutionTime: 1440,
    highResolutionTime: 480,
    urgentResolutionTime: 240,
    
    // Business hours
    useBusinessHours: true,
    timezone: 'UTC',
    businessHours: {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '18:00' },
      sunday: { enabled: false, start: '09:00', end: '18:00' },
    },
    
    // Escalation
    escalationLevel1: 80,
    escalationLevel2: 95,
    
    // Pause conditions
    pauseOnWaiting: true,
    pauseOnHold: true,
    pauseOffHours: true,
    
    // Department assignment
    departmentIds: null,
  });

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/admin/departments');
        const data = await response.json();
        if (response.ok) {
          setDepartments(data.departments || []);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch policy data
  useEffect(() => {
    if (!id) return;

    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/sla/policies/${id}`);
        const data = await response.json();
        
        if (data.success && data.policy) {
          const policy = data.policy;
          
          // Parse business hours if it's a string
          let businessHours = policy.businessHours;
          if (typeof businessHours === 'string') {
            try {
              businessHours = JSON.parse(businessHours);
            } catch {
              businessHours = {
                monday: { enabled: true, start: '09:00', end: '18:00' },
                tuesday: { enabled: true, start: '09:00', end: '18:00' },
                wednesday: { enabled: true, start: '09:00', end: '18:00' },
                thursday: { enabled: true, start: '09:00', end: '18:00' },
                friday: { enabled: true, start: '09:00', end: '18:00' },
                saturday: { enabled: false, start: '09:00', end: '18:00' },
                sunday: { enabled: false, start: '09:00', end: '18:00' },
              };
            }
          }

          // Convert business hours format if needed
          const formattedBusinessHours = {};
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          days.forEach(day => {
            if (businessHours && businessHours[day]) {
              const dayHours = businessHours[day];
              // Handle both formats: {start, end} or {enabled, start, end}
              if (dayHours.start && dayHours.end) {
                formattedBusinessHours[day] = {
                  enabled: dayHours.enabled !== undefined ? dayHours.enabled : (dayHours.start !== null),
                  start: dayHours.start || '09:00',
                  end: dayHours.end || '18:00',
                };
              } else {
                formattedBusinessHours[day] = {
                  enabled: false,
                  start: '09:00',
                  end: '18:00',
                };
              }
            } else {
              formattedBusinessHours[day] = {
                enabled: day !== 'saturday' && day !== 'sunday',
                start: '09:00',
                end: '18:00',
              };
            }
          });

          // Parse departmentIds
          let departmentIds = [];
          if (policy.departmentIds) {
            try {
              departmentIds = typeof policy.departmentIds === 'string' 
                ? JSON.parse(policy.departmentIds) 
                : policy.departmentIds;
            } catch {
              departmentIds = [];
            }
          }
          setSelectedDepartmentIds(Array.isArray(departmentIds) ? departmentIds : []);

          setFormData({
            name: policy.name || '',
            description: policy.description || '',
            isDefault: policy.isDefault || false,
            isActive: policy.isActive !== undefined ? policy.isActive : true,
            lowResponseTime: policy.lowResponseTime || 480,
            mediumResponseTime: policy.mediumResponseTime || 240,
            highResponseTime: policy.highResponseTime || 60,
            urgentResponseTime: policy.urgentResponseTime || 15,
            lowResolutionTime: policy.lowResolutionTime || 2880,
            mediumResolutionTime: policy.mediumResolutionTime || 1440,
            highResolutionTime: policy.highResolutionTime || 480,
            urgentResolutionTime: policy.urgentResolutionTime || 240,
            useBusinessHours: policy.useBusinessHours !== undefined ? policy.useBusinessHours : true,
            timezone: policy.timezone || 'UTC',
            businessHours: formattedBusinessHours,
            escalationLevel1: policy.escalationLevel1 || 80,
            escalationLevel2: policy.escalationLevel2 || 95,
            pauseOnWaiting: policy.pauseOnWaiting !== undefined ? policy.pauseOnWaiting : true,
            pauseOnHold: policy.pauseOnHold !== undefined ? policy.pauseOnHold : true,
            pauseOffHours: policy.pauseOffHours !== undefined ? policy.pauseOffHours : true,
            departmentIds: policy.departmentIds || null,
          });
        } else {
          alert('Policy not found');
          router.push('/admin/sla/policies');
        }
      } catch (error) {
        console.error('Error fetching policy:', error);
        alert('Failed to load policy');
        router.push('/admin/sla/policies');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [id, router]);

  const handleDepartmentToggle = (departmentId) => {
    setSelectedDepartmentIds(prev => {
      if (prev.includes(departmentId)) {
        return prev.filter(id => id !== departmentId);
      } else {
        return [...prev, departmentId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Prepare departmentIds: null for all departments, JSON array for specific ones
      const departmentIds = selectedDepartmentIds.length > 0 
        ? JSON.stringify(selectedDepartmentIds) 
        : null;
      
      // Format business hours for API (convert to format expected by API)
      const submitData = {
        ...formData,
        businessHours: formData.useBusinessHours ? formData.businessHours : null,
        departmentIds,
      };

      const response = await fetch(`/api/admin/sla/policies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      if (response.ok) {
        router.push('/admin/sla/policies');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to update SLA policy');
      }
    } catch (error) {
      console.error('Error updating policy:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateBusinessHours = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value,
        },
      },
    }));
  };

  if (loading) {
    return (
      <>
        <PageHead title="Edit SLA Policy" description="Update SLA policy settings" />
        <AdminLayout currentPage="SLA Management">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title="Edit SLA Policy" description="Update response and resolution time targets" />
      
      <AdminLayout currentPage="SLA Management">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Edit SLA Policy</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Update response and resolution time targets for different priority levels
              </p>
            </div>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-slate-300 dark:border-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Policy Name *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g., Standard Support SLA"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      placeholder="Describe this SLA policy..."
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => updateField('isActive', e.target.checked)}
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
                      <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isDefault}
                          onChange={(e) => updateField('isDefault', e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          formData.isDefault
                            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                        }`}>
                          {formData.isDefault && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">Default Policy</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Assignment */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Department Assignment</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Select specific departments for this policy. Leave all unchecked to apply to all departments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading departments...</p>
                  ) : (
                    <>
                      {departments.map((dept) => (
                        <label
                          key={dept.id}
                          className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedDepartmentIds.includes(dept.id)}
                              onChange={() => handleDepartmentToggle(dept.id)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                              selectedDepartmentIds.includes(dept.id)
                                ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                            }`}>
                              {selectedDepartmentIds.includes(dept.id) && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{dept.name}</div>
                            {dept.description && (
                              <div className="text-sm text-slate-500 dark:text-slate-400">{dept.description}</div>
                            )}
                          </div>
                          {!dept.isActive && (
                            <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                              Inactive
                            </span>
                          )}
                        </label>
                      ))}
                      {selectedDepartmentIds.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-2">
                          No departments selected - policy will apply to all departments
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SLA Targets - Same as new.js */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">SLA Targets by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { key: 'low', label: 'Low Priority', color: 'gray' },
                    { key: 'medium', label: 'Medium Priority', color: 'blue' },
                    { key: 'high', label: 'High Priority', color: 'orange' },
                    { key: 'urgent', label: 'Urgent Priority', color: 'red' },
                  ].map((priority) => (
                    <div key={priority.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full bg-${priority.color}-500`}></div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">{priority.label}</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Response Time
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={Math.floor(formData[`${priority.key}ResponseTime`] / 60)}
                              onChange={(e) => {
                                const hours = parseInt(e.target.value) || 0;
                                const minutes = formData[`${priority.key}ResponseTime`] % 60;
                                updateField(`${priority.key}ResponseTime`, hours * 60 + minutes);
                              }}
                              className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              placeholder="Hours"
                              min="0"
                            />
                            <span className="flex items-center text-sm text-slate-600 dark:text-slate-400">h</span>
                            <input
                              type="number"
                              value={formData[`${priority.key}ResponseTime`] % 60}
                              onChange={(e) => {
                                const hours = Math.floor(formData[`${priority.key}ResponseTime`] / 60);
                                const minutes = parseInt(e.target.value) || 0;
                                updateField(`${priority.key}ResponseTime`, hours * 60 + minutes);
                              }}
                              className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              placeholder="Mins"
                              min="0"
                              max="59"
                            />
                            <span className="flex items-center text-sm text-slate-600 dark:text-slate-400">m</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Resolution Time
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={Math.floor(formData[`${priority.key}ResolutionTime`] / 60)}
                              onChange={(e) => {
                                const hours = parseInt(e.target.value) || 0;
                                const minutes = formData[`${priority.key}ResolutionTime`] % 60;
                                updateField(`${priority.key}ResolutionTime`, hours * 60 + minutes);
                              }}
                              className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              placeholder="Hours"
                              min="0"
                            />
                            <span className="flex items-center text-sm text-slate-600 dark:text-slate-400">h</span>
                            <input
                              type="number"
                              value={formData[`${priority.key}ResolutionTime`] % 60}
                              onChange={(e) => {
                                const hours = Math.floor(formData[`${priority.key}ResolutionTime`] / 60);
                                const minutes = parseInt(e.target.value) || 0;
                                updateField(`${priority.key}ResolutionTime`, hours * 60 + minutes);
                              }}
                              className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              placeholder="Mins"
                              min="0"
                              max="59"
                            />
                            <span className="flex items-center text-sm text-slate-600 dark:text-slate-400">m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Business Hours - Same structure as new.js */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Business Hours Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.useBusinessHours}
                        onChange={(e) => updateField('useBusinessHours', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        formData.useBusinessHours
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                      }`}>
                        {formData.useBusinessHours && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Use business hours (SLA only counts during business hours)</span>
                  </label>

                  {formData.useBusinessHours && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Timezone</label>
                        <select
                          value={formData.timezone}
                          onChange={(e) => updateField('timezone', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Paris (CET)</option>
                          <option value="Asia/Dubai">Dubai (GST)</option>
                          <option value="Asia/Kolkata">India (IST)</option>
                          <option value="Asia/Singapore">Singapore (SGT)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Australia/Sydney">Sydney (AEDT)</option>
                        </select>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Working Days & Hours</h3>
                        {Object.entries(formData.businessHours).map(([day, hours]) => (
                          <div key={day} className="flex items-center gap-4">
                            <label className="flex items-center gap-2 w-32 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={hours.enabled}
                                  onChange={(e) => updateBusinessHours(day, 'enabled', e.target.checked)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                                  hours.enabled
                                    ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                                }`}>
                                  {hours.enabled && (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{day}</span>
                            </label>
                            
                            {hours.enabled && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={hours.start}
                                  onChange={(e) => updateBusinessHours(day, 'start', e.target.value)}
                                  className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                                <span className="text-slate-500 dark:text-slate-400">to</span>
                                <input
                                  type="time"
                                  value={hours.end}
                                  onChange={(e) => updateBusinessHours(day, 'end', e.target.value)}
                                  className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Escalation Settings */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Escalation Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Level 1 Escalation (Warning)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.escalationLevel1}
                        onChange={(e) => updateField('escalationLevel1', parseInt(e.target.value))}
                        className="w-24 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        min="1"
                        max="100"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">% of time elapsed</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Notify assigned agent when timer reaches this threshold</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Level 2 Escalation (Critical)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.escalationLevel2}
                        onChange={(e) => updateField('escalationLevel2', parseInt(e.target.value))}
                        className="w-24 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        min="1"
                        max="100"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">% of time elapsed</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Escalate to supervisor/manager when timer reaches this threshold</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pause Conditions */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Pause Conditions</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">Configure when SLA timers should pause automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={formData.pauseOnWaiting}
                        onChange={(e) => updateField('pauseOnWaiting', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        formData.pauseOnWaiting
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                      }`}>
                        {formData.pauseOnWaiting && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pause when waiting for customer</span>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Timer pauses when ticket status is "Waiting for Customer"</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={formData.pauseOnHold}
                        onChange={(e) => updateField('pauseOnHold', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        formData.pauseOnHold
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                      }`}>
                        {formData.pauseOnHold && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pause when ticket is on hold</span>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Timer pauses when ticket status is "On Hold"</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={formData.pauseOffHours}
                        onChange={(e) => updateField('pauseOffHours', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        formData.pauseOffHours
                          ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                      }`}>
                        {formData.pauseOffHours && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pause outside business hours</span>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Timer pauses outside of configured business hours</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();


