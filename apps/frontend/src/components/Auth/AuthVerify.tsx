import { useGlobalStateStore } from '@GlobalState';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

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
          localStorage.removeItem('user');
          toast.warning('Your token expired');
          state.signOut();
        }
      }
    } catch (error) {
      console.error('Error checking token:', error);
    }
  }, [location, state]);

  return null;
};

export default AuthVerify;
