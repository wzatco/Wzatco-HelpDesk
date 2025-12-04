import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PageTransition({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <div className="relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-violet-900/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            <span className="text-slate-700 font-medium">Loading...</span>
          </div>
        </div>
      )}
      
      {/* Page Content with Transition */}
      <div className={`transition-all duration-300 ease-in-out ${
        isLoading ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}>
        {children}
      </div>
    </div>
  );
}
