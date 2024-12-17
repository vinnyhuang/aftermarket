import { Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { useQueryTrpcClient } from './useQueryClient';
import AuthVerify from '../components/Auth/AuthVerify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SignUpPage from '../pages/SignUp';
import LoginPage from '../pages/Login';
import ForgotPasswordPage from '../pages/ForgotPassword';
import GamePage from '../pages/Game';
import AdminPage from '../pages/Admin';
import { Box } from '@chakra-ui/react';

export function App() {
  const { queryClient, trpcClient } = useQueryTrpcClient();
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme="colored"
        hideProgressBar
        closeOnClick
      />
      <QueryClientProvider client={queryClient}>
        <AuthVerify />
        <Routes>
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Box>Not Found</Box>} />
        </Routes>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
