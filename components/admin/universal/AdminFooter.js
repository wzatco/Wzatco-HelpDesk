import { useSettings } from '../../../hooks/useSettings';

export default function AdminFooter() {
  const currentYear = new Date().getFullYear();
  const { settings } = useSettings();
  const appTitle = settings.appTitle || 'WZATCO Support';
  const appEmail = settings.appEmail || 'support@helpdesk.com';
  const initials = appTitle.split(' ').map(w => w.charAt(0).toUpperCase()).join('').slice(0, 2) || 'WZ';

  return (
    <footer className="bg-gradient-to-r from-violet-50 via-purple-50 to-violet-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-t border-violet-200 dark:border-slate-800 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs">{initials}</span>
              </div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{appTitle}</span>
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">v1.0.0</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
              <span>© {currentYear} {appTitle}</span>
              <span className="text-slate-400">•</span>
              <a href="#" className="hover:text-violet-700 dark:hover:text-violet-400 transition-colors">Privacy</a>
              <span className="text-slate-400">•</span>
              <a href="#" className="hover:text-violet-700 dark:hover:text-violet-400 transition-colors">Terms</a>
              <span className="text-slate-400">•</span>
              <a href={`mailto:${appEmail}`} className="hover:text-violet-700 dark:hover:text-violet-400 transition-colors">Support</a>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-violet-500 dark:bg-violet-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-600 dark:text-slate-400">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
