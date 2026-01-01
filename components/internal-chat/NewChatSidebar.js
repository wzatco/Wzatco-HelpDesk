import { useState, useEffect, useMemo } from 'react';
import { Input } from '../ui/input';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import UserAvatar from './UserAvatar';

/**
 * NewChatSidebar Component
 * Displays a searchable list of contacts for starting new chats
 */
export default function NewChatSidebar({ onBack, onSelectUser }) {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/internal/contacts');
        
        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
        }
      } catch (error) {
        // Error fetching contacts
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => {
      const name = contact.name?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }, [contacts, searchQuery]);


  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-gray-200 dark:border-gray-800">
      {/* Header - WhatsApp style green/dark background */}
      <div className="sticky top-0 z-10 h-16 flex items-center px-4 bg-[#008069] dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-white/10 dark:hover:bg-white/10 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-white flex-1">New chat</h2>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#202c33]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-white dark:bg-[#2a3942] border-0 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Loading contacts...</div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {searchQuery ? 'No contacts found' : 'No contacts available'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {searchQuery ? 'Try a different search term' : 'No other users in the system'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredContacts.map((contact) => (
              <button
                key={`${contact.type}-${contact.id}`}
                onClick={() => {
                  if (onSelectUser) {
                    onSelectUser(contact);
                  }
                }}
                className="w-full h-[72px] px-4 text-left transition-colors hover:bg-gray-100 dark:hover:bg-[#202c33] active:bg-gray-200 dark:active:bg-[#2a3942]"
              >
                <div className="flex items-center gap-3 h-full">
                  {/* Avatar */}
                  <UserAvatar
                    name={contact.name || 'Unknown'}
                    src={contact.avatar}
                    size="lg"
                    className="flex-shrink-0"
                  />

                  {/* Name and Role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-black dark:text-white truncate">
                        {contact.name || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {contact.type === 'admin' ? 'Admin' : 'Agent'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

