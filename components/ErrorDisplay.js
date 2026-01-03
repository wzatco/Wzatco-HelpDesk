/**
 * Error Display Component
 * Displays server errors in browser console for cloud hosting environments
 */
import { useEffect } from 'react';

export default function ErrorDisplay() {
  useEffect(() => {
    // Enhanced logging for 404 errors (common issue with Socket.IO and API routes)
    const log404Error = (url, method = 'GET') => {
      console.group('%c⚠️ 404 Not Found', 'color: orange; font-weight: bold; font-size: 14px;');
      console.error('URL:', url);
      console.error('Method:', method);
      console.error('This usually means:');
      console.error('1. The route doesn\'t exist in the API');
      console.error('2. The server.js custom server might not be running');
      console.error('3. The route path might be incorrect');
      if (url && url.toString().includes('/api/widget/socket')) {
        console.error('⚠️ Socket.IO Route Issue:');
        console.error('   - Ensure server.js is running (not just Next.js dev server)');
        console.error('   - Check that Socket.IO is initialized in server.js');
        console.error('   - Verify the path matches: /api/widget/socket');
        console.error('   - For production, ensure server.js is started with: node server.js');
      }
      console.groupEnd();
    };

    // Intercept fetch requests to log errors
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch(...args);
        
        // Check if response contains error details
        if (!response.ok) {
          // Log 404 errors with enhanced details
          if (response.status === 404) {
            log404Error(args[0], args[1]?.method || 'GET');
          }
          
          try {
            const data = await response.clone().json();
            
            // If response contains _errorDetails, log to console
            if (data._errorDetails) {
              console.group('%c❌ Server Error', 'color: red; font-weight: bold; font-size: 14px;');
              console.error('URL:', args[0]);
              console.error('Status:', response.status, response.statusText);
              console.error('Message:', data._errorDetails.message);
              console.error('Type:', data._errorDetails.type);
              console.error('Timestamp:', data._errorDetails.timestamp);
              
              if (data._errorDetails.stack) {
                console.error('Stack Trace:', data._errorDetails.stack);
              }
              
              if (data._errorDetails.route || data._errorDetails.method) {
                console.error('Context:', {
                  route: data._errorDetails.route,
                  method: data._errorDetails.method,
                  ...data._errorDetails
                });
              }
              
              console.groupEnd();
            } else if (data.error || data.message) {
              // Fallback: log any error message
              console.group('%c❌ API Error', 'color: red; font-weight: bold; font-size: 14px;');
              console.error('URL:', args[0]);
              console.error('Status:', response.status, response.statusText);
              console.error('Error:', data.error || data.message);
              console.groupEnd();
            }
          } catch (e) {
            // Response is not JSON, log basic error (404 already handled above)
            if (response.status !== 404) {
              console.group('%c❌ HTTP Error', 'color: red; font-weight: bold; font-size: 14px;');
              console.error('URL:', args[0]);
              console.error('Status:', response.status, response.statusText);
              console.error('Response might not be JSON');
              console.groupEnd();
            }
          }
        }
        
        return response;
      } catch (error) {
        console.group('%c❌ Fetch Error', 'color: red; font-weight: bold; font-size: 14px;');
        console.error('URL:', args[0]);
        console.error('Error:', error);
        if (error.stack) {
          console.error('Stack Trace:', error.stack);
        }
        console.groupEnd();
        throw error;
      }
    };

    // Intercept XMLHttpRequest errors
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      this._method = method;
      return originalXHROpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('error', function() {
        console.error('❌ XHR Error:', {
          url: this._url,
          method: this._method,
          status: this.status,
          statusText: this.statusText
        });
      });
      
      this.addEventListener('load', function() {
        if (this.status >= 400) {
          // Log 404 errors with enhanced details
          if (this.status === 404) {
            log404Error(this._url, this._method);
          }
          
          try {
            const response = JSON.parse(this.responseText);
            if (response._errorDetails) {
              console.group('%c❌ Server Error (XHR)', 'color: red; font-weight: bold; font-size: 14px;');
              console.error('URL:', this._url);
              console.error('Status:', this.status, this.statusText);
              console.error('Message:', response._errorDetails.message);
              console.error('Type:', response._errorDetails.type);
              if (response._errorDetails.stack) {
                console.error('Stack Trace:', response._errorDetails.stack);
              }
              console.groupEnd();
            } else if (response.error || response.message) {
              console.group('%c❌ API Error (XHR)', 'color: red; font-weight: bold; font-size: 14px;');
              console.error('URL:', this._url);
              console.error('Status:', this.status, this.statusText);
              console.error('Error:', response.error || response.message);
              console.groupEnd();
            }
          } catch (e) {
            // Not JSON or no error details - 404 already handled above
            if (this.status !== 404) {
              console.group('%c❌ HTTP Error (XHR)', 'color: red; font-weight: bold; font-size: 14px;');
              console.error('URL:', this._url);
              console.error('Status:', this.status, this.statusText);
              console.groupEnd();
            }
          }
        }
      });
      
      return originalXHRSend.call(this, ...args);
    };

    // Global error handler for unhandled errors
    window.addEventListener('error', (event) => {
      console.group('%c❌ Unhandled Error', 'color: red; font-weight: bold; font-size: 14px;');
      console.error('Message:', event.message);
      console.error('File:', event.filename);
      console.error('Line:', event.lineno, 'Column:', event.colno);
      if (event.error) {
        console.error('Error Object:', event.error);
        if (event.error.stack) {
          console.error('Stack Trace:', event.error.stack);
        }
      }
      console.groupEnd();
    });

    // Global promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.group('%c❌ Unhandled Promise Rejection', 'color: red; font-weight: bold; font-size: 14px;');
      console.error('Reason:', event.reason);
      if (event.reason && event.reason.stack) {
        console.error('Stack Trace:', event.reason.stack);
      }
      console.groupEnd();
    });


    // Cleanup function
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, []);

  return null; // This component doesn't render anything
}

