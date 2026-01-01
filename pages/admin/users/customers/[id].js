// Customer Profile Page - Shows customer info and their tickets
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import NotificationToast from '../../../../components/ui/NotificationToast';
import { Badge } from '../../../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../../../components/ui/avatar';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Ticket as TicketIcon,
  Loader2,
  Calendar,
  Clock,
  Eye,
  User as UserIcon,
  MessageSquare
} from 'lucide-react';
import { withAuth } from '../../../../lib/withAuth';

function CustomerProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ type: null, message: '' });

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/customers/${id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setCustomer(data.customer);
      } else {
        showNotification('error', data.message || 'Failed to fetch customer');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      showNotification('error', 'An error occurred while fetching customer');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'pending': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'in_progress': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'resolved': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      case 'closed': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const handleViewTicket = (ticketNumber) => {
    router.push(`/admin/tickets/${ticketNumber}`);
  };

  if (loading) {
    return (
      <AdminLayout>
        <Head>
          <title>Loading Customer - Admin Panel</title>
        </Head>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout>
        <Head>
          <title>Customer Not Found - Admin Panel</title>
        </Head>
        <div className="flex flex-col items-center justify-center h-96">
          <UserIcon className="w-12 h-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Customer Not Found</h2>
          <Link
            href="/admin/users/customers"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            Back to Customers
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>{customer.name} - Customer Profile - Admin Panel</title>
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
        <div className="flex items-center gap-4">
          <Link
            href="/admin/users/customers"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <UserIcon className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              {customer.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Customer Profile</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer Information */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 sticky top-6">
              <div className="flex flex-col items-center mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-2xl">
                    {customer.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">
                  {customer.name}
                </h2>
                {customer.company && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 text-center">
                    {customer.company}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {customer.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Email
                      </div>
                      <div className="text-sm text-slate-900 dark:text-white">
                        {customer.email}
                      </div>
                    </div>
                  </div>
                )}

                {customer.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Phone
                      </div>
                      <div className="text-sm text-slate-900 dark:text-white">
                        {customer.phone}
                      </div>
                    </div>
                  </div>
                )}

                {customer.location && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Location
                      </div>
                      <div className="text-sm text-slate-900 dark:text-white">
                        {customer.location}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
                    Ticket Statistics
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {customer.totalTickets}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {customer.tickets.filter(t => ['open', 'pending', 'in_progress'].includes(t.status)).length}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Active</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Member Since
                  </div>
                  <div className="text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tickets List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <TicketIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Tickets ({customer.tickets.length})
                  </h2>
                </div>
              </div>

              {customer.tickets.length === 0 ? (
                <div className="text-center py-12">
                  <TicketIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    No tickets found
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    This customer hasn't raised any tickets yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customer.tickets.map((ticket) => (
                    <div
                      key={ticket.ticketNumber}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                              {ticket.ticketNumber}
                            </span>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {ticket.subject || 'Untitled Ticket'}
                          </h3>
                          {ticket.category && (
                            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              Category: {ticket.category}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleViewTicket(ticket.ticketNumber)}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
                        {ticket.assignee && (
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            <span>{ticket.assignee.name}</span>
                          </div>
                        )}
                        {ticket.department && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{ticket.department.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>{ticket.messageCount} messages</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default CustomerProfilePage;

export const getServerSideProps = withAuth();

