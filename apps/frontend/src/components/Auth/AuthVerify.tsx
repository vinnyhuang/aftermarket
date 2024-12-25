import { useGlobalStateStore } from '@GlobalState';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLogout } from '@/hooks/useLogout';

const parseJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

const AuthVerify = () => {
  const location = useLocation();
  const state = useGlobalStateStore((state) => state);
  const initialized = useRef(false);
  const handleLogout = useLogout();

  // Add global axios interceptor for 401 responses
  useEffect(() => {
    const interceptor = (response: Response) => {
      if (response.status === 401) {
        handleLogout();
      }
      return response;
    };

    // Add the interceptor to the global fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      return interceptor(response.clone());
    };

    return () => {
      // Restore original fetch when component unmounts
      window.fetch = originalFetch;
    };
  }, [handleLogout]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user?.accessToken && user?.username && user?.role) {
          state.signIn(user);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [state]);

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    
    try {
      const user = JSON.parse(userJson);
      if (user && user.accessToken) {
        const decodedJwt = parseJwt(user.accessToken);
        if (decodedJwt && decodedJwt.exp * 1000 < Date.now()) {
          handleLogout();
        }
      }
    } catch (error) {
      console.error('Error checking token:', error);
    }
  }, [location, handleLogout]);

  return null;
};

export default AuthVerify;
