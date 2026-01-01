import React from 'react';

/**
 * Formats message content by converting URLs to clickable links
 * @param {string} text - The message text to format
 * @returns {Array} Array of React elements (text nodes and anchor tags)
 */
export function formatMessageContent(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Regex to match URLs (http, https, www, or plain domain)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Process the URL
    let url = match[0];
    let displayUrl = url;

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Truncate display URL if too long
    if (displayUrl.length > 50) {
      displayUrl = displayUrl.substring(0, 47) + '...';
    }

    // Add the link element
    parts.push(
      React.createElement(
        'a',
        {
          key: match.index,
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-blue-600 dark:text-blue-400 hover:underline break-all',
          onClick: (e) => {
            e.stopPropagation();
          }
        },
        displayUrl
      )
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no URLs found, return the original text
  if (parts.length === 0) {
    return text;
  }

  return parts;
}

