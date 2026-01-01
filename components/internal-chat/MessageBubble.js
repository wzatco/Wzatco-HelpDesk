import { useState } from 'react';
import UserAvatar from './UserAvatar';

/**
 * MessageBubble Component
 * Renders individual chat messages with link parsing and attachment support
 */
export default function MessageBubble({ message, isOwn, senderName, senderAvatar }) {
  const [imageErrors, setImageErrors] = useState(new Set());

  // Parse URLs in content and convert to clickable links
  const parseLinks = (text) => {
    if (!text) return '';
    
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#027eb5] dark:text-[#53bdeb] hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };


  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file icon based on type
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    return '📎';
  };

  const attachments = message.metadata?.attachments || [];
  const hasAttachments = attachments.length > 0;
  const hasContent = message.content && message.content.trim();

  return (
    <div className={`flex gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar (only show for other person's messages) */}
      {!isOwn && (
        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <UserAvatar
            name={senderName || 'Unknown'}
            src={senderAvatar}
            size="sm"
            className="flex-shrink-0"
          />
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[65%] sm:max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Message Bubble - WhatsApp style */}
        <div
          className={`relative px-3 py-2 ${
            isOwn
              ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg rounded-tr-none self-end text-black dark:text-[#e9edef]'
              : 'bg-white dark:bg-[#202c33] rounded-lg rounded-tl-none self-start text-black dark:text-[#e9edef]'
          }`}
        >
          {/* Text Content */}
          {hasContent && (
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {parseLinks(message.content)}
            </div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className={`mt-2 space-y-2 ${hasContent ? 'pt-2 border-t border-opacity-10 dark:border-opacity-20' : ''}`}>
              {attachments.map((attachment, index) => {
                // Robust check: MIME type OR file extension
                const isImage = attachment.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.name || attachment.url || '');
                const isVideo = attachment.type?.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i.test(attachment.name || attachment.url || '');

                if (isImage) {
                  const imageKey = `${attachment.url}-${index}`;
                  const hasError = imageErrors.has(imageKey);
                  
                  return (
                    <div key={index} className="mb-1 rounded-lg overflow-hidden">
                      {!hasError ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name || 'Image'}
                          className="rounded-lg max-w-full sm:max-w-[300px] max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(attachment.url, '_blank')}
                          onError={() => {
                            setImageErrors(prev => new Set(prev).add(imageKey));
                          }}
                        />
                      ) : (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-3 bg-black/5 dark:bg-white/10 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition-colors max-w-[300px] ${
                            isOwn
                              ? 'bg-gray-100/50 dark:bg-gray-800/50'
                              : 'bg-slate-50 dark:bg-slate-700'
                          }`}
                        >
                          <span className="text-2xl flex-shrink-0">🖼️</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isOwn ? 'text-black dark:text-white' : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {attachment.name || 'Image'}
                            </p>
                            {attachment.size && (
                              <p className={`text-xs ${
                                isOwn ? 'text-gray-600 dark:text-gray-300' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {formatFileSize(attachment.size)}
                              </p>
                            )}
                          </div>
                        </a>
                      )}
                      {attachment.name && !hasError && (
                        <p className={`text-xs mt-1 ${isOwn ? 'text-gray-700 dark:text-gray-200' : 'text-slate-600 dark:text-slate-400'}`}>
                          {attachment.name}
                        </p>
                      )}
                    </div>
                  );
                }

                if (isVideo) {
                  return (
                    <div key={index} className="mb-1 rounded-lg overflow-hidden">
                      <video
                        src={attachment.url}
                        controls
                        className="rounded-lg max-w-full sm:max-w-[300px] max-h-[300px] object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                      {attachment.name && (
                        <p className={`text-xs mt-1 ${isOwn ? 'text-gray-700 dark:text-gray-200' : 'text-slate-600 dark:text-slate-400'}`}>
                          {attachment.name}
                        </p>
                      )}
                    </div>
                  );
                }

                // Fallback to File Card for non-media
                return (
                  <div key={index} className="mb-1">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 bg-black/5 dark:bg-white/10 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition-colors max-w-[300px] ${
                        isOwn
                          ? 'bg-gray-100/50 dark:bg-gray-800/50'
                          : 'bg-slate-50 dark:bg-slate-700'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{getFileIcon(attachment.type || '')}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isOwn ? 'text-black dark:text-white' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {attachment.name || 'Attachment'}
                        </p>
                        {attachment.size && (
                          <p className={`text-xs ${
                            isOwn ? 'text-gray-600 dark:text-gray-300' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {formatFileSize(attachment.size)}
                          </p>
                        )}
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timestamp - Inside bubble bottom-right */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

