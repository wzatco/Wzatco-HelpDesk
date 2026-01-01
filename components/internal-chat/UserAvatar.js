import { useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

/**
 * UserAvatar Component
 * Displays user avatar with initials fallback when image is missing
 * 
 * @param {string} name - User's full name
 * @param {string|null} src - Avatar image URL (optional)
 * @param {string} size - Size variant: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} className - Additional CSS classes
 */
export default function UserAvatar({ name, src, size = 'md', className = '' }) {
  // Generate initials from name
  const initials = useMemo(() => {
    if (!name) return '?';
    
    // Split by space and take first character of first 2 words
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    // If only one word, take first 2 characters
    if (parts[0] && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    // Single character fallback
    return parts[0]?.[0]?.toUpperCase() || '?';
  }, [name]);

  // Size classes mapping
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <Avatar className={`${sizeClass} ${className}`}>
      {src ? (
        <AvatarImage src={src} alt={name || 'User'} />
      ) : null}
      <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

