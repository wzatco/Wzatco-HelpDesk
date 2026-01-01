import React from 'react';
import { Badge } from '../ui/badge';
import { 
  Circle, 
  Clock, 
  AlertCircle, 
  Moon, 
  Calendar, 
  Video, 
  BellOff 
} from 'lucide-react';

const PRESENCE_CONFIG = {
  online: {
    label: 'Online',
    icon: Circle,
    dotColor: 'bg-green-500',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    pulse: true
  },
  away: {
    label: 'Away',
    icon: Clock,
    dotColor: 'bg-yellow-500',
    badgeClass: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    pulse: false
  },
  busy: {
    label: 'Busy',
    icon: AlertCircle,
    dotColor: 'bg-orange-500',
    badgeClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
    pulse: false
  },
  offline: {
    label: 'Offline',
    icon: Circle,
    dotColor: 'bg-slate-400',
    badgeClass: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    pulse: false
  },
  on_leave: {
    label: 'On Leave',
    icon: Moon,
    dotColor: 'bg-blue-500',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    pulse: false
  },
  in_meeting: {
    label: 'In Meeting',
    icon: Video,
    dotColor: 'bg-purple-500',
    badgeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    pulse: false
  },
  dnd: {
    label: 'Do Not Disturb',
    icon: BellOff,
    dotColor: 'bg-red-500',
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
    pulse: false
  }
};

export default function AgentPresenceIndicator({ 
  presenceStatus = 'offline', 
  showLabel = true, 
  size = 'default',
  className = '' 
}) {
  const config = PRESENCE_CONFIG[presenceStatus] || PRESENCE_CONFIG.offline;
  const Icon = config.icon;
  
  const sizeClasses = {
    small: {
      dot: 'w-1.5 h-1.5',
      badge: 'text-xs px-1.5 py-0.5',
      icon: 'w-3 h-3'
    },
    default: {
      dot: 'w-2 h-2',
      badge: 'text-xs px-2 py-0.5',
      icon: 'w-4 h-4'
    },
    large: {
      dot: 'w-2.5 h-2.5',
      badge: 'text-sm px-2.5 py-1',
      icon: 'w-5 h-5'
    }
  };

  const sizes = sizeClasses[size] || sizeClasses.default;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative flex items-center">
        <div 
          className={`${config.dotColor} ${sizes.dot} rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        />
        {config.icon !== Circle && (
          <Icon className={`${sizes.icon} ${config.dotColor.replace('bg-', 'text-')} absolute -bottom-0.5 -right-0.5`} />
        )}
      </div>
      {showLabel && (
        <Badge className={`${config.badgeClass} ${sizes.badge} font-semibold border`}>
          {config.label}
        </Badge>
      )}
    </div>
  );
}

