// Chat Interface - AI-style chat with quick actions
'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Send, ArrowUpRight, History, MessageSquare, ThumbsUp, ThumbsDown, BookOpen, Search, TrendingUp, Lightbulb, Eye, FileText, Youtube, Video, ExternalLink, Play, Package, Trash2, ChevronDown, Check } from 'lucide-react';
import FeedbackModal from './FeedbackModal';
import KnowledgeBaseView from './KnowledgeBaseView';
import TutorialsView from './TutorialsView';
import ScheduleCallbackView from './ScheduleCallbackView';
import TicketsView from './TicketsView';
// Removed kb-search import - using direct API calls

const ChatInterface = forwardRef(function ChatInterface({ userInfo, onNewChat, currentView = 'chat', onViewChange }, ref) {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [messageFeedback, setMessageFeedback] = useState({}); // Track feedback for each message
  const [showFeedbackModal, setShowFeedbackModal] = useState({ messageId: null, rating: null });
  const [currentSessionId, setCurrentSessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [popularArticles, setPopularArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]); // For product selection dropdown
  const [pendingProductSelection, setPendingProductSelection] = useState(null); // Message ID that needs product selection
  const [openDropdowns, setOpenDropdowns] = useState({}); // Track which dropdown is open: { messageId: 'category' | 'regular' | null }
  const dropdownRefs = useRef({}); // Refs for each dropdown to handle click outside

  // Quick actions for projector support
  const quickActions = [
    { id: 1, text: 'Setup my projector', category: 'setup' },
    { id: 2, text: 'Fix image quality issues', category: 'troubleshooting' },
    { id: 3, text: 'Connect to WiFi', category: 'connectivity' },
    { id: 4, text: 'Check product specifications', category: 'products' },
  ];


  // State to cache festival data
  const [festivalData, setFestivalData] = useState(null);
  const [festivalLoading, setFestivalLoading] = useState(false);

  // Fetch festival from OpenAI API
  const fetchFestivalGreeting = async () => {
    // Check cache first (cache for the day)
    const cacheKey = `festival_${new Date().toDateString()}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        setFestivalData(cachedData);
        return cachedData;
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    setFestivalLoading(true);
    try {
      const response = await fetch('/api/widget/chat/festival');
      const data = await response.json();
      
      if (data.success && data.festival) {
        // Cache for the day
        sessionStorage.setItem(cacheKey, JSON.stringify(data.festival));
        setFestivalData(data.festival);
        return data.festival;
      }
    } catch (error) {
      console.error('Error fetching festival:', error);
    } finally {
      setFestivalLoading(false);
    }
    
    return null;
  };

  // Fetch festival on component mount
  useEffect(() => {
    if (userInfo?.name) {
      fetchFestivalGreeting();
    }
  }, [userInfo]);

  // Fetch popular articles for welcome screen
  useEffect(() => {
    const fetchPopularArticles = async () => {
      try {
        const response = await fetch('/api/widget/knowledge-base/articles?limit=4');
        const data = await response.json();
        if (data.success && data.articles) {
          // Sort by views and take top 4
          const sorted = data.articles
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 4);
          setPopularArticles(sorted);
        }
      } catch (error) {
        console.error('Error fetching popular articles:', error);
      }
    };
    fetchPopularArticles();
  }, []);

  // Fetch products for selection dropdown
  const fetchProductsForSelection = async () => {
    try {
      const response = await fetch('/api/widget/tutorials');
      const data = await response.json();
      if (data.success && data.tutorials) {
        // Extract unique products from tutorials
        const uniqueProducts = data.tutorials
          .map(t => t.product)
          .filter((product, index, self) => 
            product && index === self.findIndex(p => p && p.id === product.id)
          );
        setProducts(uniqueProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach((messageId) => {
        const ref = dropdownRefs.current[messageId];
        if (ref && !ref.contains(event.target)) {
          setOpenDropdowns(prev => ({ ...prev, [messageId]: null }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper functions for tutorial preview
  const isYoutubeLink = (url) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  const isGoogleDriveLink = (url) => {
    return url && url.includes('drive.google.com');
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  const getGoogleDriveEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('/file/d/')) {
      const fileId = url.split('/file/d/')[1]?.split('/')[0];
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
    }
    return url;
  };

  // Handle product selection for tutorial
  const handleProductSelection = async (messageId, productId, tutorialType, tutorialTypeLabel) => {
    try {
      // Fetch tutorial for selected product
      const response = await fetch(`/api/widget/tutorials?productId=${productId}`);
      const data = await response.json();
      
      if (data.success && data.tutorial) {
        const link = data.tutorial[tutorialType];
        if (link) {
          // Update the message with the tutorial
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                tutorials: [{
                  tutorialId: data.tutorial.id,
                  productId: productId,
                  productName: data.tutorial.product?.name || 'Unknown Product',
                  tutorialType: tutorialType,
                  tutorialTypeLabel: tutorialTypeLabel,
                  link: link
                }],
                needsProductSelection: false
              };
            }
            return msg;
          }));
        }
      }
      setPendingProductSelection(null);
    } catch (error) {
      console.error('Error fetching tutorial for product:', error);
    }
  };

  // Get first name from user info
  const getFirstName = () => {
    if (userInfo?.firstName) {
      return userInfo.firstName;
    }
    if (userInfo?.name) {
      return userInfo.name.split(' ')[0];
    }
    return 'there';
  };

  // Dynamic greetings array - defined before use
  const getDynamicGreeting = () => {
    const firstName = getFirstName();
    
    // First check for festival from OpenAI
    if (festivalData && festivalData.name) {
      const emoji = festivalData.emoji || '🎉';
      const greeting = festivalData.greeting || `Happy ${festivalData.name}!`;
      return `${greeting} ${firstName}! ${emoji}`;
    }

    // Regular greetings for non-festival days - shorter and using first name only
    const greetings = [
      `Hi ${firstName}! 👋`,
      `Hey ${firstName}! 🌟`,
      `Hello ${firstName}! ✨`,
      `Welcome ${firstName}! 🚀`,
      `Namaste ${firstName}! 🙏`,
    ];
    // Use current date to get a consistent but varied greeting
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return greetings[dayOfYear % greetings.length];
  };

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0 && userInfo) {
      // Wait a bit for festival data to load, then set greeting
      const timer = setTimeout(() => {
        const greeting = userInfo?.name || userInfo?.firstName
          ? getDynamicGreeting()
          : 'Hello there! 👋';
        
        const welcomeMessage = {
          id: 'welcome',
          type: 'bot',
          content: greeting,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }, festivalLoading ? 1000 : 100); // Wait longer if still loading festival

      return () => clearTimeout(timer);
    }
  }, [userInfo, festivalData, festivalLoading]);

  // Function to start a new chat session
  const startNewChat = () => {
    // Refresh festival data for new chat
    fetchFestivalGreeting().then(() => {
      const greeting = userInfo?.name || userInfo?.firstName
        ? getDynamicGreeting()
        : 'Hello there! 👋';
      
      const welcomeMessage = {
        id: 'welcome',
        type: 'bot',
        content: greeting,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setMessageFeedback({});
      setInputValue('');
      setActiveTab('chat');
      // Create new session ID
      setCurrentSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      // Call parent callback if provided
      if (onNewChat) {
        onNewChat();
      }
    });
  };

  // Expose startNewChat to parent via ref
  useImperativeHandle(ref, () => ({
    startNewChat
  }));

  // Load chat history
  useEffect(() => {
    if (activeTab === 'history') {
      const savedHistory = localStorage.getItem('chat-widget-history');
      if (savedHistory) {
        try {
          setChatHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Error loading chat history:', e);
        }
      }
    }
  }, [activeTab]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Call OpenAI API via server-side route
    try {
      // Build conversation history for context
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      // Get first name for personalization
      const firstName = getFirstName();
      
      const response = await fetch('/api/widget/chat/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: conversationHistory,
          userName: firstName || null
        })
      });

      const data = await response.json();

      if (data.success) {
        let botResponse = data.response;
        
        // Clean markdown links from response (remove [text](link) patterns)
        botResponse = botResponse.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        // Remove any remaining markdown link patterns
        botResponse = botResponse.replace(/\[([^\]]+)\]\(insert link\)/gi, '$1');
        botResponse = botResponse.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1');
        
        // Clean markdown formatting (bold, italic, strikethrough, etc.)
        botResponse = botResponse.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold**
        botResponse = botResponse.replace(/\*([^*]+)\*/g, '$1'); // *italic*
        botResponse = botResponse.replace(/__([^_]+)__/g, '$1'); // __bold__
        botResponse = botResponse.replace(/_([^_]+)_/g, '$1'); // _italic_
        botResponse = botResponse.replace(/~~([^~]+)~~/g, '$1'); // ~~strikethrough~~
        botResponse = botResponse.replace(/--([^-]+)--/g, '$1'); // --strikethrough--
        botResponse = botResponse.replace(/`([^`]+)`/g, '$1'); // `code`
        botResponse = botResponse.replace(/#{1,6}\s+/g, ''); // Headers (# ## ### etc.)

        const kbArticles = data.kbArticles || [];
        const tutorials = data.tutorials || [];
        const needsProductSelection = data.needsProductSelection || false;
        const needsCategoryProductSelection = data.needsCategoryProductSelection || false;
        const categoryName = data.categoryName || null;
        const categoryProducts = data.categoryProducts || [];
        const requestedTutorialType = data.requestedTutorialType || null;
        const requestedTutorialTypeLabel = data.requestedTutorialTypeLabel || null;
        console.log('[ChatInterface] Received KB articles:', kbArticles.length, kbArticles);
        console.log('[ChatInterface] Received tutorials:', tutorials.length, tutorials);
        console.log('[ChatInterface] Needs product selection:', needsProductSelection);
        console.log('[ChatInterface] Needs category product selection:', needsCategoryProductSelection, categoryName);

        const botMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: botResponse,
          timestamp: new Date(),
          userMessage: text, // Store user message for feedback context
          kbArticles: kbArticles, // Store KB articles separately
          tutorials: tutorials, // Store tutorials separately
          needsProductSelection: needsProductSelection,
          needsCategoryProductSelection: needsCategoryProductSelection,
          categoryName: categoryName,
          categoryProducts: categoryProducts,
          requestedTutorialType: requestedTutorialType,
          requestedTutorialTypeLabel: requestedTutorialTypeLabel,
        };
        console.log('[ChatInterface] Bot message with KB articles:', botMessage.kbArticles?.length || 0);
        console.log('[ChatInterface] Bot message with tutorials:', botMessage.tutorials?.length || 0);
        
        // If category-based product selection is needed
        if (needsCategoryProductSelection && categoryProducts.length > 0) {
          setPendingProductSelection(botMessage.id);
        } else if (needsProductSelection) {
          // If regular product selection is needed, fetch products and set pending selection
          fetchProductsForSelection();
          setPendingProductSelection(botMessage.id);
        }
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);

        // Save to history - update current session or create new
        const savedHistory = localStorage.getItem('chat-widget-history');
        let history = savedHistory ? JSON.parse(savedHistory) : [];
        
        // Find existing session or create new
        let existingSessionIndex = history.findIndex(s => s.sessionId === currentSessionId);
        
        if (existingSessionIndex === -1) {
          // Create new session
          const newSession = {
            id: currentSessionId,
            sessionId: currentSessionId,
            title: text.substring(0, 50),
            messages: [userMessage, botMessage],
            timestamp: new Date(),
            lastUpdated: new Date(),
          };
          history = [newSession, ...history];
        } else {
          // Update existing session
          history[existingSessionIndex] = {
            ...history[existingSessionIndex],
            title: text.substring(0, 50), // Update title with latest message
            messages: [...history[existingSessionIndex].messages, userMessage, botMessage],
            lastUpdated: new Date(),
          };
        }
        
        // Keep only last 50 sessions
        if (history.length > 50) {
          history = history.slice(0, 50);
        }
        
        setChatHistory(history);
        localStorage.setItem('chat-widget-history', JSON.stringify(history));
      } else {
        // Fallback to KB search if OpenAI fails
        const kbResponse = await fetch(`/api/widget/knowledge-base/articles?search=${encodeURIComponent(text)}&limit=3`);
        const kbData = await kbResponse.json();

        let fallbackResponse = data.message || 'I understand you\'re asking about that. Let me help you.';
        
        if (kbData.success && kbData.articles && kbData.articles.length > 0) {
          const article = kbData.articles[0];
          const contentPreview = article.content
            .replace(/<[^>]*>/g, '')
            .substring(0, 300);
          fallbackResponse = `Based on our knowledge base:\n\n**${article.title}**\n\n${contentPreview}${contentPreview.length >= 300 ? '...' : ''}`;
        }

        const botMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: fallbackResponse,
          timestamp: new Date(),
          userMessage: text, // Store user message for feedback context
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);

        // Save to history - update current session or create new
        const savedHistory = localStorage.getItem('chat-widget-history');
        let history = savedHistory ? JSON.parse(savedHistory) : [];
        
        let existingSessionIndex = history.findIndex(s => s.sessionId === currentSessionId);
        
        if (existingSessionIndex === -1) {
          const newSession = {
            id: currentSessionId,
            sessionId: currentSessionId,
            title: text.substring(0, 50),
            messages: [userMessage, botMessage],
            timestamp: new Date(),
            lastUpdated: new Date(),
          };
          history = [newSession, ...history];
        } else {
          history[existingSessionIndex] = {
            ...history[existingSessionIndex],
            title: text.substring(0, 50),
            messages: [...history[existingSessionIndex].messages, userMessage, botMessage],
            lastUpdated: new Date(),
          };
        }
        
        if (history.length > 50) {
          history = history.slice(0, 50);
        }
        
        setChatHistory(history);
        localStorage.setItem('chat-widget-history', JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      setIsTyping(false);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'I apologize, but I encountered an error. Please try again or contact our support team.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error to history too
      const savedHistory = localStorage.getItem('chat-widget-history');
      let history = savedHistory ? JSON.parse(savedHistory) : [];
      
      let existingSessionIndex = history.findIndex(s => s.sessionId === currentSessionId);
      
      if (existingSessionIndex === -1) {
        const newSession = {
          id: currentSessionId,
          sessionId: currentSessionId,
          title: inputValue.substring(0, 50) || 'Error',
          messages: [userMessage, errorMessage],
          timestamp: new Date(),
          lastUpdated: new Date(),
        };
        history = [newSession, ...history];
      } else {
        history[existingSessionIndex] = {
          ...history[existingSessionIndex],
          messages: [...history[existingSessionIndex].messages, userMessage, errorMessage],
          lastUpdated: new Date(),
        };
      }
      
      if (history.length > 50) {
        history = history.slice(0, 50);
      }
      
      setChatHistory(history);
      localStorage.setItem('chat-widget-history', JSON.stringify(history));
    }
  };

  const handleQuickAction = (action) => {
    handleSendMessage(action.text);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
      setChatHistory([]);
      localStorage.removeItem('chat-widget-history');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleFeedback = async (messageId, rating, feedback = null, userMessage = null, aiResponse = null) => {
    // Update local state immediately
    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: rating
    }));

    // Save feedback to database
    try {
      const response = await fetch('/api/widget/chat/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          sessionId: currentSessionId,
          rating, // 'like' or 'dislike'
          feedback,
          userEmail: userInfo.email,
          userName: userInfo.name,
          userMessage,
          aiResponse,
          category: null
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('Feedback saved successfully');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const handleLike = (messageId, userMessage, aiResponse) => {
    handleFeedback(messageId, 'like', null, userMessage, aiResponse);
  };

  const handleDislike = async (messageId, userMessage, aiResponse) => {
    // Save dislike immediately
    await handleFeedback(messageId, 'dislike', null, userMessage, aiResponse);
    // Then open feedback modal for optional additional feedback
    setShowFeedbackModal({ messageId, rating: 'dislike', userMessage, aiResponse });
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    // If feedback text is provided, update the existing feedback entry
    if (feedbackData.feedback && feedbackData.feedback.trim()) {
      await handleFeedback(
        feedbackData.messageId,
        feedbackData.rating,
        feedbackData.feedback,
        feedbackData.userMessage,
        feedbackData.aiResponse
      );
    }
    setShowFeedbackModal({ messageId: null, rating: null });
  };

  // Handle view changes
  useEffect(() => {
    if (currentView && currentView !== 'chat') {
      setActiveTab('chat'); // Reset to chat tab when viewing other options
    }
  }, [currentView]);

  // Render different views based on currentView prop
  if (currentView === 'knowledge-base') {
    return (
      <KnowledgeBaseView
        userInfo={userInfo}
        onBack={() => onViewChange && onViewChange('menu')}
      />
    );
  }

  if (currentView === 'tutorials') {
    return (
      <TutorialsView
        userInfo={userInfo}
        onBack={() => onViewChange && onViewChange('menu')}
      />
    );
  }

  if (currentView === 'schedule-callback') {
    return (
      <ScheduleCallbackView
        userInfo={userInfo}
        onBack={() => onViewChange && onViewChange('menu')}
      />
    );
  }

  if (currentView === 'tickets') {
    return (
      <TicketsView
        userInfo={userInfo}
        onBack={() => onViewChange && onViewChange('menu')}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-1 sm:space-x-1.5">
            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Chat</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-1 sm:space-x-1.5">
            <History className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>History</span>
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col">
            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4"
            >
              {messages.length === 1 && messages[0].id === 'welcome' ? (
                <div className="flex flex-col h-full overflow-y-auto">
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    {/* Logo/Icon */}
                    <div className="w-20 h-20 flex items-center justify-center">
                      <img 
                        src="/widget_sparkel.svg" 
                        alt="WZATCO" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Greeting */}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {messages[0].content}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">How can we help you today?</p>
                    </div>

                    {/* Search Bar */}
                    <div className="w-full max-w-md mx-auto px-3 sm:px-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim()) {
                              handleQuickAction({ text: searchQuery.trim() });
                              setSearchQuery('');
                            }
                          }}
                          placeholder="Search articles or ask a question..."
                          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 focus:border-transparent text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="w-full max-w-md mx-auto px-3 sm:px-4 space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quick Actions:</p>
                      {quickActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                          className="w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors group border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center space-x-2">
                            <ArrowUpRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-pink-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{action.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Popular Articles Section */}
                  {popularArticles.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <div className="flex items-center space-x-2 mb-3 px-4">
                        <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Popular Articles</h4>
                      </div>
                      <div className="space-y-2 px-4 pb-4">
                        {popularArticles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => {
                              window.open(`/knowledge-base/${article.slug}`, '_blank');
                            }}
                            className="w-full p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-md dark:hover:shadow-purple-500/20 transition-all text-left group"
                          >
                            <div className="flex items-start space-x-2">
                              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-pink-400 transition-colors line-clamp-1">
                                  {article.title}
                                </h4>
                                <div className="flex items-center space-x-3 mt-1">
                                  {article.views > 0 && (
                                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                      <Eye className="w-3 h-3" />
                                      <span>{article.views}</span>
                                    </div>
                                  )}
                                  {article.category && (
                                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                      {article.category.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowUpRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-pink-400 transition-colors flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Helpful Tips */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 px-4 pb-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Tips</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        💡 Try asking specific questions like "How to clean projector lens?" for better results
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                        📚 Browse our Knowledge Base for detailed guides and tutorials
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const userMessage = index > 0 && messages[index - 1].type === 'user' 
                      ? messages[index - 1].content 
                      : message.userMessage;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] sm:max-w-[80%] ${message.type === 'user' ? '' : 'flex flex-col'}`}>
                          <div
                            className={`rounded-lg px-3 py-2 ${
                              message.type === 'user'
                                ? 'bg-purple-600 dark:bg-purple-700 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <span className={`text-[10px] mt-1 block ${
                              message.type === 'user' ? 'text-purple-100 dark:text-purple-200' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          
                          {/* Knowledge Base Articles Cards */}
                          {message.type === 'bot' && message.kbArticles && message.kbArticles.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium text-gray-600 mb-2">Related Articles:</p>
                              {message.kbArticles.map((article) => (
                                <button
                                  key={article.id || article.slug}
                                  onClick={() => {
                                    // Open article in new tab
                                    const articleUrl = `/knowledge-base/${article.slug || article.id}`;
                                    window.open(articleUrl, '_blank');
                                  }}
                                  className="w-full p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-md dark:hover:shadow-purple-500/20 transition-all text-left group"
                                >
                                  <div className="flex items-start space-x-2">
                                    <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-pink-400 transition-colors">
                                        {article.title}
                                      </h4>
                                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">View Article →</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Category-based Product Selection Dropdown */}
                          {message.type === 'bot' && message.needsCategoryProductSelection && pendingProductSelection === message.id && (
                            <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                "{message.categoryName}" is a product category, not a specific product.
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                Please select a product from the {message.categoryName} category to view the {message.requestedTutorialTypeLabel || 'tutorial'}:
                              </p>
                              <div className="relative" ref={(el) => { if (el) dropdownRefs.current[message.id] = el; }}>
                                <button
                                  type="button"
                                  onClick={() => setOpenDropdowns(prev => ({ ...prev, [message.id]: prev[message.id] === 'category' ? null : 'category' }))}
                                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 flex items-center justify-between transition-all hover:border-purple-400 dark:hover:border-pink-500 text-sm"
                                >
                                  <span className="text-gray-400 dark:text-gray-500">Select a product...</span>
                                  <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${openDropdowns[message.id] === 'category' ? 'transform rotate-180' : ''}`} />
                                </button>
                                
                                {openDropdowns[message.id] === 'category' && (
                                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <button
                                      type="button"
                                      onClick={() => setOpenDropdowns(prev => ({ ...prev, [message.id]: null }))}
                                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500"
                                    >
                                      <span>Select a product...</span>
                                    </button>
                                    {message.categoryProducts?.map((product) => (
                                      <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                          handleProductSelection(
                                            message.id,
                                            product.id,
                                            message.requestedTutorialType,
                                            message.requestedTutorialTypeLabel
                                          );
                                          setOpenDropdowns(prev => ({ ...prev, [message.id]: null }));
                                        }}
                                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white"
                                      >
                                        <span>{product.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Regular Product Selection Dropdown */}
                          {message.type === 'bot' && message.needsProductSelection && !message.needsCategoryProductSelection && pendingProductSelection === message.id && (
                            <div className="mt-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                Please select a product to view the {message.requestedTutorialTypeLabel || 'tutorial'}:
                              </p>
                              <div className="relative" ref={(el) => { if (el) dropdownRefs.current[message.id] = el; }}>
                                <button
                                  type="button"
                                  onClick={() => setOpenDropdowns(prev => ({ ...prev, [message.id]: prev[message.id] === 'regular' ? null : 'regular' }))}
                                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 flex items-center justify-between transition-all hover:border-purple-400 dark:hover:border-pink-500 text-sm"
                                >
                                  <span className="text-gray-400 dark:text-gray-500">Select a product...</span>
                                  <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${openDropdowns[message.id] === 'regular' ? 'transform rotate-180' : ''}`} />
                                </button>
                                
                                {openDropdowns[message.id] === 'regular' && (
                                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <button
                                      type="button"
                                      onClick={() => setOpenDropdowns(prev => ({ ...prev, [message.id]: null }))}
                                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500"
                                    >
                                      <span>Select a product...</span>
                                    </button>
                                    {products.map((product) => (
                                      <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                          handleProductSelection(
                                            message.id,
                                            product.id,
                                            message.requestedTutorialType,
                                            message.requestedTutorialTypeLabel
                                          );
                                          setOpenDropdowns(prev => ({ ...prev, [message.id]: null }));
                                        }}
                                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white"
                                      >
                                        <span>{product.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Tutorial Preview (same as TutorialsView) */}
                          {message.type === 'bot' && message.tutorials && message.tutorials.length > 0 && !message.needsProductSelection && (
                            <div className="mt-3 space-y-3">
                              {message.tutorials.map((tutorial, index) => {
                                const getTutorialIcon = () => {
                                  if (tutorial.tutorialType === 'manualLink') {
                                    return <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />;
                                  } else if (tutorial.tutorialType === 'demoVideoLink') {
                                    return <Youtube className="w-4 h-4 text-red-600 dark:text-red-400" />;
                                  } else if (tutorial.tutorialType === 'cleaningVideoLink') {
                                    return <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
                                  }
                                  return <BookOpen className="w-4 h-4 text-purple-600 dark:text-pink-400" />;
                                };

                                const isVideo = isYoutubeLink(tutorial.link) || isGoogleDriveLink(tutorial.link);
                                const embedUrl = isYoutubeLink(tutorial.link) 
                                  ? getYoutubeEmbedUrl(tutorial.link)
                                  : isGoogleDriveLink(tutorial.link)
                                  ? getGoogleDriveEmbedUrl(tutorial.link)
                                  : null;

                                return (
                                  <div key={`${tutorial.tutorialId}-${tutorial.tutorialType}-${index}`} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                                        {getTutorialIcon()}
                                        <span className="ml-2">{tutorial.productName} - {tutorial.tutorialTypeLabel}</span>
                                      </h3>
                                    </div>

                                    {/* Video Preview */}
                                    {isVideo && embedUrl && (
                                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                        <iframe
                                          src={embedUrl}
                                          className="absolute top-0 left-0 w-full h-full rounded-lg"
                                          frameBorder="0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                          title={tutorial.tutorialTypeLabel}
                                        />
                                      </div>
                                    )}

                                    {/* PDF/Document Preview */}
                                    {!isVideo && (
                                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                                        <div className="flex items-center justify-center h-64">
                                          <div className="text-center">
                                            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Document Preview</p>
                                            <button
                                              onClick={() => window.open(tutorial.link, '_blank')}
                                              className="px-4 py-2 bg-purple-600 dark:bg-pink-600 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-pink-700 transition-colors text-sm"
                                            >
                                              Open Document
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* View Full Screen Button */}
                                    <button
                                      onClick={() => window.open(tutorial.link, '_blank')}
                                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center space-x-2"
                                    >
                                      <Play className="w-4 h-4" />
                                      <span>View Full Screen</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Feedback buttons for bot messages */}
                          {message.type === 'bot' && message.id !== 'welcome' && (
                            <div className="flex items-center gap-2 mt-2 px-1">
                              <button
                                onClick={() => handleLike(message.id, userMessage, message.content)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  messageFeedback[message.id] === 'like'
                                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-2 border-purple-300 dark:border-purple-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                }`}
                              >
                                <ThumbsUp className={`w-3.5 h-3.5 ${messageFeedback[message.id] === 'like' ? 'fill-current text-purple-600' : 'text-gray-500'}`} />
                              </button>
                              <button
                                onClick={() => handleDislike(message.id, userMessage, message.content)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  messageFeedback[message.id] === 'dislike'
                                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                }`}
                              >
                                <ThumbsDown className={`w-3.5 h-3.5 ${messageFeedback[message.id] === 'dislike' ? 'fill-current text-red-600' : 'text-gray-500'}`} />
                              </button>
                              {messageFeedback[message.id] === 'dislike' && (
                                <button
                                  onClick={() => setShowFeedbackModal({ 
                                    messageId: message.id, 
                                    rating: 'dislike',
                                    userMessage,
                                    aiResponse: message.content
                                  })}
                                  className="text-xs text-purple-600 hover:text-purple-700 font-medium ml-1"
                                >
                                  Leave feedback
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }
                  }}
                  placeholder="Ask WZATCO anything..."
                  className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                WZATCO AI can make mistakes. Double-check replies.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Clear History Button */}
            {chatHistory.length > 0 && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleClearHistory}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All History</span>
                </button>
              </div>
            )}
            
            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  <History className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No chat history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((conversation) => (
                  <button
                    key={conversation.id || conversation.sessionId}
                    onClick={async () => {
                      // Resume conversation - load all messages and set session ID
                      const loadedMessages = conversation.messages || [];
                      setMessages(loadedMessages);
                      setCurrentSessionId(conversation.sessionId || conversation.id);
                      setActiveTab('chat');
                      
                      // Check if any message needs product selection and restore state
                      const messageNeedingSelection = loadedMessages.find(msg => 
                        msg.type === 'bot' && (msg.needsProductSelection || msg.needsCategoryProductSelection) && !msg.tutorials?.length
                      );
                      if (messageNeedingSelection) {
                        if (messageNeedingSelection.needsCategoryProductSelection) {
                          // Category-based selection - products are already in the message
                          setPendingProductSelection(messageNeedingSelection.id);
                        } else {
                          // Regular product selection - fetch products
                          await fetchProductsForSelection();
                          setPendingProductSelection(messageNeedingSelection.id);
                        }
                      }
                      
                      // Scroll to bottom
                      setTimeout(() => {
                        if (messagesEndRef.current) {
                          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {conversation.title || 'Untitled Conversation'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(conversation.lastUpdated || conversation.timestamp)} • {conversation.messages?.length || 0} messages
                    </p>
                  </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal.messageId !== null}
        onClose={() => setShowFeedbackModal({ messageId: null, rating: null })}
        onSubmit={handleFeedbackSubmit}
        messageId={showFeedbackModal.messageId}
        rating={showFeedbackModal.rating}
        userMessage={showFeedbackModal.userMessage}
        aiResponse={showFeedbackModal.aiResponse}
      />
    </div>
  );
});

export default ChatInterface;

