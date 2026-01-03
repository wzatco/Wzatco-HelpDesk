/**
 * Error Display Component
 * Displays server errors in browser console for cloud hosting environments
 */
import { useEffect } from 'react';

export default function ErrorDisplay() {
  useEffect(() => {
    // Intercept fetch requests to log errors
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch(...args);
        
        // Check if response contains error details
        if (!response.ok) {
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
              console.error('❌ API Error:', {
                url: args[0],
                status: response.status,
                error: data.error || data.message
              });
            }
          } catch (e) {
            // Response is not JSON, log basic error
            console.error('❌ HTTP Error:', {
              url: args[0],
              status: response.status,
              statusText: response.statusText
            });
          }
        }
        
        return response;
      } catch (error) {
        console.error('❌ Fetch Error:', error);
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
            }
          } catch (e) {
            // Not JSON or no error details
          }
        }
      });
      
      return originalXHRSend.call(this, ...args);
    };

    // Global error handler for unhandled errors
    window.addEventListener('error', (event) => {
      console.error('❌ Unhandled Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Global promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Unhandled Promise Rejection:', event.reason);
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

