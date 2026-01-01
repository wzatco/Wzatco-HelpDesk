import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

export default function TicketsTab({ tickets = [], loading = false, isAgent = false }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 dark:text-slate-500 mb-2">
          <AlertCircle className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-slate-600 dark:text-slate-400">No tickets found</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-slate-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'resolved':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'closed':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'low':
        return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const basePath = isAgent ? '/agent/tickets' : '/admin/tickets';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Ticket
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {tickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link 
                    href={`${basePath}/${ticket.id}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    #{ticket.ticketNumber || ticket.id.substring(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-900 dark:text-white max-w-xs truncate">
                    {ticket.subject || 'No subject'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(ticket.status)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status || 'unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {getPriorityIcon(ticket.priority)}
                    <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                      {ticket.priority || 'medium'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {ticket.customer?.name || ticket.customerName || 'Unknown'}
                  </div>
                  {ticket.customer?.email && (
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      {ticket.customer.email}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(ticket.updatedAt || ticket.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {tickets.length >= 10 && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          <Link 
            href={basePath}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            View all tickets →
          </Link>
        </div>
      )}
    </div>
  );
}

