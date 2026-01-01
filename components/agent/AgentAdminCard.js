import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Building2, Ticket } from 'lucide-react';

/**
 * AgentAdminCard - Card component for displaying agent/admin information
 * Used in the TransferTicketModal for selection
 * 
 * @param {Object} props
 * @param {string} props.id - Agent/Admin ID
 * @param {string} props.name - Name
 * @param {string} props.department - Department name (for agents)
 * @param {string} props.role - Role (for admins)
 * @param {number} props.openTicketCount - Number of open tickets
 * @param {boolean} props.isSelected - Whether this card is selected
 * @param {Function} props.onClick - Click handler
 * @param {string} props.type - 'agent' or 'admin'
 */
export default function AgentAdminCard({
    id,
    name,
    department,
    role,
    openTicketCount = 0,
    isSelected = false,
    onClick,
    type = 'agent',
    avatarUrl
}) {
    const getInitials = (name) => {
        const parts = name?.split(' ') || [];
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name?.slice(0, 2).toUpperCase() || 'NA';
    };

    const getTicketCountColor = (count) => {
        if (count === 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        if (count <= 3) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        if (count <= 7) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    };

    return (
        <button
            type="button"
            onClick={() => onClick({ id, name, type })}
            className={`
        w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
        hover:shadow-lg hover:-translate-y-0.5
        ${isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600'
                }
      `}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <Avatar className={`w-12 h-12 flex-shrink-0 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                    <AvatarFallback className={`
            text-white font-bold text-sm
            ${type === 'admin'
                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                        }
          `}>
                        {getInitials(name)}
                    </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    {/* Name */}
                    <h3 className={`font-semibold text-sm truncate ${isSelected
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                        {name}
                    </h3>

                    {/* Department or Role */}
                    <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {type === 'agent' ? (department || 'No Department') : (role || 'Admin')}
                        </span>
                    </div>

                    {/* Open Ticket Count Badge */}
                    <div className="flex items-center gap-1.5 mt-2">
                        <Ticket className="w-3.5 h-3.5 flex-shrink-0" />
                        <Badge
                            variant="secondary"
                            className={`text-xs px-2 py-0.5 font-semibold ${getTicketCountColor(openTicketCount)}`}
                        >
                            {openTicketCount} {openTicketCount === 1 ? 'open ticket' : 'open tickets'}
                        </Badge>
                    </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </div>
        </button>
    );
}
