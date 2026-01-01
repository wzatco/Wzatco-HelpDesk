/**
 * Block Renderer Utility
 * Converts Block Builder JSON to HTML and plain text
 */

/**
 * Renders blocks JSON to HTML
 * @param {string} jsonContent - JSON string of blocks array
 * @returns {string} - HTML string
 */
export function renderBlocksToHtml(jsonContent) {
  if (!jsonContent) return '';
  
  try {
    // Parse JSON if it's a string
    let blocks;
    if (typeof jsonContent === 'string') {
      // Check if it looks like JSON
      if (jsonContent.trim().startsWith('[') || jsonContent.trim().startsWith('{')) {
        blocks = JSON.parse(jsonContent);
      } else {
        // Not JSON, return as-is
        return jsonContent;
      }
    } else if (Array.isArray(jsonContent)) {
      blocks = jsonContent;
    } else {
      // Not blocks format, return as-is
      return jsonContent;
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return '';
    }

    const htmlParts = blocks.map(block => {
      if (!block || !block.type) return '';

      const { type, data = {}, styles = {} } = block;

      // Build style string from styles object
      const buildStyleString = (styleObj) => {
        const styleParts = [];
        if (styleObj.fontSize) styleParts.push(`font-size: ${styleObj.fontSize}`);
        if (styleObj.fontWeight) styleParts.push(`font-weight: ${styleObj.fontWeight}`);
        if (styleObj.color) styleParts.push(`color: ${styleObj.color}`);
        if (styleObj.textAlign) styleParts.push(`text-align: ${styleObj.textAlign}`);
        if (styleObj.lineHeight) styleParts.push(`line-height: ${styleObj.lineHeight}`);
        if (styleObj.marginTop) styleParts.push(`margin-top: ${styleObj.marginTop}`);
        if (styleObj.marginBottom) styleParts.push(`margin-bottom: ${styleObj.marginBottom}`);
        if (styleObj.marginLeft) styleParts.push(`margin-left: ${styleObj.marginLeft}`);
        if (styleObj.marginRight) styleParts.push(`margin-right: ${styleObj.marginRight}`);
        if (styleObj.padding) styleParts.push(`padding: ${styleObj.padding}`);
        if (styleObj.width) styleParts.push(`width: ${styleObj.width}`);
        if (styleObj.borderRadius) styleParts.push(`border-radius: ${styleObj.borderRadius}`);
        if (styleObj.borderColor) styleParts.push(`border-color: ${styleObj.borderColor}`);
        if (styleObj.borderWidth) styleParts.push(`border-width: ${styleObj.borderWidth}`);
        return styleParts.length > 0 ? styleParts.join('; ') : '';
      };

      const styleStr = buildStyleString(styles);

      switch (type) {
        case 'heading':
          const level = data.level || 1;
          const headingText = data.text || 'Heading';
          return `<h${level}${styleStr ? ` style="${styleStr}"` : ''}>${escapeHtml(headingText)}</h${level}>`;

        case 'text':
          const textContent = data.content || 'Enter your text here...';
          return `<p${styleStr ? ` style="${styleStr}"` : ''}>${escapeHtml(textContent)}</p>`;

        case 'image':
          const imageUrl = data.url || '';
          const imageAlt = data.alt || '';
          const imageCaption = data.caption || '';
          let imageHtml = '';
          
          if (imageUrl) {
            imageHtml = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}"${styleStr ? ` style="${styleStr}"` : ''} />`;
            if (imageCaption) {
              imageHtml += `<p class="text-sm italic text-slate-500 dark:text-slate-400 mt-2 text-center">${escapeHtml(imageCaption)}</p>`;
            }
          } else {
            imageHtml = `<div class="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center text-slate-400">Image Block</div>`;
          }
          return `<div${styleStr ? ` style="${styleStr}"` : ''}>${imageHtml}</div>`;

        case 'list':
          const items = data.items || [];
          const isOrdered = data.ordered || false;
          const listTag = isOrdered ? 'ol' : 'ul';
          const listItems = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
          return `<${listTag}${styleStr ? ` style="${styleStr}"` : ''}>${listItems}</${listTag}>`;

        case 'quote':
          const quoteText = data.text || 'Quote text';
          const quoteAuthor = data.author || '';
          let quoteHtml = `<blockquote${styleStr ? ` style="${styleStr}"` : ''}>${escapeHtml(quoteText)}</blockquote>`;
          if (quoteAuthor) {
            quoteHtml += `<cite class="block text-sm text-slate-500 dark:text-slate-400 mt-2">— ${escapeHtml(quoteAuthor)}</cite>`;
          }
          return quoteHtml;

        case 'divider':
          return `<hr${styleStr ? ` style="${styleStr}"` : ''} />`;

        case 'button':
          const buttonText = data.text || 'Click Me';
          const buttonUrl = data.url || '#';
          const buttonStyle = data.style || 'primary';
          const buttonClass = buttonStyle === 'primary' 
            ? 'px-6 py-3 rounded-lg font-semibold bg-violet-600 hover:bg-violet-700 text-white'
            : buttonStyle === 'secondary'
            ? 'px-6 py-3 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white'
            : 'px-6 py-3 rounded-lg font-semibold border-2 border-violet-600 text-violet-600 hover:bg-violet-50 dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-900/20';
          return `<div${styleStr ? ` style="${styleStr}"` : ''}><a href="${escapeHtml(buttonUrl)}" class="${buttonClass}">${escapeHtml(buttonText)}</a></div>`;

        default:
          return '';
      }
    });

    return htmlParts.join('\n');
  } catch (error) {
    console.error('Error rendering blocks to HTML:', error);
    // If parsing fails, return the original content
    return typeof jsonContent === 'string' ? jsonContent : '';
  }
}

/**
 * Extracts plain text from blocks JSON
 * @param {string} jsonContent - JSON string of blocks array
 * @returns {string} - Plain text string
 */
export function blocksToPlainText(jsonContent) {
  if (!jsonContent) return '';
  
  try {
    // Parse JSON if it's a string
    let blocks;
    if (typeof jsonContent === 'string') {
      const trimmed = jsonContent.trim();
      // Check if it looks like JSON
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // Validate JSON structure before parsing
        // Check if it's a complete JSON array/object (basic validation)
        if (trimmed.startsWith('[')) {
          // For arrays, check if it's properly closed
          const openBrackets = (trimmed.match(/\[/g) || []).length;
          const closeBrackets = (trimmed.match(/\]/g) || []).length;
          // If brackets don't match, it's likely truncated - don't parse
          if (openBrackets !== closeBrackets) {
            // Truncated JSON, return as plain text (strip HTML if present)
            return jsonContent.replace(/<[^>]*>/g, '').trim();
          }
        } else if (trimmed.startsWith('{')) {
          // For objects, check if it's properly closed
          const openBraces = (trimmed.match(/\{/g) || []).length;
          const closeBraces = (trimmed.match(/\}/g) || []).length;
          // If braces don't match, it's likely truncated - don't parse
          if (openBraces !== closeBraces) {
            // Truncated JSON, return as plain text (strip HTML if present)
            return jsonContent.replace(/<[^>]*>/g, '').trim();
          }
        }
        
        // Try to parse - if it fails, the catch block will handle it
        blocks = JSON.parse(jsonContent);
      } else {
        // Not JSON, return as plain text (strip HTML if present)
        return jsonContent.replace(/<[^>]*>/g, '').trim();
      }
    } else if (Array.isArray(jsonContent)) {
      blocks = jsonContent;
    } else {
      // Not blocks format, return as plain text (strip HTML if present)
      return typeof jsonContent === 'string' ? jsonContent.replace(/<[^>]*>/g, '').trim() : String(jsonContent);
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return '';
    }

    const textParts = blocks.map(block => {
      if (!block || !block.type) return '';

      const { type, data = {} } = block;

      switch (type) {
        case 'heading':
          return data.text || '';

        case 'text':
          return data.content || '';

        case 'image':
          const parts = [];
          if (data.alt) parts.push(data.alt);
          if (data.caption) parts.push(data.caption);
          return parts.join(' ');

        case 'list':
          const items = data.items || [];
          return items.join('\n');

        case 'quote':
          const parts2 = [];
          if (data.text) parts2.push(data.text);
          if (data.author) parts2.push(`— ${data.author}`);
          return parts2.join(' ');

        case 'divider':
          return '---';

        case 'button':
          return data.text || '';

        default:
          return '';
      }
    }).filter(text => text.trim().length > 0);

    return textParts.join('\n\n');
  } catch (error) {
    console.error('Error extracting plain text from blocks:', error);
    // If parsing fails, return the original content stripped of HTML
    return typeof jsonContent === 'string' ? jsonContent.replace(/<[^>]*>/g, '').trim() : '';
  }
}

/**
 * Helper function to escape HTML
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return String(text);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Checks if content is blocks format
 * @param {string} content - Content to check
 * @param {string} contentType - Content type from article
 * @returns {boolean} - True if content is blocks format
 */
export function isBlocksContent(content, contentType) {
  if (contentType === 'blocks') return true;
  if (!content) return false;
  
  // Check if content looks like JSON blocks array
  const trimmed = typeof content === 'string' ? content.trim() : '';
  if (trimmed.startsWith('[') && trimmed.includes('"type"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) && parsed.length > 0 && parsed[0].type;
    } catch {
      return false;
    }
  }
  
  return false;
}

