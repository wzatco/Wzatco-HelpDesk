import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Ticket, Users, Building2, BookOpen, BarChart3, Puzzle, Settings as SettingsIcon, Plus, ChevronDown, Package, FileText, TrendingUp, Webhook, Shield, Clock, MessageCircle, GraduationCap, Phone } from 'lucide-react';

export default function AdminSidebar({ isOpen, onClose }) {
  const router = useRouter();
  // Initialize with consistent value for SSR
  const [expandedItems, setExpandedItems] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0
  });
  const [agentCounts, setAgentCounts] = useState({
    total: 0,
    online: 0,
    offline: 0
  });
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [isLoadingAgentCounts, setIsLoadingAgentCounts] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [currentHash, setCurrentHash] = useState('');
  const activeItemRef = useRef(null);
  const navRef = useRef(null);
  const userHasScrolled = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const lastPathnameRef = useRef('');

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
    if (path.startsWith('/admin/tickets')) return 'tickets';
    if (path.startsWith('/admin/agents')) return 'agents';
    if (path.startsWith('/admin/departments')) return 'departments';
    if (path.startsWith('/admin/knowledge-base')) return 'knowledge base';
    if (path.startsWith('/admin/reports')) return 'reports';
    if (path.startsWith('/admin/sla')) return 'sla management';
    if (
      path.startsWith('/admin/roles') ||
      path.startsWith('/admin/role-access') ||
      path.startsWith('/admin/users')
    )
      return 'roles';
    if (path.startsWith('/admin/settings')) return 'settings';
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

    let isUserScrolling = false;
    let scrollTimer = null;

    const handleScroll = () => {
      isUserScrolling = true;
      userHasScrolled.current = true;
      
      // Clear existing timer
      if (scrollTimer) clearTimeout(scrollTimer);
      
      // Reset flag after user stops scrolling for 2 seconds
      scrollTimer = setTimeout(() => {
        isUserScrolling = false;
      }, 2000);
    };

    navElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      navElement.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  // Auto-scroll to active menu item ONLY on route change (not on every render)
  useEffect(() => {
    // Only auto-scroll if route actually changed and user hasn't manually scrolled
    const currentPath = router.pathname + (currentHash || '');
    if (currentPath === lastPathnameRef.current) {
      return; // Route hasn't changed, don't scroll
    }
    
    // Update last pathname
    lastPathnameRef.current = currentPath;
    
    // Reset user scroll flag on route change (allow auto-scroll for new page)
    userHasScrolled.current = false;

    if (navRef.current && typeof window !== 'undefined') {
      // Clear any existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Small delay to ensure DOM is updated and submenus are expanded
      scrollTimeoutRef.current = setTimeout(() => {
        // Don't scroll if user has manually scrolled
        if (userHasScrolled.current) {
          return;
        }

        const navElement = navRef.current;
        if (!navElement) return;
        
        let activeElement = null;
        
        // First, try to find by data-active attribute (most reliable)
        const activeByData = navElement.querySelector('[data-active="true"]');
        if (activeByData) {
          activeElement = activeByData;
        } else {
          // Fallback: find by checking href attributes against current route
          const allLinks = navElement.querySelectorAll('a[href]');
          for (const link of allLinks) {
            const href = link.getAttribute('href');
            if (!href) continue;
            
            const isHashLink = href.includes('#');
            if (isHashLink) {
              const pathWithoutHash = href.split('#')[0];
              const hash = href.split('#')[1];
              if (router.pathname === pathWithoutHash && currentHash === `#${hash}`) {
                // Found matching submenu item
                activeElement = link.closest('div[data-href]') || link.closest('div') || link;
                break;
              }
            } else {
              // Check exact match
              if (router.pathname === href || router.asPath === href) {
                activeElement = link.closest('div[data-href]') || link.closest('div') || link;
                break;
              }
            }
          }
        }
        
        if (activeElement && !userHasScrolled.current) {
          // Get the container's scroll position
          const navScrollTop = navElement.scrollTop;
          const navHeight = navElement.clientHeight;
          
          // Get element position relative to the nav container
          let elementTop = 0;
          let current = activeElement;
          while (current && current !== navElement) {
            elementTop += current.offsetTop;
            current = current.offsetParent;
          }
          
          const elementHeight = activeElement.offsetHeight;
          
          // Calculate if element is visible
          const elementBottom = elementTop + elementHeight;
          const visibleTop = navScrollTop;
          const visibleBottom = navScrollTop + navHeight;
          
          // Check if element is not fully visible
          if (elementTop < visibleTop || elementBottom > visibleBottom) {
            // Calculate scroll position to center the element
            const targetScroll = elementTop - (navHeight / 2) + (elementHeight / 2);
            
            navElement.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        }
      }, 400); // Delay to ensure everything is rendered
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [router.pathname, router.asPath, currentHash]); // Removed expandedItems to prevent re-scrolling

  // Fetch ticket counts on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchTicketCounts = async () => {
      try {
        const response = await fetch('/api/admin/tickets/counts');
        
        if (!isMounted) return;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (isMounted) {
          setTicketCounts(data);
          setIsLoadingCounts(false);
        }
      } catch (error) {
        console.error('Error fetching ticket counts:', error);
        if (isMounted) {
          // Set default counts on error
          setTicketCounts({
            total: 0,
            open: 0,
            pending: 0,
            resolved: 0,
            closed: 0
          });
          setIsLoadingCounts(false);
        }
      }
    };

    // Only fetch on client side
    if (typeof window !== 'undefined') {
      fetchTicketCounts();
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch agent counts on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchAgentCounts = async () => {
      try {
        const response = await fetch('/api/admin/agents');
        
        if (!isMounted) return;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (isMounted && data.summary) {
          setAgentCounts({
            total: data.summary.totalAgents || 0,
            online: data.summary.onlineAgents || 0,
            offline: data.summary.offlineAgents || 0
          });
          setIsLoadingAgentCounts(false);
        }
      } catch (error) {
        console.error('Error fetching agent counts:', error);
        if (isMounted) {
          // Set default counts on error
          setAgentCounts({
            total: 0,
            online: 0,
            offline: 0
          });
          setIsLoadingAgentCounts(false);
        }
      }
    };

    // Only fetch on client side
    if (typeof window !== 'undefined') {
      fetchAgentCounts();
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch departments on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/admin/departments');
        
        if (!isMounted) return;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (isMounted && data.departments) {
          // Filter only active departments
          const activeDepartments = data.departments.filter(dept => dept.isActive !== false);
          setDepartments(activeDepartments);
          setIsLoadingDepartments(false);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        if (isMounted) {
          setDepartments([]);
          setIsLoadingDepartments(false);
        }
      }
    };

    // Only fetch on client side
    if (typeof window !== 'undefined') {
      fetchDepartments();
      
      // Listen for department updates
      const handleDepartmentUpdate = () => {
        fetchDepartments();
      };
      
      window.addEventListener('departmentUpdated', handleDepartmentUpdate);
      
      return () => {
        isMounted = false;
        window.removeEventListener('departmentUpdated', handleDepartmentUpdate);
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: 'dashboard',
      current: router.pathname === '/admin'
    },
    {
      name: 'Tickets',
      href: '/admin/tickets',
      icon: 'tickets',
      current: router.pathname.startsWith('/admin/tickets'),
      hasSubmenu: true,
      submenu: [
        { name: 'All Tickets', href: '/admin/tickets', count: isLoadingCounts ? '...' : ticketCounts.total },
            { name: 'Tickets Assigned to Me', href: '/admin/tickets/assigned-to-me' },
        { name: 'Open Tickets', href: '/admin/tickets?status=open', count: isLoadingCounts ? '...' : ticketCounts.open },
        { name: 'Pending', href: '/admin/tickets?status=pending', count: isLoadingCounts ? '...' : ticketCounts.pending },
        { name: 'Resolved', href: '/admin/tickets?status=resolved', count: isLoadingCounts ? '...' : ticketCounts.resolved },
        { name: 'Closed', href: '/admin/tickets?status=closed', count: isLoadingCounts ? '...' : ticketCounts.closed },
        { name: 'Ticket Templates', href: '/admin/ticket-templates' }
      ]
    },
    {
      name: 'Agents',
      href: '/admin/agents',
      icon: 'users',
      current: router.pathname.startsWith('/admin/agents'),
      hasSubmenu: true,
      submenu: [
        { name: 'All Agents', href: '/admin/agents', count: isLoadingAgentCounts ? '...' : agentCounts.total },
        { name: 'Online', href: '/admin/agents?status=online', count: isLoadingAgentCounts ? '...' : agentCounts.online },
        { name: 'Offline', href: '/admin/agents?status=offline', count: isLoadingAgentCounts ? '...' : agentCounts.offline }
      ]
    },
    {
      name: 'Role',
      href: '/admin/roles',
      icon: 'shield',
      current:
        router.pathname.startsWith('/admin/roles') ||
        router.pathname.startsWith('/admin/role-access') ||
        router.pathname.startsWith('/admin/users'),
      hasSubmenu: true,
      submenu: [
        { name: 'Role List', href: '/admin/roles' },
        { name: 'Role Access', href: '/admin/role-access' },
        { name: 'Users', href: '/admin/users' }
      ]
    },
    {
      name: 'Departments',
      href: '/admin/departments',
      icon: 'departments',
      current: router.pathname.startsWith('/admin/departments'),
      hasSubmenu: true,
      submenu: [
        { name: 'All Departments', href: '/admin/departments' },
        { name: 'Sales & Operations', href: '/admin/departments?sales=true' },
        { name: 'Technical Support', href: '/admin/departments?technical=true' },
        ...(isLoadingDepartments
          ? [{ name: 'Loading...', href: '#', disabled: true }]
          : departments
              .filter((dept) => !['Sales & Operations', 'Technical Support'].includes(dept.name))
              .map((dept) => ({
                name: dept.name,
                href: `/admin/departments?id=${dept.id}`
              }))
        )
      ]
    },
    {
      name: 'Products',
      href: '/admin/products',
      icon: 'package',
      current: router.pathname.startsWith('/admin/products')
    },
    {
      name: 'Tutorials & Guides',
      href: '/admin/tutorials',
      icon: 'graduation',
      current: router.pathname.startsWith('/admin/tutorials')
    },
    {
      name: 'Callbacks',
      href: '/admin/callbacks',
      icon: 'phone',
      current: router.pathname.startsWith('/admin/callbacks')
    },
    {
      name: 'Knowledge Base',
      href: '/admin/knowledge-base',
      icon: 'kb',
      current: router.pathname.startsWith('/admin/knowledge-base'),
      hasSubmenu: true,
      submenu: [
        { name: 'All Articles', href: '/admin/knowledge-base' },
        { name: 'Published', href: '/admin/knowledge-base?status=published' },
        { name: 'Draft', href: '/admin/knowledge-base?status=draft' },
        { name: 'Categories', href: '/admin/knowledge-base/categories' }
      ]
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: 'reports',
      current: router.pathname.startsWith('/admin/reports'),
      hasSubmenu: true,
      submenu: [
        { name: 'Overview', href: '/admin/reports' },
        { name: 'Performance', href: '/admin/reports/performance' },
        { name: 'SLA Reports', href: '/admin/reports/sla' },
        { name: 'Agent Reports', href: '/admin/reports/agents' },
        { name: 'Customer Reports', href: '/admin/reports/customers' }
      ]
    },
    {
      name: 'SLA Management',
      href: '/admin/sla',
      icon: 'clock',
      current: router.pathname.startsWith('/admin/sla'),
      hasSubmenu: true,
      submenu: [
        { name: 'Dashboard', href: '/admin/sla' },
        { name: 'Policies', href: '/admin/sla/policies' },
        { name: 'Workflows', href: '/admin/sla/workflows' },
        { name: 'Active Timers', href: '/admin/sla?tab=active' },
        { name: 'Reports & Analytics', href: '/admin/sla/reports' }
      ]
    },
    {
      name: 'Integrations',
      href: '/admin/integrations',
      icon: 'puzzle',
      current: router.pathname.startsWith('/admin/integrations')
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: 'settings',
      current: router.pathname.startsWith('/admin/settings'),
      hasSubmenu: true,
      submenu: [
        { name: 'Basic Settings', href: '/admin/settings#basic-settings' },
        { name: 'Captcha Settings', href: '/admin/settings#captcha-settings' },
        { name: 'AI Settings', href: '/admin/settings#ai-settings' },
        { name: 'File Upload Settings', href: '/admin/settings#file-upload-settings' },
        { name: 'Ticket Settings', href: '/admin/settings#ticket-settings' },
        { name: 'Notification Settings', href: '/admin/settings#notification-settings' },
        { name: 'Security Settings', href: '/admin/settings#security-settings' },
        { name: 'Email Settings', href: '/admin/settings/email' }
      ]
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
                        {item.icon === 'users' && <Users className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'departments' && <Building2 className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'package' && <Package className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'file-text' && <FileText className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'trending-up' && <TrendingUp className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'puzzle' && <Puzzle className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'kb' && <BookOpen className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'reports' && <BarChart3 className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'clock' && <Clock className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'message-circle' && <MessageCircle className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'widgets' && <Puzzle className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'settings' && <SettingsIcon className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.icon === 'shield' && <Shield className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                        {item.name}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedItems.includes(item.name.toLowerCase()) ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Submenu */}
                    {expandedItems.includes(item.name.toLowerCase()) && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.submenu.map((subItem) => {
                          if (subItem.disabled) {
                            return (
                              <div key={subItem.name} className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
                                {subItem.name}
                              </div>
                            );
                          }
                          const isHashLink = subItem.href.includes('#');
                          const pathWithoutHash = isHashLink ? subItem.href.split('#')[0] : subItem.href;
                          const hash = isHashLink ? subItem.href.split('#')[1] : null;
                          
                          // Check if active - for hash links, check both path and hash
                          const isActive = isHashLink 
                            ? router.pathname === pathWithoutHash && currentHash === `#${hash}`
                            : router.pathname === subItem.href || 
                              router.asPath === subItem.href || 
                              (subItem.href.includes('?') && (
                                (subItem.href.includes('?status=') && router.query.status === subItem.href.split('?status=')[1]) ||
                                (subItem.href.includes('?id=') && router.query.id === subItem.href.split('?id=')[1])
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
                                } ${subItem.isAction ? 'border-l-2 border-violet-300 bg-violet-50/30 dark:border-slate-600 dark:bg-slate-800/60' : ''}`}
                              >
                                <span className="flex items-center">
                                  {subItem.isAction && (<Plus className="w-4 h-4 mr-2 text-violet-500" />)}
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
                      {item.icon === 'users' && <Users className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'departments' && <Building2 className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'package' && <Package className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'graduation' && <GraduationCap className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'phone' && <Phone className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'file-text' && <FileText className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'trending-up' && <TrendingUp className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'puzzle' && <Puzzle className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'kb' && <BookOpen className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'reports' && <BarChart3 className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'clock' && <Clock className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'message-circle' && <MessageCircle className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'widgets' && <Puzzle className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'settings' && <SettingsIcon className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
                      {item.icon === 'shield' && <Shield className={`w-5 h-5 mr-3 ${item.current ? 'text-violet-600' : 'text-slate-400'}`} />}
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
