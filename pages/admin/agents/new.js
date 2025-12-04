import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Button } from '../../../components/ui/button';
import { 
  UserPlus, 
  Mail, 
  User, 
  Building2,
  CheckCircle2,
  XCircle,
  Briefcase,
  Users,
  X,
  Shield
} from 'lucide-react';
import ThemedSelect from '../../../components/ui/ThemedSelect';

export default function NewAgentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    departmentId: '',
    roleId: '',
    skills: [],
    maxLoad: '',
    isActive: true
  });
  const [skillInput, setSkillInput] = useState('');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
    fetchRoles();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      const data = await response.json();
      if (response.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      if (response.ok) {
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      showNotification('error', 'Name and email are required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          departmentId: formData.departmentId || null,
          roleId: formData.roleId || null,
          skills: formData.skills.length > 0 ? JSON.stringify(formData.skills) : null,
          maxLoad: formData.maxLoad ? parseInt(formData.maxLoad) : null,
          isActive: formData.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Agent created successfully');
        setTimeout(() => {
          router.push(`/admin/agents/${data.agent.id}`);
        }, 1500);
      } else {
        showNotification('error', data.message || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      showNotification('error', 'An error occurred while creating the agent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Add New Agent - Admin</title>
      </Head>
      <AdminLayout currentPage="Agents">
        <div className="p-2 sm:p-4">
          <div className="w-full">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Agent</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Fill in the details below to create a new agent</p>
            </div>

            {/* Notification Toast */}
            <NotificationToast 
              notification={notification} 
              onClose={() => setNotification({ type: null, message: '' })} 
            />

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Agent Information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-violet-600" />
                  Agent Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Agent Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="agent@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Department (Optional)
                    </label>
                    <ThemedSelect
                      options={[
                        { value: '', label: 'Select a department...' },
                        ...departments
                          .filter((dept) => dept.isActive)
                          .map((dept) => ({
                            value: dept.id,
                            label: dept.name
                          }))
                      ]}
                      value={formData.departmentId || ''}
                      onChange={(value) => setFormData({ ...formData, departmentId: value })}
                      placeholder="Select a department..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Role (Optional)
                    </label>
                    <ThemedSelect
                      options={[
                        { value: '', label: 'Select a role...' },
                        ...roles.map((role) => ({
                          value: role.id,
                          label: role.title
                        }))
                      ]}
                      value={formData.roleId || ''}
                      onChange={(value) => setFormData({ ...formData, roleId: value })}
                      placeholder="Select a role..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Max Load (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxLoad}
                      onChange={(e) => setFormData({ ...formData, maxLoad: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Maximum concurrent tickets"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Maximum number of tickets this agent can handle simultaneously
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-violet-600" />
                  Skills (Optional)
                </h2>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
                            setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
                            setSkillInput('');
                          }
                        }
                      }}
                      className="flex-1 h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Enter a skill and press Enter"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
                          setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
                          setSkillInput('');
                        }
                      }}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== index) });
                            }}
                            className="hover:text-violet-900 dark:hover:text-violet-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Status */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-violet-600" />
                  Status
                </h2>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-900 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 cursor-pointer accent-violet-600"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Agent is active
                  </span>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-8">
                  Inactive agents won't be assigned new tickets
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/agents')}
                  disabled={submitting}
                  className="border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {submitting ? 'Creating...' : 'Create Agent'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

