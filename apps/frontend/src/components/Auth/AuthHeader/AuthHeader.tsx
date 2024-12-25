import { useGlobalStateStore } from '@GlobalState';
import AuthHeaderUI from './AuthHeaderUI';
import { useLogout } from '@/hooks/useLogout';

const AuthHeader = () => {
  const state = useGlobalStateStore((state) => state);
  const handleLogout = useLogout();

  return <AuthHeaderUI user={state.user} handleSignOut={handleLogout} />;
};

export default AuthHeader;
