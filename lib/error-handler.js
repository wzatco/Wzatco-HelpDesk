/**
 * Error Handler Utility
 * Formats errors for browser console display (useful for cloud hosting without server logs)
 */

/**
 * Format error for browser console display
 * @param {Error} error - The error object
 * @param {Object} context - Additional context (route, method, etc.)
 * @returns {Object} Formatted error object
 */
export function formatErrorForBrowser(error, context = {}) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const showDetailedErrors = process.env.SHOW_ERRORS_IN_BROWSER === 'true' || isDevelopment;

  const formatted = {
    message: error.message || 'An error occurred',
    type: error.name || 'Error',
    timestamp: new Date().toISOString(),
    ...context
  };

  // Only include stack trace and detailed info if enabled
  if (showDetailedErrors) {
    formatted.stack = error.stack;
    formatted.details = error.details || {};
    
    // Include additional error properties
    if (error.code) formatted.code = error.code;
    if (error.statusCode) formatted.statusCode = error.statusCode;
    if (error.response) formatted.response = error.response;
  }

  return formatted;
}

/**
 * Send error response with browser console logging
 * @param {Object} res - Express/Next.js response object
 * @param {Error} error - The error object
 * @param {Object} options - Options (statusCode, context, etc.)
 */
export function sendErrorResponse(res, error, options = {}) {
  const {
    statusCode = 500,
    context = {},
    logToConsole = true
  } = options;

  const formattedError = formatErrorForBrowser(error, context);

  // Log to server console
  if (logToConsole) {
    console.error('❌ Server Error:', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }

  // Send response with error details for browser console
  res.status(statusCode).json({
    success: false,
    error: formattedError.message,
    errorType: formattedError.type,
    timestamp: formattedError.timestamp,
    // Include detailed error info for browser console
    _errorDetails: formattedError, // Prefixed with _ to indicate internal use
    // Include a script tag that will log to browser console
    _consoleLog: `
      console.group('%c❌ Server Error', 'color: red; font-weight: bold; font-size: 14px;');
      console.error('Message:', ${JSON.stringify(formattedError.message)});
      console.error('Type:', ${JSON.stringify(formattedError.type)});
      console.error('Timestamp:', ${JSON.stringify(formattedError.timestamp)});
      ${formattedError.stack ? `console.error('Stack:', ${JSON.stringify(formattedError.stack)});` : ''}
      ${Object.keys(context).length > 0 ? `console.error('Context:', ${JSON.stringify(context)});` : ''}
      console.groupEnd();
    `
  });
}

/**
 * Wrap API handler with error handling
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const context = {
        route: req.url,
        method: req.method,
        query: req.query,
        body: req.body ? (typeof req.body === 'object' ? Object.keys(req.body) : 'present') : undefined
      };

      sendErrorResponse(res, error, {
        statusCode: error.statusCode || 500,
        context
      });
    }
  };
}

