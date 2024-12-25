import { trpc } from '@utils/trpc';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGlobalStateStore } from '@GlobalState';

export const useSignIn = () => {
  const navigate = useNavigate();
  const state = useGlobalStateStore((state) => state);

  return trpc.auth.signIn.useMutation({
    onSuccess: async ({ accessToken, email, role }) => {
      try {
        localStorage.setItem('token', accessToken);
        const avatarUrl = 'https://images.unsplash.com/photo-1619946794135-5bc917a27793?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&fit=crop&h=200&w=200&s=b616b2c5b373a80ffc9636ba24f7a4a9';
        const user = {
          username: email,
          role: role,
          avatarUrl,
        };
        state.signIn(user);
        localStorage.setItem('user', JSON.stringify({ ...user, accessToken }));
        toast.success('Login successful!');
        await new Promise(resolve => setTimeout(resolve, 0));
        navigate('/game');
      } catch (error) {
        toast.error('Error during login');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
