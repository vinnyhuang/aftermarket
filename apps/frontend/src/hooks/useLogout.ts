import { useGlobalStateStore } from '@GlobalState';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const useLogout = () => {
  const navigate = useNavigate();
  const state = useGlobalStateStore((state) => state);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    state.signOut();
    toast.info('Signed out');
    navigate('/login');
  };

  return handleLogout;
};