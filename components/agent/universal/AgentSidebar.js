import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Ticket, BookOpen, User, ChevronDown, Plus, MessageSquare, FileText, HandHeart, Phone } from 'lucide-react';
import { useAgentAuth } from '../../../contexts/AgentAuthContext';
import { useAgentGlobal } from '../../../contexts/AgentGlobalData';

export default function AgentSidebar({ isOpen, onClose }) {
  const router = useRouter();
  const { user } = useAgentAuth();
  const { ticketCounts: globalTicketCounts } = useAgentGlobal(); // Use centralized counts
  const [expandedItems, setExpandedItems] = useState([]);
  const [currentHash, setCurrentHash] = useState('');
  const activeItemRef = useRef(null);
  const navRef = useRef(null);
  const userHasScrolled = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const lastPathnameRef = useRef('');

  // Use global ticket counts instead of fetching separately
  const ticketCounts = {
    assigned: globalTicketCounts.assigned || 0,
    open: globalTicketCounts.open || 0,
    pending: globalTicketCounts.pending || 0,
    resolved: globalTicketCounts.resolved || 0,
    claimable: globalTicketCounts.claimable || 0,
  };

  // Track hash changes for active state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHash(window.location.hash);
      const handleHashChange = () => {
        setCurrentHash(window.location.hash);
      };
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  const sectionForPath = (path) => {
    if (path.startsWith('/agent/tickets')) return 'my tickets';
    if (path.startsWith('/agent/chat')) return 'chat';
    if (path.startsWith('/agent/knowledge-base')) return 'knowledge base';
    if (path.startsWith('/agent/canned-responses')) return 'canned responses';
    if (path.startsWith('/agent/callbacks')) return 'callbacks';
    return null;
  };

  useEffect(() => {
    const section = sectionForPath(router.pathname);
    if (section) {
      setExpandedItems(prev => (prev.includes(section) ? prev : [...prev, section]));
    }
  }, [router.pathname]);

  // Track user manual scrolling
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    let scrollTimer = null;

    const handleScroll = () => {
      userHasScrolled.current = true;
      
      if (scrollTimer) clearTimeout(scrollTimer);
      
      scrollTimer = setTimeout(() => {
        // Reset after 2 seconds of no scrolling
      }, 2000);
    };

    navElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      navElement.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  // Auto-scroll to active menu item on route change
  useEffect(() => {
    const currentPath = router.pathname + (currentHash || '');
    if (currentPath === lastPathnameRef.current) {
      return;
    }
    
    lastPathnameRef.current = currentPath;
    userHasScrolled.current = false;

    if (navRef.current && typeof window !== 'undefined') {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (userHasScrolled.current) {
          return;
        }

        const navElement = navRef.current;
        if (!navElement) return;
        
        const activeElement = navElement.querySelector('[data-active="true"]');
        
        if (activeElement && !userHasScrolled.current) {
          const navScrollTop = navElement.scrollTop;
          const navHeight = navElement.clientHeight;
          
          let elementTop = 0;
          let current = activeElement;
          while (current && current !== navElement) {
            elementTop += current.offsetTop;
            current = current.offsetParent;
          }
          
          const elementHeight = activeElement.offsetHeight;
          const elementBottom = elementTop + elementHeight;
          const visibleTop = navScrollTop;
          const visibleBottom = navScrollTop + navHeight;
          
          if (elementTop < visibleTop || elementBottom > visibleBottom) {
            const targetScroll = elementTop - (navHeight / 2) + (elementHeight / 2);
            
            navElement.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        }
      }, 400);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [router.pathname, router.asPath, currentHash]);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/agent',
      icon: 'dashboard',
      current: router.pathname === '/agent'
    },
    {
      name: 'My Tickets',
      href: '/agent/tickets',
      icon: 'tickets',
      current: router.pathname.startsWith('/agent/tickets'),
      hasSubmenu: true,
      submenu: [
        { name: 'All My Tickets', href: '/agent/tickets', count: ticketCounts.assigned },
        { name: 'Open', href: '/agent/tickets?status=open', count: ticketCounts.open },
        { name: 'Pending', href: '/agent/tickets?status=pending', count: ticketCounts.pending },
        { name: 'Resolved', href: '/agent/tickets?status=resolved', count: ticketCounts.resolved },
        { name: 'Available to Claim', href: '/agent/tickets?view=claimable', count: ticketCounts.claimable, icon: 'hand-heart' },
      ]
    },
    {
      name: 'Internal Chat',
      href: '/agent/chat',
      icon: 'chat',
      current: router.pathname.startsWith('/agent/chat')
    },
    {
      name: 'Knowledge Base',
      href: '/agent/knowledge-base',
      icon: 'kb',
      current: router.pathname.startsWith('/agent/knowledge-base')
    },
    {
      name: 'Canned Responses',
      href: '/agent/canned-responses',
      icon: 'file-text',
      current: router.pathname.startsWith('/agent/canned-responses')
    },
    {
      name: 'My Callbacks',
      href: '/agent/callbacks',
      icon: 'phone',
      current: router.pathname.startsWith('/agent/callbacks')
    }
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-violet-900/75 backdrop-blur-sm" onClick={onClose}></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-violet-50 via-violet-100/50 to-white dark:from-slate-950 dark:via-violet-950/30 dark:to-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out h-full overflow-y-hidden lg:translate-x-0 lg:static lg:inset-0 lg:z-auto lg:h-full ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav ref={navRef} className="flex-1 px-4 py-6 space-y-1 overflow-y-auto text-slate-700 dark:text-slate-200">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.hasSubmenu ? (
                  <div>
                    <button
                      ref={item.current ? activeItemRef : null}
                      data-active={item.current ? 'true' : 'false'}
                      data-href={item.href}
                      onClick={() => toggleExpanded(item.name.toLowerCase())}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        item.current
                          ? 'bg-violet-100 text-violet-700 border border-violet-200 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                          : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center">
                        {item.icon === 'dashboard' && <LayoutDashboard className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'tickets' && <Ticket className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'chat' && <MessageSquare className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'kb' && <BookOpen className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'file-text' && <FileText className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'phone' && <Phone className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.name}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedItems.includes(item.name.toLowerCase()) ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Submenu */}
                    {expandedItems.includes(item.name.toLowerCase()) && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.submenu.map((subItem) => {
                          const isHashLink = subItem.href.includes('#');
                          const pathWithoutHash = isHashLink ? subItem.href.split('#')[0] : subItem.href;
                          const hash = isHashLink ? subItem.href.split('#')[1] : null;
                          
                          // Check if active
                          const isActive = isHashLink 
                            ? router.pathname === pathWithoutHash && currentHash === `#${hash}`
                            : router.pathname === subItem.href || 
                              router.asPath === subItem.href || 
                              (subItem.href.includes('?') && (
                                (subItem.href.includes('?status=') && router.query.status === subItem.href.split('?status=')[1]) ||
                                (subItem.href.includes('?view=') && router.query.view === subItem.href.split('?view=')[1])
                              ));

                          return (
                            <Link key={subItem.name} href={subItem.href}>
                              <div 
                                ref={isActive ? activeItemRef : null}
                                data-active={isActive ? 'true' : 'false'}
                                data-href={subItem.href}
                                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                  isActive
                                    ? 'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                                    : 'text-slate-600 hover:bg-violet-50/50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {subItem.icon === 'hand-heart' && (
                                    <HandHeart className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                  )}
                                  {subItem.name}
                                </span>
                                {subItem.count !== undefined && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    subItem.count > 0 
                                      ? 'bg-violet-100 text-violet-700 dark:bg-slate-700 dark:text-slate-100' 
                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>
                                    {subItem.count}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={item.href}>
                    <div 
                      ref={item.current ? activeItemRef : null}
                      data-active={item.current ? 'true' : 'false'}
                      data-href={item.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        item.current
                          ? 'bg-violet-100 text-violet-700 border border-violet-200 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                          : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      }`}
                    >
                      {item.icon === 'dashboard' && <LayoutDashboard className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'tickets' && <Ticket className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'chat' && <MessageSquare className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'kb' && <BookOpen className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'file-text' && <FileText className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'phone' && <Phone className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.name}
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
