import { X, MessageSquare, FileText, Calendar, User, Mail, Phone, MapPin, Package, Tag, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import ReopenTicketModal from '../../admin/ReopenTicketModal';

export default function TicketDetailsPopup({ isOpen, onClose, ticket, onChatClick, onTicketUpdate }) {
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseTicket = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) {
      return;
    }

    setIsClosing(true);
    try {
      const response = await fetch(`/api/widget/tickets/${ticket.ticketNumber || ticket.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: ticket.customerEmail || localStorage.getItem('customerEmail')
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to close ticket');
      }

      onTicketUpdate?.({ ...ticket, status: 'closed' });
      alert('Ticket closed successfully');
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenSuccess = (newStatus) => {
    onTicketUpdate?.({ ...ticket, status: newStatus });
    alert('Ticket reopened successfully');
  };

  if (!isOpen || !ticket) return null;

  const canClose = ticket.status !== 'closed' && ticket.status !== 'resolved';
  const canReopen = ticket.status === 'closed' || ticket.status === 'resolved';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Ticket Details
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Ticket #{ticket.ticketNumber || ticket.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Ticket Info */}
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h4 className="text-lg font-semibold text-violet-900 dark:text-violet-200">
                  {ticket.subject}
                </h4>
              </div>
              <div className="flex items-center gap-4 text-sm text-violet-800 dark:text-violet-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  ticket.status === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  ticket.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  ticket.status === 'resolved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {ticket.status}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  ticket.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                  ticket.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                  ticket.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {ticket.priority}
                </span>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticket.customerName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Name:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.customerName}</span>
                  </div>
                )}
                {ticket.customerEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Email:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.customerEmail}</span>
                  </div>
                )}
                {ticket.customerPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Phone:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.customerPhone}</span>
                  </div>
                )}
                {ticket.customerAltPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Alt Phone:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.customerAltPhone}</span>
                  </div>
                )}
                {ticket.customerAddress && (
                  <div className="flex items-start gap-2 text-sm md:col-span-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-400">Address:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Details */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Ticket Details
              </h4>
              <div className="space-y-3">
                {ticket.ticketBody && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                      {ticket.ticketBody}
                    </p>
                  </div>
                )}
                {ticket.orderNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Order Number:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.orderNumber}</span>
                  </div>
                )}
                {ticket.purchasedFrom && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Purchased From:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.purchasedFrom}</span>
                  </div>
                )}
                {ticket.issueType && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Issue Type:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{ticket.issueType}</span>
                  </div>
                )}
                {ticket.issueVideoLink && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Video Link:</span>
                    <a 
                      href={ticket.issueVideoLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      View Video
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            {(ticket.invoiceUrl || (ticket.additionalDocuments && ticket.additionalDocuments.length > 0)) && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Attachments</h4>
                <div className="space-y-2">
                  {ticket.invoiceUrl && (
                    <a
                      href={ticket.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg"
                    >
                      <FileText className="w-4 h-4" />
                      Invoice
                    </a>
                  )}
                  {ticket.additionalDocuments && Array.isArray(ticket.additionalDocuments) && ticket.additionalDocuments.map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg"
                    >
                      <FileText className="w-4 h-4" />
                      {doc.fileName || `Document ${index + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {canClose && (
              <button
                onClick={handleCloseTicket}
                disabled={isClosing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isClosing ? 'Closing...' : 'Close Ticket'}
              </button>
            )}
            {canReopen && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Reopen Ticket
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={onChatClick}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat with Support
            </button>
          </div>
        </div>
      </div>

      {/* Reopen Modal */}
      <ReopenTicketModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        ticketId={ticket.ticketNumber || ticket.id}
        onSuccess={handleReopenSuccess}
        isCustomer={true}
      />
    </div>,
    document.body
  );
}

