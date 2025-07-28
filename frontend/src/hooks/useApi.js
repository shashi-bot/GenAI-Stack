import { useState, useCallback, useRef } from 'react';
import { authService } from '../services/authService';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      showSuccessMessage = false,
      successMessage = 'Operation completed successfully',
      retries = 0,
      timeout = 30000 // 30 seconds default timeout
    } = options;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    let attempt = 0;
    const maxAttempts = retries + 1;

    while (attempt < maxAttempts) {
      try {
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }, timeout);

        const result = await apiCall(signal);
        
        clearTimeout(timeoutId);
        
        if (onSuccess) {
          onSuccess(result);
        }

        if (showSuccessMessage) {
          console.log(successMessage);
          // Replace with toast notification system if needed
        }

        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        
        if (signal.aborted) {
          console.log('Request was cancelled');
          return null;
        }

        attempt++;
        
        if (attempt >= maxAttempts) {
          let errorMessage = 'An unexpected error occurred';
          let errorCode = 'UNKNOWN_ERROR';

          if (err.response) {
            errorCode = `API_ERROR_${err.response.status}`;
            
            if (err.response.status === 401) {
              authService.logout();
              errorMessage = 'Session expired. Please log in again.';
            } else if (err.response.data?.detail) {
              if (typeof err.response.data.detail === 'string') {
                errorMessage = err.response.data.detail;
              } else if (Array.isArray(err.response.data.detail)) {
                errorMessage = err.response.data.detail.map(d => d.msg || d).join(', ');
              }
            } else if (err.response.data?.message) {
              errorMessage = err.response.data.message;
            } else {
              errorMessage = `Server error: ${err.response.status}`;
            }
          } else if (err.request) {
            errorCode = 'NETWORK_ERROR';
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
          } else if (err.name === 'AbortError') {
            errorCode = 'TIMEOUT_ERROR';
            errorMessage = 'Request timed out. Please try again.';
          } else {
            errorMessage = err.message || errorMessage;
          }

          const errorObj = {
            message: errorMessage,
            code: errorCode,
            originalError: err
          };

          setError(errorObj);
          
          if (onError) {
            onError(errorObj);
          }

          console.error('API Error:', errorObj);
          throw errorObj;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } finally {
        if (attempt >= maxAttempts) {
          setLoading(false);
        }
      }
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    execute,
    cancel,
    reset,
    setError
  };
};