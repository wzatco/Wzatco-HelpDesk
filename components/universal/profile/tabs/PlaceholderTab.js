import { FileText, Clock, Smile } from 'lucide-react';

export default function PlaceholderTab({ type = 'time-entry' }) {
  const config = {
    'time-entry': {
      icon: Clock,
      title: 'Time Entry',
      description: 'Track and manage your work time entries'
    },
    'happiness-rating': {
      icon: Smile,
      title: 'Happiness Rating',
      description: 'View detailed customer satisfaction metrics'
    },
    default: {
      icon: FileText,
      title: 'Coming Soon',
      description: 'This feature is under development'
    }
  };

  const { icon: Icon, title, description } = config[type] || config.default;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
        {description}
      </p>
    </div>
  );
}

