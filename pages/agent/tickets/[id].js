import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AgentLayout from '../../../components/agent/universal/AgentLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { formatTAT } from '../../../lib/utils/tat';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import useSocket from '../../../src/hooks/useSocket';
import { useSocketListener } from '../../../hooks/useSocketListener';
import { useAgentAuth } from '../../../contexts/AgentAuthContext';
import { agentFetch } from '../../../lib/utils/agent-fetch';
import {
  Ticket,
  Hash,
  Clock,
  ArrowLeft,
  MessageSquare,
  FileText,
  Send as SendIcon,
  StickyNote,
  Pin as PinIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  UserX,
  Check as CheckIcon,
  X as XIcon,
  X,
  UserCircle,
  Tag,
  Tag as TagIcon,
  Plus,
  File,
  Paperclip,
  Image as ImageIcon,
  Reply,
  FileCode,
  Maximize2,
  Minimize2,
  Smile,
  Zap,
  BookOpen,
  Search,
  Copy,
  Users,
  ArrowRight,
  Link2,
  Timer,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Activity,
  ArrowUp,
  Package,
  Circle,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Pause,
  Keyboard,
  ExternalLink,
  Download,
  RefreshCw,
  TrendingUp,
  HandHeart
} from 'lucide-react';
import EmojiPicker from '../../../components/widget/chat/EmojiPicker';
import FeedbackSystemMessage from '../../../components/widget/chat/FeedbackSystemMessage';
import EscalateTicketModal from '../../../components/admin/EscalateTicketModal';
import ReopenTicketModal from '../../../components/admin/ReopenTicketModal';
import TransferTicketModal from '../../../components/agent/TransferTicketModal';
import ChangeDepartmentModal from '../../../components/agent/ChangeDepartmentModal';
import KBSelectionModal from '../../../components/universal/chat/KBSelectionModal';
import KBArticleCard from '../../../components/universal/chat/KBArticleCard';
import ArticleViewerModal from '../../../components/universal/chat/ArticleViewerModal';
import MacroAutocomplete from '../../../components/universal/chat/MacroAutocomplete';
import { formatMessageContent } from '../../../utils/textFormatting';
import { blocksToPlainText, isBlocksContent } from '../../../utils/blockRenderer';

export default function TicketViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAgentAuth();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [showPriorityReasonModal, setShowPriorityReasonModal] = useState(false);
  const [pendingPriority, setPendingPriority] = useState(null);
  const [priorityReason, setPriorityReason] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [editingTicket, setEditingTicket] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [activeTab, setActiveTab] = useState('conversation');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [creatingNote, setCreatingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [agents, setAgents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [routingDepartment, setRoutingDepartment] = useState(false);
  const [editTicketData, setEditTicketData] = useState({ subject: '', category: '', productId: '', accessoryId: '' });
  const [editingCreationDetails, setEditingCreationDetails] = useState(false);
  const [creationDetailsData, setCreationDetailsData] = useState({});
  const [creationDetailsEdited, setCreationDetailsEdited] = useState(false);
  const [savingCreationDetails, setSavingCreationDetails] = useState(false);
  const [products, setProducts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [issueCategories, setIssueCategories] = useState([]);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [ticketTags, setTicketTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [conversationExpanded, setConversationExpanded] = useState(true); // Always expanded by default
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // { file, previewUrl, type, name }
  const [isUploading, setIsUploading] = useState(false);
  const [fileSizeError, setFileSizeError] = useState(null); // { fileSizeMB: string }
  const fileInputRef = useRef(null);
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [cannedResponses, setCannedResponses] = useState([]);
  const [showKBSearch, setShowKBSearch] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewingImage, setViewingImage] = useState(null); // { url: string, index: number }
  const [showKBModal, setShowKBModal] = useState(false);
  const [viewingArticle, setViewingArticle] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [customerTickets, setCustomerTickets] = useState([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(-1);
  const [loadingCustomerTickets, setLoadingCustomerTickets] = useState(false);
  // Timer state - simplified for server-synced display
  const [timerData, setTimerData] = useState({ 
    activeLog: null, 
    totalSeconds: 0, 
    status: 'STOPPED',
    historyLogs: [] 
  });
  const [loadingWorklogs, setLoadingWorklogs] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [worklogReasons, setWorklogReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [manualStop, setManualStop] = useState(false); // Manual override to prevent auto-start loop
  const [ticketViewers, setTicketViewers] = useState([]); // Array of { userId, userName, userAvatar }
  const [adminProfile, setAdminProfile] = useState({ name: 'Agent', avatarUrl: null }); // Current agent profile
  const socketRef = useSocket();
  const [fileUploadSettings, setFileUploadSettings] = useState({
    maxUploadSize: 10,
    allowedFileTypes: [],
    ticketFileUpload: true
  });
  const [ticketSettings, setTicketSettings] = useState({
    hidePriorityAgent: false
  });
  const [slaTimers, setSlaTimers] = useState([]);
  const [slaRiskStatus, setSlaRiskStatus] = useState(null); // 'on_track', 'at_risk', 'critical', 'breached', 'paused'
  const [macros, setMacros] = useState([]);
  const [showMacrosPopup, setShowMacrosPopup] = useState(false);
  const [macrosSearchQuery, setMacrosSearchQuery] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showChangeDepartmentModal, setShowChangeDepartmentModal] = useState(false);
  const macrosButtonRef = useRef(null);
  const macrosPopupRef = useRef(null);

  // Macro suggestions state (for "/" autocomplete)
  const [macroSuggestionsState, setMacroSuggestionsState] = useState({
    show: false,
    query: '',
    selectedIndex: 0,
    startIndex: 0
  });

  // Refs for conversation scroll containers
  const conversationScrollRef = useRef(null);

  // Mention autocomplete state
  const [mentionState, setMentionState] = useState({
    show: false,
    query: '',
    position: null,
    selectedIndex: 0,
    textareaRef: null,
    textareaValue: '',
    setTextareaValue: null
  });
  const [mentionableUsers, setMentionableUsers] = useState([]); // Agents + Admins

  // Dropdown position tracking for portal rendering
  const [statusDropdownPosition, setStatusDropdownPosition] = useState(null);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState(null);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [departmentDropdownPosition, setDepartmentDropdownPosition] = useState(null);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeDropdownPosition, setAssigneeDropdownPosition] = useState(null);

  // Refs for dropdown buttons
  const statusButtonRef = useRef(null);
  const priorityButtonRef = useRef(null);
  const departmentButtonRef = useRef(null);
  const assigneeButtonRef = useRef(null);
  const messageTextareaRef = useRef(null);
  const noteTextareaRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate read-only mode: ticket is assigned to another agent (not unassigned) and current user is not admin
  // Note: Admin check would need to be added if user object has isAdmin property
  const isReadOnly = ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id;

  // Close macros popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMacrosPopup &&
        macrosButtonRef.current &&
        macrosPopupRef.current &&
        !macrosButtonRef.current.contains(event.target) &&
        !macrosPopupRef.current.contains(event.target)
      ) {
        setShowMacrosPopup(false);
        setMacrosSearchQuery('');
      }
    };

    if (showMacrosPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMacrosPopup]);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchNotes();
      fetchAgents();
      fetchDepartments();
      fetchTags();
      fetchAvailableTags();
      fetchSLATimers();
      fetchActivities();
      fetchMentionableUsers();
    }
  }, [id]);

  // Lock body scroll when priority modal is open
  useEffect(() => {
    if (showPriorityReasonModal) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Lock body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showPriorityReasonModal]);

  // Live updates: Listen for ticket changes from admins or other agents
  useSocketListener('ticket:updated', (data) => {
    if (data && data.ticketNumber === id) {
      console.log('⚡ Live Update: Refreshing Ticket Details');
      fetchTicketDetails(true); // Silent refresh
    }
  }, [id]);

  useSocketListener('ticket:status:changed', (data) => {
    if (data && data.ticketNumber === id) {
      console.log('⚡ Live Update: Ticket Status Changed');
      fetchTicketDetails(true); // Silent refresh
    }
  }, [id]);

  useSocketListener('ticket:priority:changed', (data) => {
    if (data && data.ticketNumber === id) {
      console.log('⚡ Live Update: Ticket Priority Changed');
      fetchTicketDetails(true); // Silent refresh
    }
  }, [id]);

  useSocketListener('ticket:assigned', (data) => {
    if (data && (data.ticketId === id || data.ticketNumber === id)) {
      console.log('⚡ Live Update: Ticket Assignment Changed');
      fetchTicketDetails(true); // Silent refresh
    }
  }, [id]);

  useSocketListener('message:created', (data) => {
    if (data && (data.conversationId === id || data.ticketNumber === id)) {
      console.log('⚡ Live Update: New Message Received');
      fetchTicketDetails(true); // Silent refresh to show new message
    }
  }, [id]);

  // Reset sidebar hover state when tab changes
  useEffect(() => {
    if (activeTab !== 'details') {
      setSidebarHovered(false);
    }
  }, [activeTab]);

  // Fetch macros on mount
  useEffect(() => {
    fetchMacros();
  }, []);

  // Fetch file upload and ticket settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [fileUploadRes, ticketRes] = await Promise.all([
          fetch('/api/agent/settings/file-upload').catch(() => ({ ok: false })),
          fetch('/api/agent/settings/ticket').catch(() => ({ ok: false }))
        ]);

        if (fileUploadRes.ok) {
          try {
            const contentType = fileUploadRes.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const fileUploadData = await fileUploadRes.json();
              if (fileUploadData.success) {
                setFileUploadSettings({
                  maxUploadSize: parseInt(fileUploadData.settings.maxUploadSize || '10', 10),
                  allowedFileTypes: fileUploadData.settings.allowedFileTypes || [],
                  ticketFileUpload: fileUploadData.settings.ticketFileUpload !== false
                });
              }
            }
          } catch (e) {
            console.warn('Error parsing file upload settings:', e);
          }
        }

        if (ticketRes.ok) {
          try {
            const contentType = ticketRes.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const ticketData = await ticketRes.json();
              if (ticketData.success) {
                setTicketSettings({
                  hidePriorityAgent: ticketData.settings.hidePriorityAgent || false
                });
              }
            }
          } catch (e) {
            console.warn('Error parsing ticket settings:', e);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
    fetchProducts();
    fetchAccessories();
    fetchIssueCategories();
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/agent/products?includeInactive=false');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      }
    } catch (error) {
      console.warn('Error fetching products:', error);
    }
  };

  // Fetch accessories
  const fetchAccessories = async () => {
    try {
      const res = await fetch('/api/agent/accessories?includeInactive=false');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setAccessories(data.accessories || []);
        }
      }
    } catch (error) {
      console.warn('Error fetching accessories:', error);
    }
  };

  // Fetch issue categories
  const fetchIssueCategories = async () => {
    try {
      const res = await fetch('/api/admin/issue-categories?activeOnly=true');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            setIssueCategories(data.categories || []);
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching issue categories:', error);
    }
  };

  // Fetch canned responses (macros)
  const fetchMacros = async () => {
    try {
      const res = await fetch('/api/admin/canned-responses', {
        credentials: 'include' // Include cookies for authentication
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.data) {
            // Transform canned responses to match macro structure for compatibility
            setMacros(data.data || []);
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching canned responses:', error);
    }
  };

  // Handle macro selection
  const handleMacroSelect = (macro) => {
    const newValue = newMessage ? `${newMessage}\n${macro.content}` : macro.content;
    setNewMessage(newValue);
    setShowMacrosPopup(false);
    setMacrosSearchQuery('');
    // Focus textarea and resize
    if (messageTextareaRef.current) {
      messageTextareaRef.current.focus();
      // Trigger resize after state update
      setTimeout(() => {
        if (messageTextareaRef.current) {
          messageTextareaRef.current.style.height = 'auto';
          const newHeight = Math.min(messageTextareaRef.current.scrollHeight, 200);
          messageTextareaRef.current.style.height = `${newHeight}px`;
        }
      }, 0);
    }
  };

  // Track ticket view for presence avatars
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !id) return;

    // CRITICAL: Force socket connection (ensure socket is connected before using it)
    if (!socket.connected) {
      console.log('🔌 Agent Ticket Page: Socket not connected, forcing connection...');
      socket.connect();

      // Add one-time connection event listeners for this page
      socket.once('connect', () => {
        console.log('✅ Agent Ticket Page: Socket connected successfully! ID:', socket.id);
      });

      socket.once('connect_error', (error) => {
        console.error('❌ Agent Ticket Page: Socket connection error:', error.message);
      });
    } else {
      console.log('✅ Agent Ticket Page: Socket already connected, ID:', socket.id);
    }

    // Get current agent info - fetch from API if available
    let adminName = 'Agent';
    let adminId = 'agent';
    let adminAvatar = null;

    // Try to fetch agent info
    fetch('/api/agent/profile')
      .then(async (res) => {
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          }
        }
        return null;
      })
      .then(data => {
        if (data?.data) {
          adminName = data.data.name || 'Agent';
          adminId = data.data.id || 'agent';
          adminAvatar = data.data.avatarUrl || null;
          // Store agent profile for use in messages
          setAdminProfile({ name: adminName, avatarUrl: adminAvatar });
        }
      })
      .catch(() => {
        // Use defaults if fetch fails
      })
      .finally(() => {
        // Always add current user immediately for visibility
        const currentUser = {
          userId: adminId,
          userName: adminName,
          userAvatar: adminAvatar
        };

        // Set initial viewers with current user (fallback if socket fails)
        setTicketViewers([currentUser]);

        // Wait for socket to be connected
        let retryCount = 0;
        const maxRetries = 50; // 5 seconds max wait

        const checkConnection = () => {
          if (socket.connected) {
            // Join ticket room for real-time messages
            console.log(`🔌 Agent: Joining room ticket_${id}`);
            socket.emit('join_ticket_room', { ticketId: id }); // id is ticketNumber

            // Emit ticket:view when socket is connected
            socket.emit('ticket:view', {
              ticketId: id,
              userId: adminId,
              userName: adminName,
              userAvatar: adminAvatar
            }, (response) => {
              if (response?.success && response?.viewers) {
                // Merge with current user, avoiding duplicates
                const allViewers = [currentUser];
                response.viewers.forEach(viewer => {
                  if (viewer.userId !== adminId) {
                    allViewers.push(viewer);
                  }
                });
                setTicketViewers(allViewers);
              } else {
                // If response doesn't have viewers, keep current user visible
                setTicketViewers([currentUser]);
              }
            });
          } else if (retryCount < maxRetries) {
            // Wait a bit and retry if not connected
            retryCount++;
            setTimeout(checkConnection, 100);
          } else {
            // After max retries, keep current user visible as fallback
            setTicketViewers([currentUser]);
          }
        };

        // Start checking connection
        checkConnection();
      });

    // Listen for viewer joined/left events
    const handleViewerJoined = (data) => {
      if (data.ticketId === id && data.viewer) { // id is ticketNumber
        setTicketViewers(prev => {
          // Avoid duplicates
          if (prev.some(v => v.userId === data.viewer.userId)) {
            return prev;
          }
          return [...prev, data.viewer];
        });
      }
    };

    const handleViewerLeft = (data) => {
      if (data.ticketId === id) {
        setTicketViewers(prev => prev.filter(v => v.userId !== data.userId));
      }
    };

    // Also listen for connection events
    const handleConnect = () => {
      // Re-join ticket room and re-emit ticket:view when reconnected
      if (id) {
        console.log(`🔌 Agent: Reconnected, joining room ticket_${id}`);
        socket.emit('join_room', { conversationId: id }); // id is ticketNumber
        socket.emit('join_ticket_room', { ticketId: id }); // Legacy support

        fetch('/api/agent/profile')
          .then(async (res) => {
            if (res.ok) {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                return res.json();
              }
            }
            return null;
          })
          .then(data => {
            const userName = data?.data?.name || 'Agent';
            const userId = data?.data?.id || 'agent';
            const userAvatar = data?.data?.avatarUrl || null;

            socket.emit('ticket:view', {
              ticketId: id,
              userId,
              userName,
              userAvatar
            }, (response) => {
              if (response?.success && response?.viewers) {
                const currentUser = { userId, userName, userAvatar };
                const allViewers = [currentUser];
                response.viewers.forEach(viewer => {
                  if (viewer.userId !== userId) {
                    allViewers.push(viewer);
                  }
                });
                setTicketViewers(allViewers);
              }
            });
          })
          .catch(() => { });
      }
    };

    // Listen for new messages
    const handleReceiveMessage = (messageData) => {
      console.log('📨 Agent: Received message:', messageData);

      // CRITICAL: Socket ID Exclusion - ignore if this is our own message
      if (messageData.socketId === socket.id) {
        console.log('⚠️ Agent: Ignoring own message (socketId match):', messageData.id);
        return;
      }

      // Only process messages for this conversation
      if (messageData.conversationId === id) { // id is ticketNumber
        setMessages(prev => {
          // Check if message already exists (safety net)
          if (prev.some(m => m.id === messageData.id)) {
            console.log('⚠️ Agent: Message already exists, skipping:', messageData.id);
            return prev;
          }

          console.log('✅ Agent: Adding new message:', messageData.id);
          return [...prev, {
            id: messageData.id,
            content: messageData.content,
            senderType: messageData.senderType,
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            senderAvatar: null, // Can be enhanced later
            createdAt: messageData.createdAt,
            metadata: messageData.metadata || undefined,
            replyTo: messageData.replyTo || null
          }];
        });

        // Update ticket's lastMessageAt
        setTicket(prev => prev ? {
          ...prev,
          lastMessageAt: messageData.createdAt
        } : prev);

        // Scroll to bottom
        setTimeout(() => {
          if (conversationScrollRef.current) {
            conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
          }
        }, 100);
      }
    };

    socket.on('ticket:viewer:joined', handleViewerJoined);
    socket.on('ticket:viewer:left', handleViewerLeft);
    socket.on('connect', handleConnect);
    socket.on('receive_message', handleReceiveMessage);

    // Cleanup: leave ticket view when component unmounts
    return () => {
      socket.off('ticket:viewer:joined', handleViewerJoined);
      socket.off('ticket:viewer:left', handleViewerLeft);
      socket.off('connect', handleConnect);
      socket.off('receive_message', handleReceiveMessage);
      if (socket.connected && id) {
        socket.emit('ticket:leave', { ticketId: id });
        socket.emit('leave_ticket_room', { ticketId: id });
      }
    };
  }, [id]);

  // Format duration helper (HH:MM:SS)
  const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return '00:00:00';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Refresh timer data from server
  const refreshTimer = async () => {
    if (!id || !ticket?.ticketNumber) return;
    
    try {
      setLoadingWorklogs(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('agentAuthToken') : null;
      const response = await fetch(`/api/agent/worklogs?ticketNumber=${ticket.ticketNumber}&_t=${Date.now()}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setTimerData({
            activeLog: data.data.activeLog,
            totalSeconds: data.data.totalSeconds || 0,
            status: data.data.activeLog ? 'RUNNING' : 'STOPPED',
            historyLogs: data.data.historyLogs || []
          });
        }
      }
    } catch (error) {
      console.warn('Error refreshing timer:', error);
    } finally {
      setLoadingWorklogs(false);
    }
  };

  // Start worklog session
  const handleManualStart = async () => {
    if (!ticket?.ticketNumber) return;
    
    // Release the brake - user explicitly wants to start
    setManualStop(false);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('agentAuthToken') : null;
      const response = await fetch('/api/agent/worklogs/start', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ticketNumber: ticket.ticketNumber })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh timer to sync with server
          await refreshTimer();
        }
      }
    } catch (error) {
      console.error('Error starting worklog:', error);
    }
  };

  // Fetch worklog reasons
  const fetchWorklogReasons = async () => {
    try {
      setLoadingReasons(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('agentAuthToken') : null;
      const response = await fetch('/api/agent/worklogs/reasons', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setWorklogReasons(data.data);
        }
      }
    } catch (error) {
      console.warn('Error fetching worklog reasons:', error);
    } finally {
      setLoadingReasons(false);
    }
  };

  // Stop worklog session - opens modal
  const handleManualStopClick = () => {
    if (!ticket?.ticketNumber) return;
    setIsStopModalOpen(true);
    // Fetch reasons when modal opens
    if (worklogReasons.length === 0) {
      fetchWorklogReasons();
    }
  };

  // Confirm stop with reason
  // skipModal: if true, don't close modal (it wasn't open) and don't set manualStop
  const handleStopConfirm = async (reasonId, reasonName, skipModal = false) => {
    if (!ticket?.ticketNumber) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('agentAuthToken') : null;
      const response = await fetch('/api/agent/worklogs/stop', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ 
          ticketNumber: ticket.ticketNumber, 
          reasonId: reasonId,
          stopReason: reasonName 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to stop worklog' }));
        showNotification('error', errorData.message || `Failed to stop timer (${response.status})`);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        if (!skipModal) {
          setIsStopModalOpen(false);
          // Engage the brake - prevent auto-start loop (only for manual stops)
          setManualStop(true);
        }
        showNotification('success', 'Timer stopped successfully');
        // SYNC WITH SERVER IMMEDIATELY
        await refreshTimer();
      } else {
        showNotification('error', data.message || 'Failed to stop timer');
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
      showNotification('error', `Error: ${error.message || 'Failed to stop timer'}`);
    }
  };

  // Ticker: Visual only - increment every second when active
  useEffect(() => {
    if (!timerData.activeLog) return;
    
    // Tick every second to update the UI visually
    const interval = setInterval(() => {
      setTimerData(prev => ({
        ...prev,
        totalSeconds: prev.totalSeconds + 1
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timerData.activeLog]);

  // Auto-start: On mount or when ticket loads
  useEffect(() => {
    // BLOCKER: If the user manually stopped the timer, DO NOT auto-start.
    if (manualStop) return;
    
    if (ticket && ticket.status !== 'resolved' && ticket.status !== 'closed' && 
        user?.id === ticket.assigneeId && !timerData.activeLog && !loadingWorklogs) {
      handleManualStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.status, ticket?.assigneeId, user?.id, timerData.activeLog, loadingWorklogs, manualStop]);

  // Auto-stop: If Status changes to Resolved/Closed (fallback for external changes)
  // Note: This is a fallback for cases where status changes externally (e.g., admin resolves)
  // When agent clicks "Resolve", handleStatusUpdate handles the timer stop directly
  useEffect(() => {
    if (ticket && (ticket.status === 'resolved' || ticket.status === 'closed') && 
        timerData.activeLog && !loadingWorklogs && !updatingStatus) {
      // Status changed externally (admin, system, etc.) - stop timer automatically without modal
      const stopReason = ticket.status === 'resolved' ? 'Ticket Resolved' : 'Ticket Closed';
      handleStopConfirm(null, stopReason, true); // skipModal=true: no modal, no manualStop flag
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.status, timerData.activeLog, loadingWorklogs, updatingStatus]);

  // Refresh timer when ticket status changes to resolved/closed (to sync with server-side auto-stop)
  useEffect(() => {
    if (ticket && (ticket.status === 'resolved' || ticket.status === 'closed') && !loadingWorklogs) {
      refreshTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.status]);

  // Initial fetch when ticket loads
  useEffect(() => {
    if (ticket?.ticketNumber) {
      refreshTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.ticketNumber]);

  // Fetch customer tickets when ticket is loaded
  useEffect(() => {
    if (ticket && ticket.customerId) {
      fetchCustomerTickets(ticket.customerId);
    }
  }, [ticket]);

  // Auto-scroll to bottom when messages change or conversation tab is active
  useEffect(() => {
    if (messages.length > 0 && activeTab === 'conversation') {
      // Use requestAnimationFrame for more reliable scrolling
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (conversationScrollRef.current) {
            conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
          }
        }, 150);
      });
    }
  }, [messages, activeTab]);

  // Auto-scroll when switching to conversation tab
  useEffect(() => {
    if (activeTab === 'conversation' && messages.length > 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (conversationScrollRef.current) {
            conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
          }
        }, 200);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (ticket) {
      setEditTicketData({
        subject: ticket.subject || '',
        category: ticket.category || 'WZATCO',
        productId: ticket.productId || '',
        accessoryId: ticket.accessoryId || ''
      });

      // Initialize creation details data
      setCreationDetailsData({
        customerEmail: ticket.customerEmail || '',
        customerPhone: ticket.customerPhone || '',
        customerAltPhone: ticket.customerAltPhone || '',
        customerAddress: ticket.customerAddress || '',
        orderNumber: ticket.orderNumber || '',
        purchasedFrom: ticket.purchasedFrom || '',
        ticketBody: ticket.ticketBody || '',
        invoiceUrl: ticket.invoiceUrl || '',
        issueVideoLink: ticket.issueVideoLink || '',
        issueType: ticket.issueType || ''
      });

    }
  }, [ticket]);

  const fetchActivities = async () => {
    try {
      setLoadingActivities(true);
      const response = await fetch(`/api/agent/tickets/${id}/activities`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          const fetchedActivities = data.activities || [];
          setActivities(fetchedActivities);

          // Check if creation details have been edited
          const hasCreationDetailsActivity = fetchedActivities.some(activity => activity.activityType === 'creation_details_updated');
          setCreationDetailsEdited(hasCreationDetailsActivity);
        }
      }
    } catch (error) {
      console.warn('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchCustomerTickets = async (customerId) => {
    try {
      setLoadingCustomerTickets(true);
      const response = await fetch(`/api/agent/tickets/customer/${customerId}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.tickets) {
            setCustomerTickets(data.tickets);
            // Find current ticket index by ticketNumber
            const index = data.tickets.findIndex(t => t.ticketNumber === id);
            setCurrentTicketIndex(index);
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching customer tickets:', error);
    } finally {
      setLoadingCustomerTickets(false);
    }
  };

  const navigateToTicket = (direction) => {
    if (customerTickets.length <= 1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentTicketIndex > 0 ? currentTicketIndex - 1 : customerTickets.length - 1;
    } else {
      newIndex = currentTicketIndex < customerTickets.length - 1 ? currentTicketIndex + 1 : 0;
    }

    const nextTicket = customerTickets[newIndex];
    if (nextTicket) {
      // Use ticketNumber (primary key)
      router.push(`/agent/tickets/${nextTicket.ticketNumber}`);
    }
  };

  const fetchTicketDetails = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(`/api/agent/tickets/${id}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();

          // Log projector images for debugging
          console.log('[Ticket Details] Projector Images:', data.ticket?.projectorImages);
          console.log('[Ticket Details] Projector Images Type:', typeof data.ticket?.projectorImages);

          setTicket(data.ticket);
          // CRITICAL: Set ALL messages - no filtering
          setMessages(data.messages || []);
          
          // Log for debugging
          if (data.messages && data.messages.length > 0) {
            const messageTypes = data.messages.reduce((acc, msg) => {
              acc[msg.senderType] = (acc[msg.senderType] || 0) + 1;
              return acc;
            }, {});
            console.log('[Frontend] Messages received:', {
              total: data.messages.length,
              byType: messageTypes
            });
          }

          // Scroll to bottom after messages are loaded (with delay to ensure DOM is ready)
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (conversationScrollRef.current && activeTab === 'conversation') {
                conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
              }
            }, 200);
          });
        } else {
          console.error('Error fetching ticket: Response is not JSON');
        }
      } else {
        try {
          const errorData = await response.json();
          console.error('Error fetching ticket:', errorData.message || 'Unknown error');
        } catch (e) {
          console.error('Error fetching ticket: HTTP', response.status);
        }
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };


  const fetchSLATimers = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/agent/sla/timers?conversationId=${id}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.timers) {
            setSlaTimers(data.timers || []);

            // Calculate overall risk status (worst case)
            if (data.timers.length === 0) {
              setSlaRiskStatus(null);
              return;
            }

            // Find the worst status among all timers
            const statuses = data.timers.map(t => t.displayStatus);
            if (statuses.includes('breached')) {
              setSlaRiskStatus('breached');
            } else if (statuses.includes('critical')) {
              setSlaRiskStatus('critical');
            } else if (statuses.includes('at_risk')) {
              setSlaRiskStatus('at_risk');
            } else if (statuses.includes('paused')) {
              setSlaRiskStatus('paused');
            } else {
              setSlaRiskStatus('on_track');
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching SLA timers:', error);
    }
  };





  const insertEmoji = (emoji) => {
    const textareaId = 'normal-textarea';
    let textarea = document.getElementById(textareaId) || messageTextareaRef.current;
    if (!textarea) {
      textarea = document.querySelector('textarea[placeholder="Type your message here..."]');
    }
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = newMessage.substring(0, start) + emoji + newMessage.substring(start);
    setNewMessage(newText);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      // Resize textarea after emoji insertion
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }, 0);
  };

  const insertCannedResponse = (response) => {
    const textareaId = 'normal-textarea';
    let textarea = document.getElementById(textareaId);
    if (!textarea) {
      textarea = document.querySelector('textarea[placeholder="Type your message here..."]');
    }
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = newMessage.substring(0, start) + response + newMessage.substring(start);
    setNewMessage(newText);
    
    // Resize textarea after canned response insertion
    setTimeout(() => {
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
        textarea.focus();
        textarea.setSelectionRange(start + response.length, start + response.length);
      }
    }, 0);
  };

  // Handle @ mention autocomplete and / macro suggestions
  const handleMentionInput = (value, setValue, textareaRef) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    // Check for macro suggestions first (if "/" is more recent than "@")
    if (lastSlashIndex !== -1 && (lastAtIndex === -1 || lastSlashIndex > lastAtIndex)) {
      const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
      // Check if there's a space or newline after / (meaning shortcut is complete)
      if (textAfterSlash.match(/^[a-zA-Z0-9._-]*$/)) {
        const query = textAfterSlash.toLowerCase();
        const filtered = macros.filter(m =>
          m.isActive &&
          m.shortcut &&
          (m.shortcut.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query))
        );

        if (filtered.length > 0) {
          setMacroSuggestionsState({
            show: true,
            query,
            selectedIndex: 0,
            startIndex: lastSlashIndex
          });
          // Hide mention dropdown
          setMentionState(prev => ({ ...prev, show: false }));
          return;
        }
      }
    }

    // Handle @ mentions
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's a space or newline after @ (meaning mention is complete)
      if (textAfterAt.match(/^[a-zA-Z0-9._-]*$/)) {
        const query = textAfterAt.toLowerCase();
        const filtered = mentionableUsers.filter(user =>
          user.name.toLowerCase().includes(query) ||
          (user.email && user.email.toLowerCase().includes(query))
        );

        if (filtered.length > 0) {
          const rect = textareaRef.current.getBoundingClientRect();
          // Calculate position based on cursor position in textarea
          const textarea = textareaRef.current;
          const textBeforeCursor = value.substring(0, cursorPos);
          const lines = textBeforeCursor.split('\n');
          const currentLine = lines.length - 1;
          const lineHeight = 20; // Approximate line height

          setMentionState({
            show: true,
            query,
            position: {
              top: rect.top + window.scrollY + (currentLine * lineHeight) + 30,
              left: rect.left + window.scrollX + 10
            },
            selectedIndex: 0,
            textareaRef: textareaRef.current,
            textareaValue: value,
            setTextareaValue: setValue,
            startIndex: lastAtIndex
          });
          // Hide macro suggestions
          setMacroSuggestionsState(prev => ({ ...prev, show: false }));
          return;
        }
      }
    }

    // Hide both dropdowns if neither @ nor / is found
    setMentionState(prev => ({ ...prev, show: false }));
    setMacroSuggestionsState(prev => ({ ...prev, show: false }));
  };

  const insertMention = (user) => {
    const { textareaRef, textareaValue, setTextareaValue, startIndex } = mentionState;
    if (!textareaRef || !setTextareaValue) return;

    const mentionText = `@${user.name} `;
    const newText = textareaValue.substring(0, startIndex) + mentionText + textareaValue.substring(textareaRef.selectionStart);
    setTextareaValue(newText);
    setMentionState(prev => ({ ...prev, show: false }));

    setTimeout(() => {
      textareaRef.focus();
      const newCursorPos = startIndex + mentionText.length;
      textareaRef.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertMacro = (macro) => {
    if (!messageTextareaRef.current) return;

    const value = newMessage;
    const startIndex = macroSuggestionsState.startIndex;
    const cursorPos = messageTextareaRef.current.selectionStart || value.length;

    // Find the end of the shortcut (either a space, end of string, or cursor position)
    const textAfterSlash = value.substring(startIndex, cursorPos);
    const spaceIndex = textAfterSlash.indexOf(' ');
    const endIndex = spaceIndex !== -1 ? startIndex + spaceIndex : cursorPos;

    // Replace from "/" to endIndex with macro content
    const newText = value.substring(0, startIndex) + macro.content + value.substring(endIndex);
    setNewMessage(newText);
    setMacroSuggestionsState(prev => ({ ...prev, show: false }));

    setTimeout(() => {
      if (messageTextareaRef.current) {
        messageTextareaRef.current.focus();
        const newCursorPos = startIndex + macro.content.length;
        messageTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        // Auto-resize for multiline
        messageTextareaRef.current.style.height = 'auto';
        const newHeight = Math.min(messageTextareaRef.current.scrollHeight, 200);
        messageTextareaRef.current.style.height = `${newHeight}px`;
      }
    }, 0);
  };

  const handleMentionKeyDown = (e) => {
    // Handle macro suggestions first
    if (macroSuggestionsState.show) {
      const filtered = macros.filter(m =>
        m.isActive &&
        m.shortcut &&
        (!macroSuggestionsState.query ||
          m.shortcut.toLowerCase().includes(macroSuggestionsState.query.toLowerCase()) ||
          m.name.toLowerCase().includes(macroSuggestionsState.query.toLowerCase()))
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMacroSuggestionsState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, filtered.length - 1)
        }));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMacroSuggestionsState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[macroSuggestionsState.selectedIndex]) {
          insertMacro(filtered[macroSuggestionsState.selectedIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMacroSuggestionsState(prev => ({ ...prev, show: false }));
        return;
      }
    }

    // Handle mention dropdown
    if (!mentionState.show) return;

    const filtered = mentionableUsers.filter(user =>
      !mentionState.query ||
      user.name.toLowerCase().includes(mentionState.query.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(mentionState.query.toLowerCase()))
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionState(prev => ({
        ...prev,
        selectedIndex: Math.min(prev.selectedIndex + 1, filtered.length - 1)
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionState(prev => ({
        ...prev,
        selectedIndex: Math.max(prev.selectedIndex - 1, 0)
      }));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filtered[mentionState.selectedIndex]) {
        insertMention(filtered[mentionState.selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionState(prev => ({ ...prev, show: false }));
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    // File size validation (50MB limit)
    const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > maxFileSize) {
      setFileSizeError({ fileSizeMB });
      return;
    }

    // Determine file type
    const mimeType = file.type || 'application/octet-stream';
    let type = 'file';
    if (mimeType.startsWith('image/')) {
      type = 'image';
    } else if (mimeType.startsWith('video/')) {
      type = 'video';
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Set selected file state (draft mode)
    setSelectedFile({
      file,
      previewUrl,
      type,
      name: file.name
    });
  };

  const handleSendArticle = async (article) => {
    if (!article || sendingMessage || !id) return;

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      showNotification('error', 'Connection lost. Please refresh the page.');
      return;
    }

    // Get agent identity
    let agentId = 'agent';
    let agentName = adminProfile.name || 'Agent';
    let agentAvatar = adminProfile.avatarUrl || null;
    
    try {
      const profileResponse = await fetch('/api/agent/profile');
      if (profileResponse.ok) {
        const contentType = profileResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const profileData = await profileResponse.json();
          if (profileData?.data) {
            agentId = profileData.data.id || 'agent';
            agentName = profileData.data.name || 'Agent';
            agentAvatar = profileData.data.avatarUrl || null;
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch agent profile, using defaults');
    }

    const messageContent = `Shared article: ${article.title}`;
    
    // Convert excerpt to plain text if it's blocks content (same logic as admin knowledge-base page)
    let cleanExcerpt = article.excerpt || '';
    if (cleanExcerpt && isBlocksContent(cleanExcerpt, article.contentType)) {
      try {
        const plainText = blocksToPlainText(cleanExcerpt);
        cleanExcerpt = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
      } catch (e) {
        // If conversion fails, strip HTML from excerpt
        cleanExcerpt = typeof cleanExcerpt === 'string' ? cleanExcerpt.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : '';
      }
    } else if (cleanExcerpt && typeof cleanExcerpt === 'string') {
      // Strip HTML if present
      cleanExcerpt = cleanExcerpt.replace(/<[^>]*>/g, '').substring(0, 200) + (cleanExcerpt.length > 200 ? '...' : '');
    }
    
    const kbMetadata = {
      type: 'kb_article',
      title: article.title,
      slug: article.slug,
      excerpt: cleanExcerpt,
      articleId: article.id,
      contentType: article.contentType || null,
      category: article.category ? {
        id: article.category.id,
        name: article.category.name
      } : null
    };

    // Create optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: messageContent,
      senderType: 'agent',
      senderId: agentId,
      senderName: agentName,
      senderAvatar: agentAvatar,
      createdAt: new Date().toISOString(),
      metadata: kbMetadata,
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setShowKBModal(false);

    // Scroll to bottom
    setTimeout(() => {
      if (conversationScrollRef.current) {
        conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
      }
    }, 50);

    try {
      setSendingMessage(true);

      const payload = {
        conversationId: id,
        content: messageContent,
        senderId: agentId,
        senderType: 'agent',
        senderName: agentName,
        socketId: socket.id,
        metadata: kbMetadata
      };

      socket.emit('send_message', payload);

      socket.once('message_sent', (data) => {
        if (data.success) {
          setMessages(prev => prev.map(m => 
            m.id === optimisticMessage.id 
              ? { ...m, id: data.id, status: 'sent' }
              : m
          ));
        }
        setSendingMessage(false);
      });

      socket.once('message_error', (error) => {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        showNotification('error', error.message || 'Failed to send article');
        setSendingMessage(false);
      });

    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      showNotification('error', 'Failed to send article');
      setSendingMessage(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Don't send if both message and file are empty
    if ((!newMessage.trim() && !selectedFile) || sendingMessage || !id) return;

    const messageContent = newMessage.trim();
    const replyToId = replyingTo?.id || null;
    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      showNotification('error', 'Connection lost. Please refresh the page.');
      return;
    }

    // Get agent identity - fetch fresh if needed
    let adminId = 'agent';
    let adminName = adminProfile.name || 'Agent';
    let adminAvatar = adminProfile.avatarUrl || null;

    // Try to get agent ID from profile fetch
    try {
      const profileResponse = await fetch('/api/agent/profile');
      if (profileResponse.ok) {
        const contentType = profileResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const profileData = await profileResponse.json();
          if (profileData?.data) {
            adminId = profileData.data.id || 'agent';
            adminName = profileData.data.name || 'Agent';
            adminAvatar = profileData.data.avatarUrl || null;
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch agent profile, using defaults');
    }

    // Upload file if selected
    let attachmentMetadata = null;
    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile.file);

        const response = await fetch('/api/chat/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.success) {
              attachmentMetadata = {
                type: data.attachment.type,
                url: data.attachment.url,
                fileName: data.attachment.fileName,
              };
            } else {
              // Handle file size error specifically
              if (response.status === 413 || (data.error && (data.error.includes('exceeded') || data.error.includes('File size')))) {
                const fileSizeMB = (selectedFile.file.size / (1024 * 1024)).toFixed(2);
                setFileSizeError({ fileSizeMB });
              } else {
                showNotification('error', data.error || 'Failed to upload file');
              }
              setIsUploading(false);
              return;
            }
          }
        } else {
          // Handle file size error specifically
          if (response.status === 413) {
            const fileSizeMB = (selectedFile.file.size / (1024 * 1024)).toFixed(2);
            setFileSizeError({ fileSizeMB });
          } else {
            try {
              const errorData = await response.json();
              showNotification('error', errorData.error || 'Failed to upload file');
            } catch (e) {
              showNotification('error', 'Failed to upload file');
            }
          }
          setIsUploading(false);
          return;
        }
      } catch (error) {
        console.error('File upload error:', error);
        // Check if it's a file size error
        if (error.message && error.message.includes('exceeded')) {
          const fileSizeMB = (selectedFile.file.size / (1024 * 1024)).toFixed(2);
          setFileSizeError({ fileSizeMB });
        } else {
          showNotification('error', 'Failed to upload file');
        }
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
        // Clean up preview URL
        if (selectedFile.previewUrl) {
          URL.revokeObjectURL(selectedFile.previewUrl);
        }
        setSelectedFile(null);
      }
    }

    // Build replyTo object for optimistic message and payload
    const replyToObject = replyingTo ? {
      id: replyingTo.id,
      content: replyingTo.content,
      senderType: replyingTo.senderType,
      senderId: replyingTo.senderId,
      senderName: (() => {
        if (replyingTo.senderType === 'admin') {
          return replyingTo.senderName || 'Admin';
        }
        if (replyingTo.senderType === 'agent') {
          return replyingTo.senderName || 'Agent';
        }
        return replyingTo.senderName || ticket.customer?.name || 'Customer';
      })()
    } : null;

    // Create optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: messageContent,
      senderType: 'agent',
      senderId: adminId,
      senderName: adminName,
      senderAvatar: adminAvatar,
      createdAt: new Date().toISOString(),
      metadata: attachmentMetadata,
      replyTo: replyToObject,
      status: 'sending'
    };

    // Optimistically add to UI
    console.log('💬 Agent: Adding optimistic message');
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setReplyingTo(null);

    // Scroll to bottom
    setTimeout(() => {
      if (conversationScrollRef.current) {
        conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
      }
    }, 50);

    try {
      setSendingMessage(true);

      // Create payload with socketId for exclusion
      // Allow empty content if there's an attachment
      const payload = {
        conversationId: id,
        content: messageContent || '', // Empty string is allowed if metadata exists
        senderId: adminId,
        senderType: 'agent',
        senderName: adminName,
        socketId: socket.id, // CRITICAL: Include socket ID for exclusion
        metadata: attachmentMetadata || undefined,
        replyToId: replyToId || undefined,
        replyTo: replyToObject || undefined // Include full replyTo object for immediate broadcast
      };

      console.log('📤 Agent: Sending message via Socket.IO:', payload);
      socket.emit('send_message', payload);

      // Wait for confirmation (optional - for error handling)
      const confirmationTimeout = setTimeout(() => {
        console.warn('⚠️ Agent: No confirmation received, message may have failed');
      }, 5000);

      socket.once('message_sent', (data) => {
        clearTimeout(confirmationTimeout);
        if (data.success) {
          console.log('✅ Agent: Message confirmed:', data.id);
          // Replace optimistic message with real one
          setMessages(prev => prev.map(m =>
            m.id === optimisticMessage.id
              ? { ...m, id: data.id, status: 'sent' }
              : m
          ));
          showNotification('success', 'Message sent successfully');
        }
      });

      // Update ticket's lastMessageAt optimistically
      setTicket(prev => prev ? {
        ...prev,
        lastMessageAt: new Date().toISOString()
      } : prev);

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      showNotification('error', 'Failed to send message');
      // Restore form state
      setNewMessage(messageContent);
      if (replyToId) {
        setReplyingTo(messages.find(m => m.id === replyToId));
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/agent/tickets/${id}/notes`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setNotes(data.notes || []);
        }
      }
    } catch (error) {
      console.warn('Error fetching notes:', error);
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || creatingNote) return;
    try {
      setCreatingNote(true);
      const response = await fetch(`/api/agent/tickets/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim(), isPrivate: true })
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setNewNote('');
          setNotes((prev) => [data.note, ...prev]);
          showNotification('success', 'Note added successfully');
        }
      } else {
        try {
          const errorData = await response.json();
          showNotification('error', errorData.message || 'Failed to create note');
        } catch (e) {
          showNotification('error', 'Failed to create note');
        }
      }
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setCreatingNote(false);
    }
  };

  const handleTogglePin = async (noteId, current) => {
    try {
      const response = await fetch(`/api/agent/tickets/${id}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !current })
      });
      if (response.ok) {
        showNotification('success', current ? 'Note unpinned' : 'Note pinned');
        fetchNotes();
      } else {
        showNotification('error', 'Failed to update note');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      showNotification('error', 'Failed to update note');
    }
  };

  const handleTogglePrivacy = async (noteId, current) => {
    try {
      const response = await fetch(`/api/agent/tickets/${id}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: !current })
      });
      if (response.ok) {
        showNotification('success', current ? 'Note made public' : 'Note made private');
        fetchNotes();
      } else {
        showNotification('error', 'Failed to update note');
      }
    } catch (error) {
      console.error('Error toggling privacy:', error);
      showNotification('error', 'Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/agent/tickets/${id}/notes/${noteId}`, { method: 'DELETE' });
      if (response.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (editingNoteId === noteId) {
          setEditingNoteId(null);
          setEditNoteContent('');
        }
        showNotification('success', 'Note deleted successfully');
      } else {
        showNotification('error', 'Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showNotification('error', 'Failed to delete note');
    }
  };

  const handleStartEditNote = (note) => {
    // Safety check: Only allow editing own notes
    if (note.createdById !== user?.id) {
      showNotification('error', 'You can only edit your own notes');
      return;
    }
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteContent('');
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteId || !editNoteContent.trim()) return;
    try {
      const response = await fetch(`/api/agent/tickets/${id}/notes/${editingNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editNoteContent.trim() })
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const updated = await response.json();
          setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? { ...n, content: updated.note.content, updatedAt: updated.note.updatedAt } : n)));
          setEditingNoteId(null);
          setEditNoteContent('');
          showNotification('success', 'Note updated successfully');
        }
      } else {
        try {
          const errorData = await response.json();
          showNotification('error', errorData.message || 'Failed to update note');
        } catch (e) {
          showNotification('error', 'Failed to update note');
        }
      }
    } catch (error) {
      console.error('Error saving note edit:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agent/agents');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      }
    } catch (error) {
      console.warn('Error fetching agents:', error);
    }
  };

  const fetchMentionableUsers = async () => {
    try {
      // Fetch agents
      const agentsResponse = await fetch('/api/agent/agents');
      let agentsList = [];
      if (agentsResponse.ok) {
        const contentType = agentsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const agentsData = await agentsResponse.json();
          agentsList = (agentsData.agents || []).map(agent => ({
            id: agent.id,
            name: agent.name,
            email: agent.email,
            type: 'agent',
            avatar: null
          }));
        }
      }

      // For now, add current agent (you can expand this to fetch all admins if needed)
      // Try to get current agent from profile
      try {
        const profileResponse = await fetch('/api/agent/profile');
        if (profileResponse.ok) {
          const contentType = profileResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const profileData = await profileResponse.json();
            if (profileData?.data) {
              const agentList = [{
                id: profileData.data.id || 'agent',
                name: profileData.data.name || 'Agent',
                email: profileData.data.email || null,
                type: 'agent',
                avatar: profileData.data.avatarUrl || null
              }];
              setMentionableUsers([...agentList, ...agentsList]);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching agent profile:', err);
      }

      // Fallback: just use agents
      setMentionableUsers(agentsList);
    } catch (error) {
      console.error('Error fetching mentionable users:', error);
      setMentionableUsers([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/agent/departments');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setDepartments(data.departments || []);
        }
      }
    } catch (error) {
      console.warn('Error fetching departments:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(`/api/agent/tickets/${id}/tags`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setTicketTags(data.tags || []);
        }
      }
    } catch (error) {
      console.warn('Error fetching ticket tags:', error);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch('/api/agent/tags');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      }
    } catch (error) {
      console.warn('Error fetching available tags:', error);
    }
  };

  const handleAddTag = async (tagId) => {
    try {
      setAddingTag(true);
      const response = await fetch(`/api/agent/tickets/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          // Ensure the tag includes conversationTagId and status
          const newTag = {
            ...data.tag,
            conversationTagId: data.tag.conversationTagId,
            status: data.tag.status || null
          };
          setTicketTags([...ticketTags, newTag]);
          setShowTagModal(false);
          showNotification('success', 'Tag added successfully');
          await fetchTicketDetails(); // Refresh to update activity
          await fetchActivities(); // Refresh activities
          fetchTags(); // Refresh tags to ensure state is in sync
        }
      } else {
        try {
          const error = await response.json();
          showNotification('error', error.message || 'Failed to add tag');
        } catch (e) {
          showNotification('error', 'Failed to add tag');
        }
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      showNotification('error', 'Failed to add tag');
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      const response = await fetch(`/api/agent/tickets/${id}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId })
      });

      if (response.ok) {
        setTicketTags(ticketTags.filter(t => t.id !== tagId));
        showNotification('success', 'Tag removed successfully');
        await fetchTicketDetails(); // Refresh to update activity
        await fetchActivities(); // Refresh activities
      } else {
        try {
          const error = await response.json();
          showNotification('error', error.message || 'Failed to remove tag');
        } catch (e) {
          showNotification('error', 'Failed to remove tag');
        }
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      showNotification('error', 'Failed to remove tag');
    }
  };

  const toggleVideoCallStatus = async (conversationTagId, currentStatus) => {
    if (!conversationTagId) {
      console.error('No conversationTagId provided');
      showNotification('error', 'Cannot toggle Video Call Tag: Missing tag ID');
      return;
    }

    try {
      // If status is null/undefined, default to 'pending', then toggle to 'done'
      const current = currentStatus || 'pending';
      const newStatus = current === 'done' ? 'pending' : 'done';

      console.log('Toggling Video Call Tag:', { conversationTagId, currentStatus, current, newStatus });

      const response = await fetch(`/api/agent/tickets/${id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationTagId, status: newStatus })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Toggle API response:', { ok: response.ok, status: response.status, data });
          // Update the tag in the state
          setTicketTags(ticketTags.map(tag =>
            tag.conversationTagId === conversationTagId
              ? { ...tag, status: newStatus }
              : tag
          ));
          showNotification('success', `Video Call Tag marked as ${newStatus === 'done' ? 'done' : 'pending'}`);
          // Refresh tags to ensure state is in sync
          await fetchTags();
        }
      } else {
        try {
          const errorData = await response.json();
          console.error('Toggle failed:', errorData);
          showNotification('error', errorData.message || 'Failed to update Video Call Tag status');
        } catch (e) {
          showNotification('error', 'Failed to update Video Call Tag status');
        }
      }
    } catch (error) {
      console.error('Error toggling video call status:', error);
      showNotification('error', 'Failed to update Video Call Tag status');
    }
  };

  const formatActivityMessage = (activity) => {
    switch (activity.activityType) {
      case 'status_changed':
        return {
          message: `Status changed from ${activity.oldValue || 'N/A'} to ${activity.newValue}`,
          icon: Ticket,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
      case 'priority_changed':
        return {
          message: `Priority changed from ${activity.oldValue || 'N/A'} to ${activity.newValue}`,
          reason: activity.reason || null,
          icon: ArrowUp,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800'
        };
      case 'assigned':
        return {
          message: `Assigned to ${activity.newValue || 'agent'}`,
          icon: UserIcon,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      case 'unassigned':
        return {
          message: 'Unassigned from agent',
          icon: UserIcon,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        };
      case 'subject_updated':
        return {
          message: 'Subject updated',
          icon: FileText,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800'
        };
      case 'category_updated':
        return {
          message: `Category changed to ${activity.newValue || 'N/A'}`,
          icon: Hash,
          color: 'text-indigo-600 dark:text-indigo-400',
          bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
          borderColor: 'border-indigo-200 dark:border-indigo-800'
        };
      case 'department_routed':
        return {
          message: activity.newValue
            ? `Routed to ${activity.newValue}${activity.oldValue ? ` (from ${activity.oldValue})` : ''}`
            : activity.oldValue
              ? `Unrouted from ${activity.oldValue}`
              : 'Department routing updated',
          icon: Building2,
          color: 'text-violet-600 dark:text-violet-400',
          bgColor: 'bg-violet-50 dark:bg-violet-900/20',
          borderColor: 'border-violet-200 dark:border-violet-800'
        };
      case 'product_updated':
        return {
          message: 'Product model updated',
          icon: Package,
          color: 'text-cyan-600 dark:text-cyan-400',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
          borderColor: 'border-cyan-200 dark:border-cyan-800'
        };
      case 'tag_added':
        return {
          message: `Tag "${activity.newValue || 'tag'}" added`,
          icon: TagIcon,
          color: 'text-violet-600 dark:text-violet-400',
          bgColor: 'bg-violet-50 dark:bg-violet-900/20',
          borderColor: 'border-violet-200 dark:border-violet-800'
        };
      case 'tag_removed':
        return {
          message: `Tag "${activity.oldValue || 'tag'}" removed`,
          icon: TagIcon,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      default:
        return {
          message: 'Ticket updated',
          icon: Clock,
          color: 'text-slate-600 dark:text-slate-400',
          bgColor: 'bg-slate-50 dark:bg-slate-900/20',
          borderColor: 'border-slate-200 dark:border-slate-800'
        };
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return then.toLocaleDateString();
  };

  // Format message time in IST (exact timestamp)
  const formatMessageTime = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(dateObj);
  };

  // Format date divider (Today, Yesterday, or date)
  const formatDateDivider = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = dateObj.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      }).format(dateObj);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 3000);
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      
      // Auto-stop timer if resolving or closing (before status update)
      if ((newStatus === 'resolved' || newStatus === 'closed') && timerData.activeLog) {
        const stopReason = newStatus === 'resolved' ? 'Ticket Resolved' : 'Ticket Closed';
        // Stop timer automatically with reason, skip modal
        await handleStopConfirm(null, stopReason, true);
      }
      
      const response = await fetch(`/api/agent/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showNotification('success', `Ticket marked as ${newStatus}`);
        await fetchTicketDetails();
        await fetchActivities();
        // Refresh timer after status update to sync with server
        if (newStatus === 'resolved' || newStatus === 'closed') {
          await refreshTimer();
        }
      } else {
        try {
          const errorData = await response.json();
          showNotification('error', errorData.message || 'Failed to update status');
        } catch (e) {
          showNotification('error', 'Failed to update status');
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('error', 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = (newPriority) => {
    if (newPriority === ticket?.priority) return;
    setPendingPriority(newPriority);
    setPriorityReason('');
    setShowPriorityReasonModal(true);
  };

  const handlePriorityUpdate = async () => {
    if (!pendingPriority) return;

    try {
      setUpdatingPriority(true);
      const response = await fetch(`/api/agent/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority: pendingPriority,
          priorityReason: priorityReason.trim() || null
        }),
      });

      if (response.ok) {
        showNotification('success', `Priority updated to ${pendingPriority}`);
        setShowPriorityReasonModal(false);
        setPendingPriority(null);
        setPriorityReason('');
        await fetchTicketDetails();
        await fetchActivities();
      } else {
        try {
          const errorData = await response.json();
          showNotification('error', errorData.message || 'Failed to update priority');
        } catch (e) {
          showNotification('error', 'Failed to update priority');
        }
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      showNotification('error', 'Failed to update priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleRouteDepartment = async (departmentId = null) => {
    if (!id) return;

    try {
      setRoutingDepartment(true);
      const response = await fetch(`/api/agent/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: departmentId || null })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setTicket(data.ticket);
          const dept = departments.find(d => d.id === departmentId);
          showNotification('success', departmentId ? `Ticket routed to ${dept?.name || 'department'}` : 'Ticket unrouted from department');
          await fetchTicketDetails();
          await fetchActivities();
        }
      } else {
        try {
          const error = await response.json();
          showNotification('error', error.message || 'Failed to route ticket');
        } catch (e) {
          showNotification('error', 'Failed to route ticket');
        }
      }
    } catch (error) {
      console.error('Error routing department:', error);
      showNotification('error', 'Failed to route ticket');
    } finally {
      setRoutingDepartment(false);
    }
  };

  const handleAssignAgent = async (agentId = null) => {
    if (!id) return;

    try {
      setAssigningAgent(true);
      const assigneeId = agentId === 'unassigned' || agentId === null ? null : agentId;
      const response = await fetch(`/api/agent/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigneeId }),
      });

      if (response.ok) {
        const agent = agents.find(a => a.id === agentId);
        showNotification('success', assigneeId ? `Ticket assigned to ${agent?.name || 'agent'}` : 'Ticket unassigned');
        await fetchTicketDetails();
        await fetchActivities();
      } else {
        try {
          const errorData = await response.json();
          showNotification('error', errorData.message || 'Failed to assign agent');
        } catch (e) {
          showNotification('error', 'Failed to assign agent');
        }
      }
    } catch (error) {
      console.error('Error assigning agent:', error);
      showNotification('error', 'Failed to assign agent');
    } finally {
      setAssigningAgent(false);
    }
  };

  const handleEditTicket = async () => {
    try {
      setSavingTicket(true);
      const response = await fetch(`/api/agent/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editTicketData),
      });

      if (response.ok) {
        showNotification('success', 'Ticket updated successfully');
        setEditingTicket(false);
        await fetchTicketDetails();
        await fetchActivities();
      } else {
        try {
          const errorData = await response.json();
          showNotification('error', errorData.message || 'Failed to update ticket');
        } catch (e) {
          showNotification('error', 'Failed to update ticket');
        }
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      showNotification('error', 'Failed to update ticket');
    } finally {
      setSavingTicket(false);
    }
  };

  const handleSaveCreationDetails = async () => {
    if (!id) return;

    try {
      setSavingCreationDetails(true);
      const response = await fetch(`/api/agent/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(creationDetailsData),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setTicket(data.ticket);
          setCreationDetailsEdited(true);
          setEditingCreationDetails(false);
          showNotification('success', 'Ticket creation details updated successfully');
          await fetchTicketDetails();
          await fetchActivities();
        }
      } else {
        try {
          const errorData = await response.json();
          showNotification('error', errorData.message || 'Failed to update creation details');
        } catch (e) {
          showNotification('error', 'Failed to update creation details');
        }
      }
    } catch (error) {
      console.error('Error updating creation details:', error);
      showNotification('error', 'Failed to update creation details');
    } finally {
      setSavingCreationDetails(false);
    }
  };

  const handleCancelEditCreationDetails = () => {
    // Reset to original ticket values
    if (ticket) {
      setCreationDetailsData({
        customerEmail: ticket.customerEmail || '',
        customerPhone: ticket.customerPhone || '',
        customerAltPhone: ticket.customerAltPhone || '',
        customerAddress: ticket.customerAddress || '',
        orderNumber: ticket.orderNumber || '',
        purchasedFrom: ticket.purchasedFrom || '',
        ticketBody: ticket.ticketBody || '',
        invoiceUrl: ticket.invoiceUrl || '',
        issueVideoLink: ticket.issueVideoLink || '',
        issueType: ticket.issueType || ''
      });
    }
    setEditingCreationDetails(false);
  };

  const handleViewFullProfile = () => {
    const customerId = ticket.customer?.id || ticket.customerId;
    if (customerId) {
      router.push(`/agent/customers/${customerId}`);
    } else {
      showNotification('error', 'Customer profile not available');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
      closed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
      pending: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      resolved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
      medium: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700',
      low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
    };
    return colors[priority] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AgentLayout currentPage="Ticket Details" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          <div className="max-w-none mx-auto space-y-6">
            <div className="animate-pulse">
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl w-3/4 mb-6"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                  <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                  <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AgentLayout>
    );
  }

  if (!ticket) {
    return (
      <AgentLayout currentPage="Ticket Details" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ticket Not Found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">The ticket you are looking for does not exist or has been deleted.</p>
            <Button
              onClick={() => router.push('/agent/tickets')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg"
            >
              Back to Tickets
            </Button>
          </div>
        </div>
      </AgentLayout>
    );
  }

  // Filter accessories based on selected product in edit mode
  const filteredAccessories = editTicketData.productId
    ? accessories.filter(acc => acc.productId === editTicketData.productId)
    : [];

  return (
    <>
      <PageHead title={ticket.subject || 'Ticket Details'} description={`Details for ticket ${ticket.ticketNumber}`} />

      <AgentLayout currentPage="Ticket Details" fullWidth={true}>
        {/* Notification Toast */}
        <NotificationToast
          notification={notification}
          onClose={() => setNotification({ type: null, message: '' })}
        />

        {/* Add Tag Modal */}
        {showTagModal && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTagModal(false);
              }
            }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                      <TagIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Add Tag
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        Select a tag to add to this ticket
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTagModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <XIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {availableTags.length === 0 ? (
                  <div className="text-center py-12">
                    <TagIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">
                      No tags available. Please seed tags first.
                    </p>
                  </div>
                ) : availableTags.filter(tag => !ticketTags.some(t => t.id === tag.id)).length === 0 ? (
                  <div className="text-center py-12">
                    <TagIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">
                      All available tags have been added to this ticket.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableTags
                      .filter(tag => !ticketTags.some(t => t.id === tag.id))
                      .map((tag) => {
                        // Conditional color for Video Call Tag: red if pending, green if done
                        let tagColor = tag.color;
                        if (tag.name === 'Video Call Tag') {
                          // Default to pending (red) when adding new tag
                          tagColor = '#ef4444';
                        }
                        return (
                          <button
                            key={tag.id}
                            onClick={() => handleAddTag(tag.id)}
                            disabled={addingTag}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: tagColor }}
                          >
                            <TagIcon className="w-4 h-4" />
                            <span>{tag.name}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowTagModal(false)}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          <div className="max-w-none mx-auto space-y-6">
            {/* Enhanced Hero Header */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-700 dark:via-purple-700 dark:to-indigo-700"></div>
              <div className="absolute inset-0 bg-black/10 dark:bg-black/30"></div>
              <div className="relative p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                        <Ticket className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{ticket.subject}</h1>
                        <div className="flex items-center space-x-4 text-violet-100">
                          <span className="flex items-center space-x-2">
                            <Hash className="w-4 h-4" />
                            <span>#{ticket.ticketNumber}</span>
                          </span>
                          <span className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>Created {formatDate(ticket.createdAt)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 flex-wrap gap-3">
                      <Badge className={`${getStatusColor(ticket.status)} border font-semibold text-sm px-4 py-2 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl ${ticket.status === 'open'
                        ? 'hover:bg-yellow-600 hover:text-yellow-50 dark:hover:bg-yellow-700 dark:hover:text-yellow-100' :
                        ticket.status === 'closed'
                          ? 'hover:bg-green-600 hover:text-green-50 dark:hover:bg-green-700 dark:hover:text-green-100' :
                          ticket.status === 'pending'
                            ? 'hover:bg-blue-600 hover:text-blue-50 dark:hover:bg-blue-700 dark:hover:text-blue-100' :
                            ticket.status === 'resolved'
                              ? 'hover:bg-emerald-600 hover:text-emerald-50 dark:hover:bg-emerald-700 dark:hover:text-emerald-100' :
                              'hover:bg-gray-600 hover:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                        }`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </Badge>
                      {ticket.priority && ticket.priority !== 'low' && (
                        <Badge className={`${getPriorityColor(ticket.priority)} border font-semibold text-sm px-4 py-2 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl ${ticket.priority === 'high'
                          ? 'hover:bg-red-600 hover:text-red-50 dark:hover:bg-red-700 dark:hover:text-red-100' :
                          ticket.priority === 'medium'
                            ? 'hover:bg-orange-600 hover:text-orange-50 dark:hover:bg-orange-700 dark:hover:text-orange-100' :
                            ticket.priority === 'low'
                              ? 'hover:bg-green-600 hover:text-green-50 dark:hover:bg-green-700 dark:hover:text-green-100' :
                              'hover:bg-gray-600 hover:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                          }`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                        </Badge>
                      )}
                      <div className="flex items-center space-x-2 text-violet-100 dark:text-violet-200 bg-white/10 dark:bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                        <div className="w-2 h-2 bg-green-400 dark:bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Last updated {formatTimeAgo(ticket.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Customer Tickets Navigation */}
                    {customerTickets.length > 1 && (
                      <div className="flex items-center space-x-2 bg-white/90 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-white/30 dark:border-white/20 shadow-lg">
                        <button
                          onClick={() => navigateToTicket('prev')}
                          disabled={loadingCustomerTickets}
                          className="p-2 hover:bg-white/20 dark:hover:bg-white/20 rounded-l-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous ticket"
                        >
                          <ChevronDown className="w-5 h-5 text-slate-800 dark:text-white rotate-90" />
                        </button>
                        <div className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border-x border-white/20 dark:border-white/10">
                          {currentTicketIndex + 1} / {customerTickets.length}
                        </div>
                        <button
                          onClick={() => navigateToTicket('next')}
                          disabled={loadingCustomerTickets}
                          className="p-2 hover:bg-white/20 dark:hover:bg-white/20 rounded-r-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next ticket"
                        >
                          <ChevronDown className="w-5 h-5 text-slate-800 dark:text-white -rotate-90" />
                        </button>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => router.push('/agent/tickets')}
                      className="border-white/30 dark:border-white/20 bg-white/90 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white backdrop-blur-sm px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to List
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Mode Banner */}
            {isReadOnly && ticket.assignee && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-2xl shadow-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                    <EyeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                      👁️ View Only: You are viewing {ticket.assignee.name}'s ticket
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      You can view the full conversation history and all ticket details, but you cannot send messages, change the status, priority, assignee, or edit ticket details.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Claimable Banner */}
            {ticket.isClaimable && !ticket.assigneeId && (
              <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl shadow-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                        🚫 The previous owner is on leave. This ticket is available to claim.
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {ticket.previousOwner?.name 
                          ? `This ticket was previously assigned to ${ticket.previousOwner.name} who is currently on leave.`
                          : 'This ticket is available for claiming.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        setNotification({ type: 'info', message: 'Claiming ticket...' });
                        const res = await agentFetch(`/api/agent/tickets/${ticket.ticketNumber}/claim`, {
                          method: 'POST',
                        });
                        if (res.ok) {
                          setNotification({ type: 'success', message: 'Ticket claimed successfully!' });
                          // Refresh ticket data
                          await fetchTicketDetails();
                          // Refresh global data
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('refreshGlobalData'));
                          }
                        } else {
                          const error = await res.json();
                          setNotification({ type: 'error', message: error.error || 'Failed to claim ticket' });
                        }
                      } catch (err) {
                        console.error('Error claiming ticket:', err);
                        setNotification({ type: 'error', message: 'Failed to claim ticket' });
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <HandHeart className="w-4 h-4 mr-2" />
                    Claim Ticket
                  </Button>
                </div>
              </div>
            )}

            <div className={`grid grid-cols-1 xl:grid-cols-4 gap-4 xl:gap-6 ${activeTab === 'details' ? '' : ''}`}>
              {/* Main Content Area */}
              <div className="xl:col-span-3 space-y-6">
                {/* Tab Navigation */}
                <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${activeTab === 'conversation' || activeTab === 'details' ? 'sticky top-6 z-10' : ''}`}>
                  <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setActiveTab('conversation')}
                      className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${activeTab === 'conversation'
                        ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Conversation</span>
                        <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs px-2 py-1 rounded-full font-semibold">
                          {messages.length}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${activeTab === 'details'
                        ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Details</span>
                      </div>
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className={`${activeTab === 'conversation' ? `p-6 h-[calc(100vh-180px)] flex flex-col transition-all duration-300` : activeTab === 'details' ? 'p-6' : 'p-6'}`}>
                    {activeTab === 'conversation' && (
                        <div className="flex flex-col h-full space-y-6 overflow-visible">
                          {/* Messages */}
                          <div ref={conversationScrollRef} className="flex-1 space-y-4 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {messages.map((message, index) => {
                            // Determine if message is from admin, agent, or customer
                            // CRITICAL: Ensure all message types are handled, including customer
                            const isAdmin = message.senderType === 'admin';
                            const isAgent = message.senderType === 'agent';
                            const isCustomer = message.senderType === 'customer';
                            const isAdminOrAgent = isAdmin || isAgent;
                            
                            // Debug: Log customer messages to verify they're being processed
                            if (isCustomer && index === 0) {
                              console.log('[Message Render] First customer message detected:', {
                                id: message.id,
                                senderType: message.senderType,
                                senderName: message.senderName,
                                content: message.content?.substring(0, 50)
                              });
                            }

                            // Check if message is from current user
                            const isCurrentUser = user && (
                              (isAgent && message.senderId === user.id) ||
                              (isAdmin && message.senderId === user.id)
                            );

                            // Get sender name for display - extract first name for admin/agent
                            const getSenderName = () => {
                              if (isCurrentUser) {
                                return 'You';
                              }
                              if (isAdmin) {
                                const fullName = message.senderName || '';
                                if (fullName) {
                                  const firstName = fullName.trim().split(' ')[0];
                                  return firstName || fullName;
                                }
                                return 'Admin';
                              }
                              if (isAgent) {
                                const fullName = message.senderName || '';
                                if (fullName) {
                                  const firstName = fullName.trim().split(' ')[0];
                                  return firstName || fullName;
                                }
                                return 'Agent';
                              }
                              if (isCustomer) {
                                return message.senderName || ticket.customer?.name || 'Customer';
                              }
                              return 'Unknown';
                            };

                            const senderName = getSenderName();

                            // Handle replyTo - can be an object or an ID
                            const repliedToMessage = message.replyTo
                              ? (typeof message.replyTo === 'object'
                                ? message.replyTo
                                : messages.find(m => m.id === message.replyTo))
                              : null;
                            const prevMessage = index > 0 ? messages[index - 1] : null;

                            // Show date divider if date changed
                            const showDateDivider = !prevMessage ||
                              new Date(message.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();

                            // Show sender name if different from previous message or if date changed
                            const showSenderName = !prevMessage ||
                              prevMessage.senderId !== message.senderId ||
                              prevMessage.senderType !== message.senderType ||
                              showDateDivider;

                            // Check if this is a KB article - render as standalone card
                            const isKBArticle = message.metadata?.type === 'kb_article';
                            
                            return (
                              <React.Fragment key={message.id}>
                                {showDateDivider && (
                                  <div className="flex justify-center my-3 w-full">
                                    <span className="text-xs text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-full shadow-sm">
                                      {formatDateDivider(message.createdAt)}
                                    </span>
                                  </div>
                                )}
                                
                                {/* KB Article - Standalone Card */}
                                {isKBArticle ? (
                                  <div className={`flex flex-col mb-3 ${isAdminOrAgent ? 'items-end' : 'items-start'}`}>
                                    <div className="w-full sm:w-auto sm:max-w-md md:max-w-lg lg:max-w-xl">
                                      <KBArticleCard
                                        title={message.metadata.title}
                                        excerpt={message.metadata.excerpt}
                                        slug={message.metadata.slug}
                                        articleId={message.metadata.articleId}
                                        category={message.metadata.category}
                                        article={message.metadata}
                                        onClick={(article) => setViewingArticle(article)}
                                      />
                                    </div>
                                    <div className={`flex ${isAdminOrAgent ? 'justify-end' : 'justify-start'} mt-1 px-2`}>
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {formatMessageTime(message.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  /* Regular Message Bubble */
                                  <div className={`flex flex-col ${isAdminOrAgent ? 'items-end' : 'items-start'} mb-0.5 group`}>
                                    {/* Sender Name Label */}
                                    {showSenderName && (
                                      <div className={`mb-1 px-2 ${isAdminOrAgent ? 'pr-4' : 'pl-4'}`}>
                                        <span className={`text-xs font-semibold ${isAdmin
                                          ? 'text-violet-600 dark:text-violet-400'
                                          : isAgent
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : isCustomer
                                              ? 'text-slate-700 dark:text-slate-300'
                                              : 'text-slate-600 dark:text-slate-400'
                                          }`}>
                                          {senderName}
                                        </span>
                                      </div>
                                    )}
                                    <div className={`flex ${isAdminOrAgent ? 'justify-end' : 'justify-start'} w-full`}>
                                      <div className={`flex items-end gap-1 max-w-[85%] sm:max-w-[75%] ${isAdminOrAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* WhatsApp-style message bubble */}
                                        <div
                                          className={`relative px-2.5 py-1.5 sm:px-3 sm:py-2 ${
                                            isAdminOrAgent
                                              ? 'bg-[#DCF8C6] dark:bg-[#005C4B] text-gray-900 dark:text-white'
                                              : isCustomer
                                                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] dark:shadow-[0_1px_0.5px_rgba(255,255,255,0.1)] border border-gray-200 dark:border-slate-600'
                                                : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] dark:shadow-[0_1px_0.5px_rgba(255,255,255,0.1)] border border-gray-200 dark:border-slate-600'
                                          }`}
                                          style={{
                                            borderRadius: isAdminOrAgent
                                              ? '7.5px 7.5px 1.5px 7.5px'
                                              : '7.5px 7.5px 7.5px 1.5px'
                                          }}
                                        >
                                          {/* Reply preview if message is a reply */}
                                          {repliedToMessage && (
                                            <div
                                              className={`mb-2 p-2 rounded border-l-4 ${isAdminOrAgent
                                                ? 'bg-white/30 dark:bg-white/10 border-white/50'
                                                : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600'
                                                }`}
                                            >
                                              <div className="text-xs font-semibold opacity-80 mb-1">
                                                {(() => {
                                                  const repliedIsAdmin = repliedToMessage.senderType === 'admin';
                                                  const repliedIsAgent = repliedToMessage.senderType === 'agent';
                                                  const repliedIsCustomer = repliedToMessage.senderType === 'customer';
                                                  const repliedIsCurrentUser = user && (
                                                    (repliedIsAgent && repliedToMessage.senderId === user.id) ||
                                                    (repliedIsAdmin && repliedToMessage.senderId === user.id)
                                                  );

                                                  if (repliedIsCurrentUser) {
                                                    return 'You';
                                                  }
                                                  if (repliedIsAdmin || repliedIsAgent) {
                                                    const fullName = repliedToMessage.senderName || '';
                                                    if (fullName) {
                                                      const firstName = fullName.trim().split(' ')[0];
                                                      return firstName || fullName;
                                                    }
                                                    return repliedIsAdmin ? 'Admin' : 'Agent';
                                                  }
                                                  if (repliedIsCustomer) {
                                                    return repliedToMessage.senderName || ticket.customer?.name || 'Customer';
                                                  }
                                                  return 'Unknown';
                                                })()}
                                              </div>
                                              <div className="text-xs opacity-70 line-clamp-2">
                                                {repliedToMessage.content || 'Message'}
                                              </div>
                                            </div>
                                          )}

                                          {/* Attachment Preview */}
                                          {message.metadata && message.metadata.type && (
                                            <div className="mb-2">
                                              {message.metadata.type === 'image' && (
                                                <img
                                                  src={message.metadata.url}
                                                  alt={message.metadata.fileName || 'Image'}
                                                  className="max-w-full max-h-64 sm:max-h-80 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                  onClick={() => window.open(message.metadata.url, '_blank')}
                                                />
                                              )}
                                              {message.metadata.type === 'video' && (
                                                <video
                                                  src={message.metadata.url}
                                                  controls
                                                  className="max-w-full max-h-64 sm:max-h-80 rounded-lg"
                                                  preload="metadata"
                                                >
                                                  Your browser does not support the video tag.
                                                </video>
                                              )}
                                              {message.metadata.type === 'file' && (
                                                <a
                                                  href={message.metadata.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 p-2.5 bg-white/20 dark:bg-white/10 rounded hover:bg-white/30 transition-colors"
                                                >
                                                  <File className="w-5 h-5 flex-shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium truncate">{message.metadata.fileName || 'File'}</div>
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Click to download</div>
                                                  </div>
                                                </a>
                                              )}
                                            </div>
                                          )}

                                          {/* Message content */}
                                          {message.content && (
                                            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed break-words">
                                              {formatMessageContent(message.content)}
                                            </p>
                                          )}

                                          {/* Timestamp - WhatsApp style (bottom right, small) */}
                                          <div className="flex items-center justify-end gap-1 mt-1">
                                            <span className={`text-[11px] leading-none ${isAdminOrAgent
                                              ? 'text-gray-700 dark:text-gray-300'
                                              : 'text-gray-600 dark:text-gray-400'
                                              }`}>
                                              {formatMessageTime(message.createdAt)}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Reply button (on hover) - Only show on desktop */}
                                        {!isKBArticle && (
                                          <button
                                            onClick={() => setReplyingTo(message)}
                                            className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                                            title="Reply"
                                          >
                                            <Reply className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                          
                          {/* Feedback System Message - Show after all messages if feedback exists */}
                          {ticket.feedbacks && ticket.feedbacks.length > 0 && (
                            <FeedbackSystemMessage feedback={ticket.feedbacks[0]} />
                          )}
                        </div>

                        {/* Message Input - Fixed at bottom */}
                        {/* Hide message input in read-only mode (when ticket is assigned to another agent, not unassigned) */}
                        {!isReadOnly && (
                          <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 pt-6 bg-white dark:bg-slate-800 -mx-6 -mb-6 px-6 pb-6">
                            <form onSubmit={handleSendMessage} className="space-y-4">
                            {/* Reply Context */}
                            {replyingTo && (
                              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg overflow-hidden">
                                <div className="flex items-start justify-between p-3 gap-3">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <Reply className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">
                                        Replying to {(() => {
                                          const replyIsAdmin = replyingTo.senderType === 'admin';
                                          const replyIsAgent = replyingTo.senderType === 'agent';
                                          const replyIsCurrentUser = user && (
                                            (replyIsAgent && replyingTo.senderId === user.id) ||
                                            (replyIsAdmin && replyingTo.senderId === user.id)
                                          );

                                          if (replyIsCurrentUser) {
                                            return 'You';
                                          }
                                          if (replyIsAdmin) {
                                            return replyingTo.senderName || 'Admin';
                                          }
                                          if (replyIsAgent) {
                                            return replyingTo.senderName || 'Agent';
                                          }
                                          return replyingTo.senderName || ticket.customer?.name || 'Customer';
                                        })()}
                                      </p>
                                      <div className="max-h-20 overflow-y-auto">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words leading-relaxed">
                                          {replyingTo.content}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                                    title="Cancel reply"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* File Preview (Draft Mode) */}
                            {selectedFile && (
                              <div className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
                                <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                                  {selectedFile.type === 'image' && (
                                    <img
                                      src={selectedFile.previewUrl}
                                      alt={selectedFile.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  {selectedFile.type === 'video' && (
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center">
                                      <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                      </svg>
                                    </div>
                                  )}
                                  {selectedFile.type === 'file' && (
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center">
                                      <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {selectedFile.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {selectedFile.type === 'image' ? 'Image' : selectedFile.type === 'video' ? 'Video' : 'File'}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (selectedFile.previewUrl) {
                                        URL.revokeObjectURL(selectedFile.previewUrl);
                                      }
                                      setSelectedFile(null);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                                    title="Remove file"
                                  >
                                    <XIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Macro Suggestions Dropdown (above input) */}
                            {macroSuggestionsState.show && (
                              <div className="px-3 sm:px-4 pb-2">
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                  {macros
                                    .filter(m =>
                                      m.isActive &&
                                      m.shortcut &&
                                      (!macroSuggestionsState.query ||
                                        m.shortcut.toLowerCase().includes(macroSuggestionsState.query.toLowerCase()) ||
                                        m.name.toLowerCase().includes(macroSuggestionsState.query.toLowerCase()))
                                    )
                                    .map((macro, idx) => {
                                      const filtered = macros.filter(m =>
                                        m.isActive &&
                                        m.shortcut &&
                                        (!macroSuggestionsState.query ||
                                          m.shortcut.toLowerCase().includes(macroSuggestionsState.query.toLowerCase()) ||
                                          m.name.toLowerCase().includes(macroSuggestionsState.query.toLowerCase()))
                                      );
                                      const isSelected = idx === macroSuggestionsState.selectedIndex;

                                      return (
                                        <button
                                          key={macro.id}
                                          type="button"
                                          onClick={() => insertMacro(macro)}
                                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${isSelected ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                                            }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded flex-shrink-0">
                                              <FileCode className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                                  {macro.name}
                                                </span>
                                                {macro.shortcut && (
                                                  <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded">
                                                    /{macro.shortcut}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                                                {macro.content}
                                              </p>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* WhatsApp-style Input Area */}
                            <div className="flex items-end gap-2 px-3 sm:px-4 py-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 relative overflow-visible">
                              {/* File Attachment Button */}
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || sendingMessage || ticket.status === 'closed' || ticket.status === 'resolved'}
                                className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Attach file"
                              >
                                {isUploading ? (
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
                                )}
                              </button>
                              <input
                                ref={fileInputRef}
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file);
                                  }
                                  e.target.value = ''; // Reset input
                                }}
                                className="hidden"
                                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                              />

                              {/* Knowledge Base Button */}
                              <button
                                type="button"
                                onClick={() => setShowKBModal(true)}
                                disabled={sendingMessage || ticket.status === 'closed' || ticket.status === 'resolved'}
                                className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Share Knowledge Base article"
                              >
                                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                              </button>

                              {/* Macros Button */}
                              <div className="relative" ref={macrosButtonRef}>
                                <button
                                  type="button"
                                  onClick={() => setShowMacrosPopup(!showMacrosPopup)}
                                  disabled={sendingMessage || ticket.status === 'closed' || ticket.status === 'resolved'}
                                  className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Macros"
                                >
                                  <FileCode className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>

                                {/* Macros Popup */}
                                {showMacrosPopup && isMounted && createPortal(
                                  <div
                                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                                    onClick={(e) => {
                                      if (e.target === e.currentTarget) {
                                        setShowMacrosPopup(false);
                                        setMacrosSearchQuery('');
                                      }
                                    }}
                                  >
                                    <div
                                      ref={macrosPopupRef}
                                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-[600px] max-h-[80vh] flex flex-col"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Modal Header */}
                                      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                                              <FileCode className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                Macros
                                              </h3>
                                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                                Select a message template to insert
                                              </p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setShowMacrosPopup(false);
                                              setMacrosSearchQuery('');
                                            }}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                          >
                                            <XIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                          </button>
                                        </div>

                                        {/* Search Input */}
                                        <div className="mt-4">
                                          <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                            <Input
                                              type="text"
                                              placeholder="Search macros..."
                                              value={macrosSearchQuery}
                                              onChange={(e) => setMacrosSearchQuery(e.target.value)}
                                              className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                              autoFocus
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Modal Content - Macros List */}
                                      <div className="p-6 overflow-y-auto flex-1">
                                        {macros.filter(m =>
                                          (m.shortcut && m.shortcut.toLowerCase().includes(macrosSearchQuery.toLowerCase())) ||
                                          m.content.toLowerCase().includes(macrosSearchQuery.toLowerCase()) ||
                                          (m.category && m.category.toLowerCase().includes(macrosSearchQuery.toLowerCase()))
                                        ).length === 0 ? (
                                          <div className="text-center py-12">
                                            <FileCode className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-500 dark:text-slate-400">
                                              {macros.length === 0 ? 'No macros available' : 'No macros found'}
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 gap-3">
                                            {macros.filter(m =>
                                              (m.shortcut && m.shortcut.toLowerCase().includes(macrosSearchQuery.toLowerCase())) ||
                                              m.content.toLowerCase().includes(macrosSearchQuery.toLowerCase()) ||
                                              (m.category && m.category.toLowerCase().includes(macrosSearchQuery.toLowerCase()))
                                            ).map((macro) => (
                                              <button
                                                key={macro.id}
                                                onClick={() => handleMacroSelect(macro)}
                                                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all text-left"
                                              >
                                                <div className="flex items-start gap-3">
                                                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex-shrink-0">
                                                    <FileCode className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <h4 className="font-semibold text-slate-900 dark:text-white">
                                                        {macro.shortcut ? `/${macro.shortcut}` : 'Canned Response'}
                                                      </h4>
                                                      {macro.isPublic && (
                                                        <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                                          Public
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                                                      {macro.content}
                                                    </p>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                      {macro.category && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                          <Tag className="w-3 h-3" />
                                                          <span>{macro.category}</span>
                                                        </div>
                                                      )}
                                                      {macro.shortcut && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                          <Keyboard className="w-3 h-3" />
                                                          <span className="font-mono">/{macro.shortcut}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Modal Footer */}
                                      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                        <Link href="/agent/canned-responses">
                                          <button
                                            onClick={() => setShowMacrosPopup(false)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                          >
                                            <FileCode className="w-4 h-4" />
                                            Manage Canned Responses
                                            <ArrowRight className="w-4 h-4" />
                                          </button>
                                        </Link>
                                      </div>
                                    </div>
                                  </div>,
                                  document.body
                                )}
                              </div>

                              {/* Emoji Picker */}
                              <div className="relative">
                                <EmojiPicker onEmojiSelect={(emoji) => insertEmoji(emoji)} />
                              </div>

                              {/* Text Input - WhatsApp Style */}
                              <div className="flex-1 relative">
                                <textarea
                                  ref={messageTextareaRef}
                                  id="normal-textarea"
                                  placeholder="Type a message (use /shortcut for macros)"
                                  value={newMessage}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setNewMessage(value);
                                    handleMentionInput(value, setNewMessage, messageTextareaRef);

                                    // Auto-resize textarea for multiline messages
                                    e.target.style.height = 'auto';
                                    const newHeight = Math.min(e.target.scrollHeight, 200); // Increased max height to 200px
                                    e.target.style.height = `${newHeight}px`;
                                  }}
                                  onKeyDown={(e) => {
                                    // Handle macro suggestions navigation first
                                    handleMentionKeyDown(e);

                                    // Handle macro shortcuts (e.g., "/greet" + Space or Tab) - only if suggestions are not showing
                                    if (!macroSuggestionsState.show && (e.key === ' ' || e.key === 'Tab')) {
                                      const value = newMessage;
                                      const words = value.split(/\s+/);
                                      const lastWord = words[words.length - 1] || '';

                                      if (lastWord.startsWith('/') && lastWord.length > 1) {
                                        const shortcut = lastWord.substring(1);
                                        const matchingMacro = macros.find(m =>
                                          m.shortcut &&
                                          m.shortcut.toLowerCase() === shortcut.toLowerCase() &&
                                          m.isActive
                                        );

                                        if (matchingMacro) {
                                          e.preventDefault();
                                          // Replace the shortcut with macro content
                                          const beforeShortcut = value.substring(0, value.lastIndexOf(lastWord));
                                          const newValue = beforeShortcut + matchingMacro.content + (e.key === ' ' ? ' ' : '');
                                          setNewMessage(newValue);
                                          
                                          // Auto-resize for multiline
                                          setTimeout(() => {
                                            if (messageTextareaRef.current) {
                                              messageTextareaRef.current.style.height = 'auto';
                                              const newHeight = Math.min(messageTextareaRef.current.scrollHeight, 200);
                                              messageTextareaRef.current.style.height = `${newHeight}px`;
                                              messageTextareaRef.current.focus();
                                            }
                                          }, 0);
                                          return;
                                        }
                                      }
                                    }
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendMessage(e);
                                    }
                                  }}
                                  rows={1}
                                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-3xl bg-white dark:bg-[#2A3942] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-all text-sm sm:text-base resize-none overflow-y-auto border-0"
                                  disabled={sendingMessage || ticket.status === 'closed' || ticket.status === 'resolved'}
                                  style={{ 
                                    minHeight: '44px',
                                    maxHeight: '200px',
                                    lineHeight: '1.4'
                                  }}
                                />
                                {/* Macro Autocomplete */}
                                <MacroAutocomplete
                                  textareaRef={messageTextareaRef}
                                  value={newMessage}
                                  onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    // Auto-resize for multiline
                                    if (messageTextareaRef.current) {
                                      messageTextareaRef.current.style.height = 'auto';
                                      const newHeight = Math.min(messageTextareaRef.current.scrollHeight, 200);
                                      messageTextareaRef.current.style.height = `${newHeight}px`;
                                    }
                                  }}
                                  isMounted={isMounted}
                                />
                              </div>

                              {/* Send Button - WhatsApp Style */}
                              <button
                                type="submit"
                                disabled={(!newMessage.trim() && !selectedFile) || sendingMessage || ticket.status === 'closed' || ticket.status === 'resolved'}
                                className={`p-2.5 sm:p-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-sm ${(newMessage.trim() || selectedFile) && !sendingMessage
                                  ? 'bg-[#25D366] hover:bg-[#20BA5A] text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                  }`}
                              >
                                {sendingMessage ? (
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <SendIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                )}
                              </button>
                            </div>
                            {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-3 sm:px-4 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                This ticket is {ticket.status}. You cannot send messages.
                              </p>
                            )}
                            </form>
                          </div>
                        )}
                        </div>
                    )}

                    {activeTab === 'details' && (
                      <div className="space-y-6">
                        {/* Ticket Overview Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                          {/* Header */}
                          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-700 dark:via-purple-700 dark:to-indigo-700 px-6 py-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Ticket Overview
                              </h3>
                              <div className="flex items-center gap-3">
                                {/* Presence Avatars */}
                                {ticketViewers.length > 0 && (
                                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                                    <span className="text-xs text-white/90 font-medium whitespace-nowrap">Viewing:</span>
                                    <div className="flex -space-x-2 flex-shrink-0">
                                      {ticketViewers.slice(0, 5).map((viewer, idx) => (
                                        <div
                                          key={`${viewer.userId || 'viewer'}-${idx}`}
                                          className="relative group flex-shrink-0"
                                          title={viewer.userName || 'Viewer'}
                                        >
                                          <Avatar className="w-7 h-7 border-2 border-white/30 ring-2 ring-white/20 flex-shrink-0">
                                            <AvatarImage src={viewer.userAvatar || undefined} alt={viewer.userName || 'Viewer'} />
                                            <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
                                              {(viewer.userName || 'V').charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full z-10"></div>
                                        </div>
                                      ))}
                                      {ticketViewers.length > 5 && (
                                        <div className="w-7 h-7 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                                          +{ticketViewers.length - 5}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-mono text-xs px-3 py-1.5 font-semibold">
                                  #{ticket.ticketNumber || ticket.id}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Status */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Circle className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                                  Status
                                </label>
                                <div className="relative">
                                  <Badge
                                    ref={statusButtonRef}
                                    onClick={(e) => {
                                      // Disable in read-only mode (when assigned to another agent, not unassigned)
                                      if (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) {
                                        return;
                                      }
                                      e.stopPropagation();
                                      if (statusButtonRef.current) {
                                        const rect = statusButtonRef.current.getBoundingClientRect();
                                        setStatusDropdownPosition({
                                          top: rect.bottom + window.scrollY + 4,
                                          left: rect.left + window.scrollX,
                                          width: rect.width
                                        });
                                      }
                                      setShowStatusDropdown(!showStatusDropdown);
                                    }}
                                    className={`${getStatusColor(ticket.status)} border-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 flex w-full justify-center ${
                                      // Disable styling in read-only mode (when assigned to another agent, not unassigned)
                                      (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : `hover:shadow-lg cursor-pointer ${ticket.status === 'open'
                                          ? 'hover:bg-yellow-600 hover:text-yellow-50 dark:hover:bg-yellow-700 dark:hover:text-yellow-100' :
                                          ticket.status === 'closed'
                                            ? 'hover:bg-green-600 hover:text-green-50 dark:hover:bg-green-700 dark:hover:text-green-100' :
                                            ticket.status === 'pending'
                                              ? 'hover:bg-blue-600 hover:text-blue-50 dark:hover:bg-blue-700 dark:hover:text-blue-100' :
                                                ticket.status === 'resolved'
                                                  ? 'hover:bg-emerald-600 hover:text-emerald-50 dark:hover:bg-emerald-700 dark:hover:text-emerald-100' :
                                                  'hover:bg-gray-600 hover:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                                        }`
                                    }`}
                                  >
                                    {updatingStatus ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span>Updating...</span>
                                      </div>
                                    ) : (
                                      ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)
                                    )}
                                  </Badge>
                                </div>
                              </div>

                              {/* Priority */}
                              {!ticketSettings.hidePriorityAgent && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertCircle className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                                    Priority
                                  </label>
                                  <div className="relative">
                                    <Badge
                                      ref={priorityButtonRef}
                                      onClick={(e) => {
                                        // Disable in read-only mode (when assigned to another agent, not unassigned)
                                        if (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) {
                                          return;
                                        }
                                        e.stopPropagation();
                                        if (priorityButtonRef.current) {
                                          const rect = priorityButtonRef.current.getBoundingClientRect();
                                          setPriorityDropdownPosition({
                                            top: rect.bottom + window.scrollY + 4,
                                            left: rect.left + window.scrollX,
                                            width: rect.width
                                          });
                                        }
                                        setShowPriorityDropdown(!showPriorityDropdown);
                                      }}
                                      className={`${getPriorityColor(ticket.priority)} border-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 flex w-full justify-center ${
                                        // Disable styling in read-only mode (when assigned to another agent, not unassigned)
                                        (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id)
                                          ? 'opacity-50 cursor-not-allowed'
                                          : `hover:shadow-lg cursor-pointer ${ticket.priority === 'high'
                                            ? 'hover:bg-red-600 hover:text-red-50 dark:hover:bg-red-700 dark:hover:text-red-100' :
                                            ticket.priority === 'medium'
                                              ? 'hover:bg-orange-600 hover:text-orange-50 dark:hover:bg-orange-700 dark:hover:text-orange-100' :
                                              ticket.priority === 'low'
                                                ? 'hover:bg-green-600 hover:text-green-50 dark:hover:bg-green-700 dark:hover:text-green-100' :
                                                'hover:bg-gray-600 hover:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                                          }`
                                      }`}
                                    >
                                      {updatingPriority ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                          <span>Updating...</span>
                                        </div>
                                      ) : (
                                        `${(ticket.priority || 'low').charAt(0).toUpperCase() + (ticket.priority || 'low').slice(1)} Priority`
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons: Escalate & Reopen - Disabled in read-only mode */}
                              {(() => {
                                // Read-only mode: when assigned to another agent (not unassigned)
                                const isReadOnly = ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id;
                                return (
                                  <div className="col-span-1 md:col-span-2 flex gap-3">
                                    {/* Escalate Button - Show only if status is open or pending */}
                                    {(ticket.status === 'open' || ticket.status === 'pending') && (
                                      <Button
                                        onClick={() => {
                                          if (isReadOnly) return;
                                          setShowEscalateModal(true);
                                        }}
                                        disabled={isReadOnly}
                                        className={`flex-1 font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                          isReadOnly
                                            ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:shadow-xl'
                                        }`}
                                      >
                                        <ArrowUp className="w-4 h-4" />
                                        Escalate Priority
                                      </Button>
                                    )}

                                    {/* Reopen Button - Show only if status is resolved or closed */}
                                    {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                                      <Button
                                        onClick={() => {
                                          if (isReadOnly) return;
                                          setShowReopenModal(true);
                                        }}
                                        disabled={isReadOnly}
                                        className={`flex-1 font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                          isReadOnly
                                            ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white hover:shadow-xl'
                                        }`}
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                        Reopen Ticket
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* SLA Risk Indicator */}
                              {slaRiskStatus && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                                    SLA Status
                                  </label>
                                  <div className="relative">
                                    <Badge
                                      className={`border-2 font-semibold text-sm px-4 py-2.5 rounded-xl flex w-full justify-center items-center gap-2 ${slaRiskStatus === 'breached'
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 animate-pulse' :
                                        slaRiskStatus === 'critical'
                                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800 animate-pulse' :
                                          slaRiskStatus === 'at_risk'
                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800' :
                                            slaRiskStatus === 'paused'
                                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600' :
                                              'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800'
                                        }`}
                                      title={slaTimers.length > 0 ? `${slaTimers.length} active SLA timer(s)` : 'SLA Status'}
                                    >
                                      {slaRiskStatus === 'breached' && (
                                        <>
                                          <AlertTriangle className="w-4 h-4" />
                                          <span>Breached</span>
                                        </>
                                      )}
                                      {slaRiskStatus === 'critical' && (
                                        <>
                                          <AlertTriangle className="w-4 h-4" />
                                          <span>Critical ({Math.max(...slaTimers.map(t => t.percentageElapsed || 0)).toFixed(0)}%)</span>
                                        </>
                                      )}
                                      {slaRiskStatus === 'at_risk' && (
                                        <>
                                          <AlertCircle className="w-4 h-4" />
                                          <span>At Risk ({Math.max(...slaTimers.map(t => t.percentageElapsed || 0)).toFixed(0)}%)</span>
                                        </>
                                      )}
                                      {slaRiskStatus === 'paused' && (
                                        <>
                                          <Pause className="w-4 h-4" />
                                          <span>Paused</span>
                                        </>
                                      )}
                                      {slaRiskStatus === 'on_track' && (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          <span>On Track</span>
                                        </>
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              )}

                              {/* Assignee / Transfer to */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <UserIcon className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                                  Assigned To
                                </label>
                                <div className="space-y-2">
                                  {/* Currently Assigned Agent Display */}
                                  {ticket.assignee && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="w-5 h-5 ring-2 ring-violet-200 dark:ring-violet-800 flex-shrink-0">
                                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-semibold">
                                            {ticket.assignee.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.assignee.name}</span>
                                      </div>
                                    </div>
                                  )}
                                  {/* Transfer Button - Disabled in read-only mode */}
                                  <button
                                    onClick={() => {
                                      // Disable in read-only mode (when assigned to another agent, not unassigned)
                                      if (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) {
                                        return;
                                      }
                                      setShowTransferModal(true);
                                    }}
                                    disabled={ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id}
                                    className={`w-full font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                                      (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id)
                                        ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                        : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white hover:shadow-lg'
                                    }`}
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                    Transfer Ticket
                                  </button>
                                </div>
                              </div>

                              {/* Department / Change Department */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Building2 className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                                  Department
                                </label>
                                <div className="space-y-2">
                                  {/* Currently Assigned Department Display */}
                                  {ticket.department && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.department.name}</span>
                                      </div>
                                    </div>
                                  )}
                                  {/* Change Department Button - Disabled in read-only mode */}
                                  <button
                                    onClick={() => {
                                      // Disable in read-only mode (when assigned to another agent, not unassigned)
                                      if (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) {
                                        return;
                                      }
                                      setShowChangeDepartmentModal(true);
                                    }}
                                    disabled={ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id}
                                    className={`w-full font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                                      (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id)
                                        ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                        : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white hover:shadow-lg'
                                    }`}
                                  >
                                    <Building2 className="w-4 h-4" />
                                    Change Department
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TAT Metrics Card */}
                        {(ticket.agentTATSeconds || ticket.firstResponseTimeSeconds || ticket.resolutionTimeSeconds) && (
                          <div className="bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-900/20 dark:to-purple-900/10 rounded-xl border border-violet-200 dark:border-violet-800 p-6">
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                              <Timer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                              Turnaround Time (TAT) Metrics
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {ticket.agentTATSeconds && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Agent TAT</label>
                                  <div className="p-3 bg-white dark:bg-slate-800/50 border border-violet-200 dark:border-violet-800 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Timer className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {ticket.agentTATFormatted || formatTAT(ticket.agentTATSeconds)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Time agent spent working</p>
                                  </div>
                                </div>
                              )}
                              {ticket.firstResponseTimeSeconds !== null && ticket.firstResponseTimeSeconds !== undefined && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">First Response</label>
                                  <div className="p-3 bg-white dark:bg-slate-800/50 border border-violet-200 dark:border-violet-800 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {ticket.firstResponseTimeFormatted || formatTAT(ticket.firstResponseTimeSeconds)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Time to first agent response</p>
                                  </div>
                                </div>
                              )}
                              {ticket.resolutionTimeSeconds && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Resolution Time</label>
                                  <div className="p-3 bg-white dark:bg-slate-800/50 border border-violet-200 dark:border-violet-800 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <CheckIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {ticket.resolutionTimeFormatted || formatTAT(ticket.resolutionTimeSeconds)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Time from creation to resolution</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Ticket Details Card */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <div className="w-1.5 h-5 bg-gradient-to-b from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 rounded-full"></div>
                              Ticket Details
                            </h3>
                            {!editingTicket && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Disable in read-only mode (when assigned to another agent, not unassigned)
                                  if (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) {
                                    return;
                                  }
                                  setEditingTicket(true);
                                }}
                                disabled={ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id}
                                className={`border-2 h-8 text-xs ${
                                  (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id)
                                    ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                <Pencil className="w-3 h-3 mr-1.5" />
                                Edit
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Subject</label>
                              {editingTicket ? (
                                <input
                                  type="text"
                                  value={editTicketData.subject}
                                  onChange={(e) => setEditTicketData(prev => ({ ...prev, subject: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                                  placeholder="Enter subject"
                                />
                              ) : (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.subject || 'No subject'}</p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Category</label>
                              {editingTicket ? (
                                <select
                                  value={editTicketData.category}
                                  onChange={(e) => setEditTicketData(prev => ({ ...prev, category: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                                >
                                  <option value="WZATCO">WZATCO</option>
                                  <option value="Technical">Technical</option>
                                  <option value="Billing">Billing</option>
                                  <option value="Support">Support</option>
                                  <option value="Other">Other</option>
                                </select>
                              ) : (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 font-semibold text-xs px-2.5 py-1 rounded-md">
                                    {ticket.category || 'WZATCO'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Product</label>
                              {editingTicket ? (
                                <select
                                  value={editTicketData.productId}
                                  onChange={(e) => setEditTicketData(prev => ({ ...prev, productId: e.target.value, accessoryId: '' }))}
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                                >
                                  <option value="">Select Product</option>
                                  {products.map(product => (
                                    <option key={product.id} value={product.id}>{product.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  {/* Custom Badge */}
                                  {ticket.productModel && !ticket.productId && (
                                    <div className="mb-2">
                                      <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 font-semibold text-xs px-2 py-0.5 rounded-md">
                                        Custom
                                      </Badge>
                                    </div>
                                  )}
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {ticket.product?.name || ticket.productModel || 'Not specified'}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Accessory (Optional)</label>
                              {editingTicket ? (
                                <select
                                  value={editTicketData.accessoryId}
                                  onChange={(e) => setEditTicketData(prev => ({ ...prev, accessoryId: e.target.value }))}
                                  disabled={!editTicketData.productId}
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">Select Accessory (Optional)</option>
                                  {filteredAccessories.map(accessory => (
                                    <option key={accessory.id} value={accessory.id}>{accessory.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {ticket.accessory?.name || 'Not specified'}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Invoice Number (Optional)</label>
                              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                  {ticket.invoice || 'Not specified'}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Priority</label>
                              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <Badge className={`
                                  ${ticket.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' : ''}
                                  ${ticket.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' : ''}
                                  ${ticket.priority === 'low' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' : ''}
                                  font-semibold text-xs px-2.5 py-1 rounded-md capitalize
                                `}>
                                  {ticket.priority || 'low'}
                                </Badge>
                              </div>
                            </div>
                            {editingTicket && (
                              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                                <Button
                                  onClick={handleEditTicket}
                                  disabled={savingTicket}
                                  size="sm"
                                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-1.5 h-auto text-xs rounded-lg disabled:opacity-50"
                                >
                                  {savingTicket ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingTicket(false);
                                    setEditTicketData({
                                      subject: ticket.subject || '',
                                      category: ticket.category || 'WZATCO',
                                      productId: ticket.productId || '',
                                      accessoryId: ticket.accessoryId || ''
                                    });
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-4 py-1.5 h-auto text-xs rounded-lg"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tags Card */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <div className="w-1.5 h-5 bg-gradient-to-b from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 rounded-full"></div>
                              Tags
                            </h3>
                            <Button
                              onClick={() => {
                                if (isReadOnly) return;
                                setShowTagModal(true);
                              }}
                              disabled={isReadOnly}
                              className={`text-xs px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 ${
                                isReadOnly
                                  ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                  : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white hover:shadow-lg'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              Add Tag
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {ticketTags.length === 0 ? (
                              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No tags assigned</p>
                            ) : (
                              ticketTags.map((tag) => {
                                // Conditional color for Video Call Tag: red if pending, green if done
                                let tagColor = tag.color;
                                if (tag.name === 'Video Call Tag') {
                                  // Use status from ConversationTag if available, otherwise fallback to ticket status
                                  const videoCallStatus = tag.status || (ticket.status === 'resolved' || ticket.status === 'closed' ? 'done' : 'pending');
                                  tagColor = videoCallStatus === 'done' ? '#10b981' : '#ef4444';
                                }
                                return (
                                  <div
                                    key={tag.id}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all group"
                                    style={{ backgroundColor: tagColor }}
                                  >
                                    <TagIcon className="w-3 h-3" />
                                    <span>{tag.name}</span>
                                    {tag.name === 'Video Call Tag' && tag.conversationTagId && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          console.log('🔵 Button clicked - Toggling Video Call Tag:', {
                                            conversationTagId: tag.conversationTagId,
                                            currentStatus: tag.status,
                                            tagId: tag.id,
                                            fullTag: tag
                                          });
                                          await toggleVideoCallStatus(tag.conversationTagId, tag.status);
                                        }}
                                        className="opacity-90 hover:opacity-100 transition-opacity hover:bg-white/40 rounded p-1 ml-1 flex items-center justify-center cursor-pointer z-10"
                                        title={`Click to mark as ${(tag.status || 'pending') === 'done' ? 'pending' : 'done'}`}
                                        type="button"
                                      >
                                        {(tag.status || 'pending') === 'done' ? (
                                          <CheckIcon className="w-3.5 h-3.5" />
                                        ) : (
                                          <Clock className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveTag(tag.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded p-0.5"
                                      title="Remove tag"
                                    >
                                      <XIcon className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Statistics & Timestamps Card */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-5 bg-gradient-to-b from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 rounded-full"></div>
                            Statistics & Timeline
                          </h3>
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Messages</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{messages.length}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800/50">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-violet-500 dark:bg-violet-600 rounded-lg">
                                    <StickyNote className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Agent Notes</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{notes.length}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  Created At
                                </label>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(ticket.createdAt)}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatTimeAgo(ticket.createdAt)}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  Last Updated
                                </label>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(ticket.updatedAt)}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatTimeAgo(ticket.updatedAt)}</p>
                                </div>
                              </div>
                              {ticket.lastMessageAt && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    Last Message
                                  </label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(ticket.lastMessageAt)}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatTimeAgo(ticket.lastMessageAt)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Customer Quick Info Card */}
                        {/* Ticket Creation Form Fields */}
                        {(ticket.customerEmail || ticket.customerPhone || ticket.customerAddress || ticket.orderNumber || ticket.purchasedFrom || ticket.ticketBody || ticket.invoiceUrl || ticket.additionalDocuments || ticket.issueVideoLink || ticket.issueType) && (
                          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <div className="w-1.5 h-5 bg-gradient-to-b from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 rounded-full"></div>
                                Ticket Creation Details
                                {creationDetailsEdited && (
                                  <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 font-semibold text-xs px-2 py-0.5 rounded-md ml-2">
                                    Edited
                                  </Badge>
                                )}
                              </h3>
                              {!editingCreationDetails ? (
                                <Button
                                  onClick={() => {
                                    // Disable in read-only mode (when assigned to another agent, not unassigned)
                                    if (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) {
                                      return;
                                    }
                                    setEditingCreationDetails(true);
                                  }}
                                  disabled={ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id}
                                  variant="outline"
                                  size="sm"
                                  className={`h-8 text-xs ${
                                    (ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id)
                                      ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                                      : ''
                                  }`}
                                >
                                  <Pencil className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={handleCancelEditCreationDetails}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={savingCreationDetails}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleSaveCreationDetails}
                                    size="sm"
                                    className="h-8 text-xs bg-violet-600 hover:bg-violet-700"
                                    disabled={savingCreationDetails}
                                  >
                                    {savingCreationDetails ? 'Saving...' : 'Save'}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(ticket.customerEmail || editingCreationDetails) && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    Email
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="email"
                                      value={creationDetailsData.customerEmail || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, customerEmail: e.target.value }))}
                                      className="text-sm"
                                      placeholder="Customer email"
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.customerEmail || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.customerPhone || editingCreationDetails) && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    Phone
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="tel"
                                      value={creationDetailsData.customerPhone || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, customerPhone: e.target.value }))}
                                      className="text-sm"
                                      placeholder="Customer phone"
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.customerPhone || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.customerAltPhone || editingCreationDetails) && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    Alternative Phone
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="tel"
                                      value={creationDetailsData.customerAltPhone || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, customerAltPhone: e.target.value }))}
                                      className="text-sm"
                                      placeholder="Alternative phone"
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.customerAltPhone || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.customerAddress || editingCreationDetails) && (
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Address
                                  </label>
                                  {editingCreationDetails ? (
                                    <textarea
                                      value={creationDetailsData.customerAddress || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, customerAddress: e.target.value }))}
                                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400"
                                      placeholder="Customer address"
                                      rows={2}
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.customerAddress || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.orderNumber || editingCreationDetails) && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    Order Number
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="text"
                                      value={creationDetailsData.orderNumber || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, orderNumber: e.target.value }))}
                                      className="text-sm"
                                      placeholder="Order number"
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.orderNumber || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.purchasedFrom || editingCreationDetails) && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    Purchased From
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="text"
                                      value={creationDetailsData.purchasedFrom || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, purchasedFrom: e.target.value }))}
                                      className="text-sm"
                                      placeholder="Purchased from"
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 font-semibold text-xs px-2.5 py-1 rounded-md">
                                        {ticket.purchasedFrom || 'N/A'}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.issueType || editingCreationDetails) && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Issue Type
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="text"
                                      value={creationDetailsData.issueType || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, issueType: e.target.value }))}
                                      className="text-sm"
                                      placeholder="Issue type"
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 font-semibold text-xs px-2.5 py-1 rounded-md">
                                        {ticket.issueType || 'N/A'}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.issueVideoLink || editingCreationDetails) && (
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Link2 className="w-3 h-3" />
                                    Issue Video Link
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="url"
                                      value={creationDetailsData.issueVideoLink || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, issueVideoLink: e.target.value }))}
                                      className="text-sm"
                                      placeholder="https://..."
                                    />
                                  ) : ticket.issueVideoLink ? (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <a
                                        href={ticket.issueVideoLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                      >
                                        {ticket.issueVideoLink}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                              {(ticket.ticketBody || editingCreationDetails) && (
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Ticket Body / Description</label>
                                  {editingCreationDetails ? (
                                    <textarea
                                      value={creationDetailsData.ticketBody || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, ticketBody: e.target.value }))}
                                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400"
                                      placeholder="Ticket description"
                                      rows={4}
                                    />
                                  ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{ticket.ticketBody || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(ticket.invoiceUrl || editingCreationDetails) && (
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <File className="w-3 h-3" />
                                    Invoice URL
                                  </label>
                                  {editingCreationDetails ? (
                                    <Input
                                      type="url"
                                      value={creationDetailsData.invoiceUrl || ''}
                                      onChange={(e) => setCreationDetailsData(prev => ({ ...prev, invoiceUrl: e.target.value }))}
                                      className="text-sm"
                                      placeholder="https://..."
                                    />
                                  ) : ticket.invoiceUrl ? (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <a
                                        href={ticket.invoiceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                      >
                                        View Invoice
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                              {ticket.additionalDocuments && (() => {
                                try {
                                  const docs = typeof ticket.additionalDocuments === 'string'
                                    ? JSON.parse(ticket.additionalDocuments)
                                    : ticket.additionalDocuments;
                                  if (Array.isArray(docs) && docs.length > 0) {
                                    return (
                                      <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                          <File className="w-3 h-3" />
                                          Additional Documents ({docs.length})
                                        </label>
                                        <div className="space-y-2">
                                          {docs.map((doc, index) => (
                                            <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                              <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                              >
                                                {doc.fileName || `Document ${index + 1}`}
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                } catch (e) {
                                  return null;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        )}

                        {(ticket.customer || ticket.customerName) && (
                          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                              <div className="w-1.5 h-5 bg-gradient-to-b from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 rounded-full"></div>
                              Customer Quick Info
                            </h3>
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50">
                              <div className="flex items-center gap-3 mb-3">
                                <Avatar className="w-10 h-10 ring-2 ring-blue-200 dark:ring-blue-800">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                    {(ticket.customer?.name || ticket.customerName)?.charAt(0) || 'C'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-white truncate">
                                    {ticket.customer?.name || ticket.customerName || 'Unknown Customer'}
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                    {ticket.customer?.email || 'No email'}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">Phone: </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.customer?.phone || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">Company: </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.customer?.company || 'Individual'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Sidebar */}
              <div
                className={`xl:col-span-1 ${activeTab === 'details' ? 'sticky top-6 self-start' : ''}`}
                onMouseEnter={() => {
                  if (activeTab === 'details') {
                    setSidebarHovered(true);
                  }
                }}
                onMouseLeave={() => {
                  if (activeTab === 'details') {
                    setSidebarHovered(false);
                  }
                }}
              >
                <div
                  className={`space-y-4 ${activeTab === 'details' ? (sidebarHovered ? 'overflow-y-auto max-h-[calc(100vh-120px)]' : 'overflow-hidden max-h-[calc(100vh-120px)]') : ''}`}
                  onWheel={(e) => {
                    // When hovering sidebar, prevent page scroll if sidebar can scroll
                    if (activeTab === 'details' && sidebarHovered) {
                      const element = e.currentTarget;
                      const { scrollTop, scrollHeight, clientHeight } = element;
                      const isAtTop = scrollTop === 0;
                      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

                      // If we're at the boundaries, allow page scroll
                      if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
                        // At boundary, allow page to scroll
                        return;
                      }
                      // Otherwise, prevent page scroll and scroll sidebar only
                      e.stopPropagation();
                    }
                  }}
                >
                  {/* Worklog Section - Digital Clock */}
                  {ticket.assigneeId === user?.id && (
                    <div className="mb-4 p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                      {loadingWorklogs ? (
                        <div className="text-center py-4">
                          <div className="w-6 h-6 border-2 border-violet-600 dark:border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading...</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Active Time</span>
                            {timerData.activeLog ? (
                              <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 animate-pulse px-2 py-0.5 text-[10px]">RUNNING</Badge>
                            ) : (
                              <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 px-2 py-0.5 text-[10px]">STOPPED</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-end justify-between">
                            <div className="font-mono text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                              {formatDuration(timerData.totalSeconds)}
                            </div>
                            {/* Optional: Show current session start time if active */}
                            {timerData.activeLog && (
                              <div className="text-xs text-slate-400 dark:text-slate-500">
                                Session started: {new Date(timerData.activeLog.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            )}
                          </div>
                           
                           {/* Controls */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                               {!timerData.activeLog ? (
                                   <Button size="sm" onClick={handleManualStart} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                      Start Timer
                                   </Button>
                               ) : (
                                   <Button size="sm" variant="outline" onClick={handleManualStopClick} className="w-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                      Stop Timer
                                   </Button>
                               )}
                          </div>

                          {/* Session History */}
                          {timerData.historyLogs && timerData.historyLogs.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Session History</p>
                              <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {timerData.historyLogs.map((log) => (
                                  <div key={log.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                    <div className="flex flex-col">
                                      <span className="text-slate-600 dark:text-slate-300 font-mono">
                                        {new Date(log.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                        {log.endedAt ? new Date(log.endedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                      </span>
                                      {log.stopReason && (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                                          {log.stopReason}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono font-medium text-slate-500 dark:text-slate-400">
                                      {formatDuration(log.durationSeconds)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* File Attachments Section */}
                  <Card className="rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-700">
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        File Attachments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        {/* Projector Images */}
                        {ticket?.projectorImages && (() => {
                          try {
                            const images = typeof ticket.projectorImages === 'string'
                              ? JSON.parse(ticket.projectorImages)
                              : ticket.projectorImages;
                            if (Array.isArray(images) && images.length > 0) {
                              const sideNames = ['Front', 'Back', 'Left', 'Right'];
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                      Projector Images ({images.length})
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {images.map((imageUrl, index) => (
                                      <div
                                        key={index}
                                        onClick={() => setViewingImage({ url: imageUrl, index })}
                                        className="group relative block aspect-video rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 transition-all cursor-pointer"
                                      >
                                        <img
                                          src={imageUrl}
                                          alt={sideNames[index] || `Image ${index + 1}`}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {
                            console.error('Error parsing projector images:', e);
                          }
                          return null;
                        })()}

                        {/* Invoice */}
                        {ticket?.invoiceUrl && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Invoice
                              </h4>
                            </div>
                            <a
                              href={ticket.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
                            >
                              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                                <File className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                  Invoice Document
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Click to view
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                            </a>
                          </div>
                        )}

                        {/* Additional Documents */}
                        {ticket?.additionalDocuments && (() => {
                          try {
                            const docs = typeof ticket.additionalDocuments === 'string'
                              ? JSON.parse(ticket.additionalDocuments)
                              : ticket.additionalDocuments;
                            if (Array.isArray(docs) && docs.length > 0) {
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <File className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                      Additional Documents ({docs.length})
                                    </h4>
                                  </div>
                                  <div className="space-y-2">
                                    {docs.map((doc, index) => (
                                      <a
                                        key={index}
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
                                      >
                                        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                                          <File className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                            {doc.fileName || `Document ${index + 1}`}
                                          </div>
                                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                            {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Click to view'}
                                          </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {
                            console.error('Error parsing additional documents:', e);
                          }
                          return null;
                        })()}
                      </div>

                      {/* Empty State */}
                      {!ticket?.projectorImages && !ticket?.additionalDocuments && !ticket?.invoiceUrl && (
                        <div className="text-center py-8 px-4">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Paperclip className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No attachments</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Files will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Agent Notes - Enhanced */}
                  <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-r from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700">
                      <CardTitle className="text-base font-bold text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                            <StickyNote className="w-4 h-4 text-white" />
                          </div>
                          <span>Agent Notes</span>
                          {notes.length > 0 && (
                            <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-bold">
                              {notes.length}
                            </span>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Add Note Form - Hidden in read-only mode (when assigned to another agent, not unassigned) */}
                      {!(ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) && (
                        <form onSubmit={handleCreateNote} className="space-y-3 bg-gradient-to-br from-slate-50 to-violet-50/30 dark:from-slate-900 dark:to-violet-900/10 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Add New Note</label>
                            <textarea
                              ref={noteTextareaRef}
                              placeholder="Type your note here... Use @ to mention someone"
                              value={newNote}
                              onChange={(e) => {
                                setNewNote(e.target.value);
                                handleMentionInput(e.target.value, setNewNote, noteTextareaRef);
                              }}
                              onKeyDown={handleMentionKeyDown}
                              className="w-full px-3 py-2.5 text-sm border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-none transition-all"
                              rows={3}
                              disabled={creatingNote}
                            />
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <EyeOffIcon className="w-3 h-3" />
                              <span>Private by default</span>
                            </div>
                            <Button
                              type="submit"
                              disabled={!newNote.trim() || creatingNote}
                              size="sm"
                              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-4 py-1.5 h-auto text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                            >
                              {creatingNote ? 'Adding...' : '+ Add'}
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Notes List */}
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        {notes.length === 0 && (
                          <div className="text-center py-8 px-4">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                              <StickyNote className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No notes yet</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add your first note above</p>
                          </div>
                        )}
                        {notes.map((note) => (
                          <div key={note.id} className={`group relative rounded-xl border transition-all duration-200 overflow-hidden ${note.pinned
                            ? 'border-violet-400 dark:border-violet-600 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/40 dark:to-violet-800/20 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                            }`}>
                            {/* Pin Indicator */}
                            {note.pinned && (
                              <div className="absolute top-2 right-2 z-10">
                                <div className="bg-violet-500 dark:bg-violet-600 text-white p-1 rounded-md shadow-lg">
                                  <PinIcon className="w-3 h-3" />
                                </div>
                              </div>
                            )}

                            <div className="p-3">
                              {editingNoteId === note.id ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editNoteContent}
                                    onChange={(e) => setEditNoteContent(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-none"
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleCancelEditNote}
                                      className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1 h-auto text-xs rounded-lg"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={handleSaveEditNote}
                                      disabled={!editNoteContent.trim()}
                                      className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 h-auto text-xs rounded-lg disabled:opacity-50"
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Note Content */}
                                  <p
                                    className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed pr-8"
                                    dangerouslySetInnerHTML={{
                                      __html: note.content
                                        .replace(/&/g, '&amp;')
                                        .replace(/</g, '&lt;')
                                        .replace(/>/g, '&gt;')
                                        .replace(/@([a-zA-Z0-9._-]+(?:@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?)/g, '<span class="mention-highlight bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded font-semibold">@$1</span>')
                                    }}
                                  />

                                  {/* Note Metadata */}
                                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1 text-xs">
                                          <UserCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                          <span className="font-medium text-slate-600 dark:text-slate-400">{note.createdByName || 'Agent'}</span>
                                        </div>
                                        <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400" title={new Date(note.createdAt).toLocaleString()}>
                                          {formatTimeAgo(note.createdAt)}
                                        </span>
                                        {note.updatedAt && note.updatedAt !== note.createdAt && (
                                          <>
                                            <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                                            <span className="text-xs text-slate-400 dark:text-slate-500 italic" title={new Date(note.updatedAt).toLocaleString()}>
                                              edited
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* Privacy Badge */}
                                      {note.isPrivate ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                                          <EyeOffIcon className="w-2.5 h-2.5" />
                                          Private
                                          {note.createdById !== user?.id && (
                                            <span className="ml-1 text-[9px] opacity-75">(Owner only)</span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-semibold">
                                          <EyeIcon className="w-2.5 h-2.5" />
                                          Public
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons - Show on hover, only for note owner, disabled in read-only mode (when assigned to another agent, not unassigned) */}
                                  {note.createdById === user?.id && !(ticket && ticket.assigneeId !== null && ticket.assigneeId !== user?.id) && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePin(note.id, note.pinned)}
                                        className={`p-1.5 rounded-md transition-all ${note.pinned
                                          ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/60'
                                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                          }`}
                                        title={note.pinned ? 'Unpin note' : 'Pin note'}
                                      >
                                        <PinIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditNote(note)}
                                        className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
                                        title="Edit note"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePrivacy(note.id, note.isPrivate)}
                                        className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                        title={note.isPrivate ? 'Make public' : 'Make private'}
                                      >
                                        {note.isPrivate ? (
                                          <EyeOffIcon className="w-3.5 h-3.5" />
                                        ) : (
                                          <EyeIcon className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="p-1.5 rounded-md text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                                        title="Delete note"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customer Details - Enhanced */}
                  <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                            <UserIcon className="w-4 h-4 text-white" />
                          </div>
                          <span>Customer Details</span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                          className="text-white hover:bg-white/20 p-1.5 h-auto rounded-lg"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showCustomerDetails ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                    </CardHeader>
                    {showCustomerDetails && (
                      <CardContent className="p-4 space-y-4 animate-fade-in">
                        {/* Customer Header Card */}
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800/50">
                          <Avatar className="w-14 h-14 ring-2 ring-blue-200 dark:ring-blue-800 shadow-md">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">
                              {(ticket.customer?.name || ticket.customerName)?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                              {ticket.customer?.name || ticket.customerName || 'Unknown Customer'}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                              {ticket.customer?.email || 'No email provided'}
                            </p>
                          </div>
                        </div>

                        {/* Customer Info Grid */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Customer ID</span>
                            <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                              {ticket.customer?.id ? ticket.customer.id.slice(-8) : ticket.customerId ? ticket.customerId.slice(-8) : 'N/A'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Email</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={ticket.customer?.email}>
                              {ticket.customer?.email || 'Not provided'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Phone</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.customer?.phone || 'Not provided'}</span>
                          </div>

                          <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Company</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{ticket.customer?.company || 'Individual'}</span>
                          </div>

                          <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Location</span>
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words leading-relaxed">{ticket.customer?.location || 'Not specified'}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Customer Since</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {ticket.customer?.createdAt ? formatDate(ticket.customer.createdAt) : 'Unknown'}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          onClick={handleViewFullProfile}
                          className="w-full border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 font-semibold rounded-lg"
                        >
                          <UserIcon className="w-4 h-4 mr-2" />
                          View Full Profile
                        </Button>
                      </CardContent>
                    )}
                  </Card>

                  {/* Quick Actions - Enhanced */}
                  <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700">
                      <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <span>Quick Actions</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2.5">
                      <Button
                        onClick={() => handleStatusUpdate('pending')}
                        disabled={isReadOnly || updatingStatus || ticket.status === 'pending'}
                        className={`w-full transition-all duration-200 rounded-lg font-semibold shadow-md text-sm h-10 ${
                          isReadOnly
                            ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white hover:shadow-lg disabled:opacity-50'
                        }`}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Mark as Pending
                      </Button>

                      <Button
                        onClick={() => handleStatusUpdate('resolved')}
                        disabled={isReadOnly || updatingStatus || ticket.status === 'resolved'}
                        className={`w-full transition-all duration-200 rounded-lg font-semibold shadow-md text-sm h-10 ${
                          isReadOnly
                            ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white hover:shadow-lg disabled:opacity-50'
                        }`}
                      >
                        <CheckIcon className="w-4 h-4 mr-2" />
                        Mark as Resolved
                      </Button>

                      <Button
                        onClick={() => handleStatusUpdate('closed')}
                        disabled={isReadOnly || updatingStatus || ticket.status === 'closed'}
                        className={`w-full transition-all duration-200 rounded-lg font-semibold shadow-md text-sm h-10 ${
                          isReadOnly
                            ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700 text-white hover:shadow-lg disabled:opacity-50'
                        }`}
                      >
                        <XIcon className="w-4 h-4 mr-2" />
                        Close Ticket
                      </Button>

                      {/* Advanced Actions */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2.5 mt-2">
                        {/* Escalate Priority Button - Show when NOT resolved/closed */}
                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <Button
                            onClick={() => setShowEscalateModal(true)}
                            disabled={isReadOnly}
                            className={`w-full transition-all duration-200 rounded-lg font-semibold shadow-md text-sm h-10 ${
                              isReadOnly
                                ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 text-white hover:shadow-lg'
                            }`}
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Escalate Priority
                          </Button>
                        )}

                        {/* Reopen Ticket Button - Show when resolved/closed */}
                        {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                          <Button
                            onClick={() => setShowReopenModal(true)}
                            disabled={isReadOnly}
                            className={`w-full transition-all duration-200 rounded-lg font-semibold shadow-md text-sm h-10 ${
                              isReadOnly
                                ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white hover:shadow-lg'
                            }`}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reopen Ticket
                          </Button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 block">Transfer to</label>
                          <Button
                            onClick={() => setShowTransferModal(true)}
                            disabled={isReadOnly}
                            className={`w-full font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                              isReadOnly
                                ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50'
                                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white hover:shadow-lg'
                            }`}
                          >
                            <Users className="w-4 h-4" />
                            Transfer Ticket
                          </Button>
                          {ticket?.assignee && (
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                              Currently assigned to: <span className="font-semibold">{ticket.assignee.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Route to Department */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 block">Route to Department</label>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {/* Unroute Option */}
                            <button
                              onClick={() => handleRouteDepartment(null)}
                              disabled={isReadOnly || routingDepartment}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all ${!ticket?.department?.id
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-600 text-slate-700 dark:text-slate-300'
                                } ${(isReadOnly || routingDepartment) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!ticket?.department?.id
                                ? 'bg-violet-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}>
                                <XIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium">Not Routed</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Unroute from department</div>
                              </div>
                              {!ticket?.department?.id && (
                                <CheckIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                              )}
                            </button>

                            {/* Department Options */}
                            {departments.filter(d => d.isActive).map((dept) => (
                              <button
                                key={dept.id}
                                onClick={() => handleRouteDepartment(dept.id)}
                                disabled={isReadOnly || routingDepartment}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all ${ticket?.department?.id === dept.id
                                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-600 text-slate-700 dark:text-slate-300'
                                  } ${(isReadOnly || routingDepartment) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ticket?.department?.id === dept.id
                                  ? 'bg-violet-500 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                  }`}>
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium">{dept.name}</div>
                                  {dept.description && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{dept.description}</div>
                                  )}
                                </div>
                                {ticket?.department?.id === dept.id && (
                                  <CheckIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                          {routingDepartment && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Routing...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activities - Enhanced */}
                  <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700">
                      <CardTitle className="text-base font-bold text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Activity className="w-4 h-4 text-white" />
                          </div>
                          <span>Recent Activities</span>
                          {activities.length > 0 && (
                            <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-bold">
                              {activities.length}
                            </span>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {loadingActivities ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : activities.length === 0 ? (
                        <div className="text-center py-8 px-4">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No activities yet</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Activities will appear here</p>
                        </div>
                      ) : (
                        <div className="max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                          {(() => {
                            // Group activities by date
                            const groupedActivities = activities.reduce((groups, activity) => {
                              const date = new Date(activity.createdAt);
                              const dateKey = date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric'
                              });

                              if (!groups[dateKey]) {
                                groups[dateKey] = [];
                              }
                              groups[dateKey].push(activity);
                              return groups;
                            }, {});

                            // Sort dates in descending order (newest first)
                            const sortedDates = Object.keys(groupedActivities).sort((a, b) => {
                              return new Date(b) - new Date(a);
                            });

                            return sortedDates.map((dateKey, dateIndex) => {
                              const dateActivities = groupedActivities[dateKey];
                              const date = new Date(dateKey);
                              const today = new Date();
                              const yesterday = new Date(today);
                              yesterday.setDate(yesterday.getDate() - 1);

                              // Format date header
                              let dateHeader = '';
                              const isToday = date.toDateString() === today.toDateString();
                              const isYesterday = date.toDateString() === yesterday.toDateString();

                              if (isToday) {
                                dateHeader = 'Today';
                              } else if (isYesterday) {
                                dateHeader = 'Yesterday';
                              } else {
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                                const monthDay = date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                });
                                const year = date.getFullYear() !== today.getFullYear()
                                  ? `, ${date.getFullYear()}`
                                  : '';
                                dateHeader = `${dayName}, ${monthDay}${year}`;
                              }

                              return (
                                <div key={dateKey} className={dateIndex > 0 ? 'mt-6' : ''}>
                                  {/* Date Header */}
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-2">
                                      {dateHeader}
                                    </span>
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                  </div>

                                  {/* Activities for this date */}
                                  <div className="space-y-3">
                                    {dateActivities.map((activity, index) => {
                                      const activityInfo = formatActivityMessage(activity);
                                      const IconComponent = activityInfo.icon;
                                      const isLast = index === dateActivities.length - 1;

                                      // Determine performer info
                                      const performerName = activity.agent?.name || activity.performedByName || (activity.performedBy === 'agent' ? 'Agent' : 'Agent');
                                      const isAgent = activity.performedBy === 'agent' && activity.agent;
                                      const isAdmin = activity.performedBy === 'admin';

                                      // Format timestamp (only time, no date)
                                      const activityDate = new Date(activity.createdAt);
                                      const formattedTime = activityDate.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      });

                                      return (
                                        <div key={activity.id} className="relative">
                                          {/* Timeline connector */}
                                          {!isLast && (
                                            <div className="absolute left-3 top-9 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                          )}

                                          {/* Timeline dot */}
                                          <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-amber-500 dark:border-amber-400 flex items-center justify-center z-10 shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400"></div>
                                          </div>

                                          <div className={`relative rounded-lg border transition-all duration-200 hover:shadow-md ${activityInfo.borderColor} ${activityInfo.bgColor} ml-7`}>
                                            <div className="p-3">
                                              <div className="flex items-start gap-3">
                                                {/* Icon */}
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${activityInfo.bgColor} border ${activityInfo.borderColor} flex items-center justify-center`}>
                                                  <IconComponent className={`w-4 h-4 ${activityInfo.color}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug mb-2">
                                                    {activityInfo.message}
                                                  </p>

                                                  {/* Reason Display - Show if reason exists */}
                                                  {activityInfo.reason && (
                                                    <div className="mb-2 p-2 rounded-md bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        Reason:
                                                      </p>
                                                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                                                        "{activityInfo.reason}"
                                                      </p>
                                                    </div>
                                                  )}

                                                  {/* Agent/Agent Info with Timestamp */}
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                      {/* Avatar */}
                                                      {(isAgent || isAdmin) && (
                                                        <Avatar className="w-5 h-5 flex-shrink-0">
                                                          <AvatarFallback className={`text-[9px] font-bold ${isAgent
                                                            ? 'bg-violet-600 text-white'
                                                            : 'bg-emerald-600 text-white'
                                                            }`}>
                                                            {performerName.charAt(0).toUpperCase()}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                      )}

                                                      <span className={`text-xs font-semibold ${isAgent
                                                        ? 'text-violet-700 dark:text-violet-300'
                                                        : 'text-emerald-700 dark:text-emerald-300'
                                                        }`}>
                                                        {performerName}
                                                      </span>
                                                    </div>

                                                    {/* Timestamp - Only time */}
                                                    <div className="flex-shrink-0 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                                      <Clock className="w-3 h-3" />
                                                      <span>{formattedTime}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Click outside to close dropdowns */}
        {(showStatusDropdown || showPriorityDropdown || showDepartmentDropdown || showAssigneeDropdown) && (
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setShowStatusDropdown(false);
              setShowPriorityDropdown(false);
              setShowDepartmentDropdown(false);
              setShowAssigneeDropdown(false);
              setStatusDropdownPosition(null);
              setPriorityDropdownPosition(null);
              setDepartmentDropdownPosition(null);
              setAssigneeDropdownPosition(null);
            }}
          />
        )}

        {/* Portal-rendered Status Dropdown */}
        {showStatusDropdown && statusDropdownPosition && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[120px]"
            style={{
              top: statusDropdownPosition.top,
              left: statusDropdownPosition.left,
              width: statusDropdownPosition.width || 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {['open', 'pending', 'resolved', 'closed'].map(status => (
              <button
                key={status}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(status);
                  setShowStatusDropdown(false);
                  setStatusDropdownPosition(null);
                }}
                disabled={updatingStatus}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors disabled:opacity-50 ${ticket.status === status ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>,
          document.body
        )}

        {/* Portal-rendered Priority Dropdown */}
        {!ticketSettings.hidePriorityAgent && showPriorityDropdown && priorityDropdownPosition && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[140px]"
            style={{
              top: priorityDropdownPosition.top,
              left: priorityDropdownPosition.left,
              width: priorityDropdownPosition.width || 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {['low', 'medium', 'high'].map(priority => (
              <button
                key={priority}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePriorityChange(priority);
                  setShowPriorityDropdown(false);
                  setPriorityDropdownPosition(null);
                }}
                disabled={updatingPriority}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors disabled:opacity-50 ${ticket.priority === priority ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </button>
            ))}
          </div>,
          document.body
        )}

        {/* Portal-rendered Department Dropdown */}
        {showDepartmentDropdown && departmentDropdownPosition && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[200px] max-h-[300px] overflow-y-auto"
            style={{
              top: departmentDropdownPosition.top,
              left: departmentDropdownPosition.left,
              width: departmentDropdownPosition.width || 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRouteDepartment(null);
                setShowDepartmentDropdown(false);
                setDepartmentDropdownPosition(null);
              }}
              disabled={routingDepartment}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg transition-colors disabled:opacity-50 ${!ticket?.department?.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <XIcon className="w-4 h-4" />
                <span>Not Routed</span>
              </div>
            </button>
            {departments.filter(d => d.isActive).map((dept) => (
              <button
                key={dept.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRouteDepartment(dept.id);
                  setShowDepartmentDropdown(false);
                  setDepartmentDropdownPosition(null);
                }}
                disabled={routingDepartment}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 last:rounded-b-lg transition-colors disabled:opacity-50 ${ticket?.department?.id === dept.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{dept.name}</span>
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}

        {/* Portal-rendered Assignee Dropdown */}
        {showAssigneeDropdown && assigneeDropdownPosition && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[200px] max-h-[300px] overflow-y-auto"
            style={{
              top: assigneeDropdownPosition.top,
              left: assigneeDropdownPosition.left,
              width: assigneeDropdownPosition.width || 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAssignAgent(null);
                setShowAssigneeDropdown(false);
                setAssigneeDropdownPosition(null);
              }}
              disabled={assigningAgent}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg transition-colors disabled:opacity-50 ${!ticket?.assignee?.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4" />
                <span>Unassigned</span>
              </div>
            </button>
            {agents.filter(a => a.isActive).map((agent) => (
              <button
                key={agent.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssignAgent(agent.id);
                  setShowAssigneeDropdown(false);
                  setAssigneeDropdownPosition(null);
                }}
                disabled={assigningAgent}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 last:rounded-b-lg transition-colors disabled:opacity-50 ${ticket?.assignee?.id === agent.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-semibold">
                      {agent.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    {agent.email && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{agent.email}</p>
                    )}
                  </div>
                  {ticket?.assignee?.id === agent.id && (
                    <CheckIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}

        {/* Mention Autocomplete Modal Popup */}
        {mentionState.show && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMentionState(prev => ({ ...prev, show: false }));
              }
            }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Mention Someone
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        Select an agent or agent to mention
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMentionState(prev => ({ ...prev, show: false }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <XIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search by name or email..."
                      value={mentionState.query}
                      onChange={(e) => {
                        setMentionState(prev => ({ ...prev, query: e.target.value, selectedIndex: 0 }));
                      }}
                      onKeyDown={handleMentionKeyDown}
                      className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* Modal Content - User Cards Grid */}
              <div className="p-6 overflow-y-auto flex-1">
                {mentionableUsers
                  .filter(user =>
                    !mentionState.query ||
                    user.name.toLowerCase().includes(mentionState.query.toLowerCase()) ||
                    (user.email && user.email.toLowerCase().includes(mentionState.query.toLowerCase()))
                  )
                  .length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">No users found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mentionableUsers
                      .filter(user =>
                        !mentionState.query ||
                        user.name.toLowerCase().includes(mentionState.query.toLowerCase()) ||
                        (user.email && user.email.toLowerCase().includes(mentionState.query.toLowerCase()))
                      )
                      .map((user, idx) => {
                        const filtered = mentionableUsers.filter(u =>
                          !mentionState.query ||
                          u.name.toLowerCase().includes(mentionState.query.toLowerCase()) ||
                          (u.email && u.email.toLowerCase().includes(mentionState.query.toLowerCase()))
                        );
                        const actualIndex = filtered.findIndex(u => u.id === user.id && u.type === user.type);
                        const isSelected = actualIndex === mentionState.selectedIndex;

                        return (
                          <button
                            key={`${user.type}-${user.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              insertMention(user);
                            }}
                            className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-lg ${isSelected
                              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="w-12 h-12 flex-shrink-0 ring-2 ring-violet-200 dark:ring-violet-800">
                                {user.avatar ? (
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                ) : null}
                                <AvatarFallback className={`${user.type === 'agent'
                                  ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                  : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                                  } text-white text-sm font-semibold`}>
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                                    {user.name}
                                  </div>
                                  <Badge className={`text-xs flex-shrink-0 ${user.type === 'agent'
                                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }`}>
                                    {user.type === 'agent' ? 'Agent' : 'Agent'}
                                  </Badge>
                                </div>
                                {user.email && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {user.email}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <CheckIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs">↑↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs">Enter</kbd>
                    <span>Select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs">Esc</kbd>
                    <span>Close</span>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Priority Reason Modal - Portal to body for full-screen overlay */}
        {showPriorityReasonModal && typeof window !== 'undefined' && document.body && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPriorityReasonModal(false);
                setPendingPriority(null);
                setPriorityReason('');
              }
            }}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Change Priority to {pendingPriority?.charAt(0).toUpperCase() + pendingPriority?.slice(1)}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Please provide a reason for changing the priority (optional)
                </p>
                <textarea
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="e.g., Customer escalation, urgent issue, SLA deadline approaching..."
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-none"
                  rows={4}
                />
                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPriorityReasonModal(false);
                      setPendingPriority(null);
                      setPriorityReason('');
                    }}
                    disabled={updatingPriority}
                    className="border-slate-300 dark:border-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePriorityUpdate}
                    disabled={updatingPriority}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {updatingPriority ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating...</span>
                      </div>
                    ) : (
                      'Update Priority'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </AgentLayout>

      {/* Image Viewer Modal */}
      {viewingImage && typeof window !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-10"
          >
            <XIcon className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Generate filename: customerName_ticketNumber_index
              const customerName = (ticket?.customerName || ticket?.customer?.name || 'Customer')
                .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
                .replace(/_+/g, '_') // Replace multiple underscores with single
                .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
              const ticketNumber = ticket?.ticketNumber || 'TKT';
              const imageIndex = viewingImage.index !== undefined ? viewingImage.index + 1 : 'x';
              const fileExtension = viewingImage.url.split('.').pop()?.split('?')[0] || 'jpg';
              const filename = `${customerName}_${ticketNumber}_${imageIndex}.${fileExtension}`;

              // Create a temporary anchor element to download the image
              const link = document.createElement('a');
              link.href = viewingImage.url;
              link.download = filename;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="absolute top-4 right-20 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-10"
            title="Download image"
          >
            <Download className="w-6 h-6 text-white" />
          </button>
          <img
            src={viewingImage.url}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* File Size Error Modal */}
      {fileSizeError && typeof window !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setFileSizeError(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                  <span>File Size Exceeded</span>
                </h3>
                <button
                  onClick={() => setFileSizeError(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                >
                  <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  The selected file is <span className="font-semibold text-slate-900 dark:text-white">{fileSizeError.fileSizeMB} MB</span>.
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  The allowed file size limit is <span className="font-semibold text-slate-900 dark:text-white">50 MB</span>.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Please try one of the following:</p>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>Compress the file to reduce its size</li>
                    <li>Upload it on Google Drive and send the drive link</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end mt-4 sm:mt-6">
                <Button
                  onClick={() => setFileSizeError(null)}
                  className="bg-violet-600 hover:bg-violet-700 text-white w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Escalate Ticket Modal */}
      <EscalateTicketModal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        ticketId={id}
        currentPriority={ticket?.priority || 'low'}
        onSuccess={(newPriority, responseData) => {
          setTicket({ ...ticket, priority: newPriority });
          fetchTicketDetails();
          fetchActivities();
          // Show enhanced message if Team Leader was assigned
          if (responseData?.assignedTo) {
            showNotification('success', `Ticket escalated to ${responseData.assignedTo.name} (${responseData.assignedTo.role})`);
          } else {
            showNotification('success', responseData?.message || 'Ticket escalated successfully');
          }
        }}
      />

      {/* Reopen Ticket Modal */}
      <ReopenTicketModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        ticketId={id}
        onSuccess={(newStatus) => {
          setTicket({ ...ticket, status: newStatus });
          fetchTicketDetails();
          fetchActivities();
          showNotification('success', 'Ticket reopened successfully');
        }}
        isCustomer={false}
      />

      {/* Transfer Ticket Modal */}
      <TransferTicketModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        ticketId={id}
        currentAgentId={user?.agentId || user?.id}
        onTransferComplete={(data) => {
          // Refresh ticket details to show new assignee
          fetchTicketDetails();
          fetchActivities();
          showNotification('success', `Ticket transferred successfully to ${data.ticket.assignee?.name || 'recipient'}`);
        }}
      />

      {/* Change Department Modal */}
      <ChangeDepartmentModal
        isOpen={showChangeDepartmentModal}
        onClose={() => setShowChangeDepartmentModal(false)}
        ticketId={id}
        currentDepartment={ticket?.department}
        onChangeComplete={() => {
          // Refresh ticket details to show new department
          fetchTicketDetails();
          fetchActivities();
          showNotification('success', 'Department changed successfully');
        }}
      />

      {/* Stop Reason Modal */}
      {isStopModalOpen && typeof window !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsStopModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Timer className="w-5 h-5 text-red-500" />
                  <span>Stop Timer</span>
                </h3>
                <button
                  onClick={() => setIsStopModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Please select a reason for stopping the timer:
                </p>
                
                {loadingReasons ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-violet-600 dark:border-violet-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {worklogReasons.length > 0 ? (
                      worklogReasons.map((reason) => (
                        <button
                          key={reason.id}
                          onClick={() => handleStopConfirm(reason.id, reason.name)}
                          className="w-full text-left p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {reason.name}
                            </span>
                            <Badge 
                              className={`text-xs ${
                                reason.type === 'BREAK' 
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' 
                                  : reason.type === 'WORK'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {reason.type}
                            </Badge>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No reasons available</p>
                        <Button
                          onClick={() => handleStopConfirm(null, 'Manual Stop')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Stop Without Reason
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Knowledge Base Selection Modal */}
      {isMounted && (
        <KBSelectionModal
          isOpen={showKBModal}
          onClose={() => setShowKBModal(false)}
          onSend={handleSendArticle}
          isMounted={isMounted}
        />
      )}

      {/* Article Viewer Modal */}
      {isMounted && viewingArticle && (
        <ArticleViewerModal
          article={viewingArticle}
          isOpen={!!viewingArticle}
          onClose={() => setViewingArticle(null)}
          isMounted={isMounted}
        />
      )}
    </>
  );
}


