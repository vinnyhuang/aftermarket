import { Box, Button, Container, Flex, FormControl, FormLabel, Heading, Image, Input, Link, Stack, Text, VStack, keyframes } from '@chakra-ui/react';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { trpc } from '@utils/trpc';
import { toast } from 'react-toastify';
import logo from '@assets/logo.png';

const pulseAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const gradientText = {
  bgGradient: 'linear(to-r, #38BDF8, #6EE7B7)',
  bgClip: 'text',
  textTransform: 'uppercase'
};

const gradientButton = {
  bgGradient: 'linear(to-r, #38BDF8, #6EE7B7)',
  color: 'white',
  fontWeight: 'bold',
  _hover: {
    bgGradient: 'linear(to-r, #6EE7B7, #38BDF8)',
    transform: 'scale(1.05)'
  },
  transition: 'transform 0.2s'
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess: async ({ accessToken, email, role }) => {
      try {
        localStorage.setItem('token', accessToken);
        const avatarUrl = 'https://images.unsplash.com/photo-1619946794135-5bc917a27793?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&fit=crop&h=200&w=200&s=b616b2c5b373a80ffc9636ba24f7a4a9';
        const user = {
          username: email,
          role: role,
          avatarUrl,
        };
        localStorage.setItem('user', JSON.stringify({ ...user, accessToken }));
        toast.success('Login successful!');
        await new Promise(resolve => setTimeout(resolve, 0)); // Let the storage operations complete
        navigate('/game');
      } catch (error) {
        toast.error('Error during login');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signInMutation.mutate({ email, password });
  };

  return (
    <Box bgGradient="linear(to-b, gray.900, gray.800, gray.900)" minH="100vh">
      <Container maxW="container.md" pt={8}>
        <VStack spacing={8}>
          <Box mb={6}>
            <Image src={logo} alt="After Market Logo" boxSize="128px" objectFit="contain" />
          </Box>

          <VStack spacing={2} textAlign="center" mb={8}>
            <Heading
              fontSize="4xl"
              fontWeight="extrabold"
              sx={gradientText}
              animation={`${pulseAnimation} 2s infinite`}
            >
              After Market
            </Heading>
            <Text fontSize="lg" color="gray.300">
              Experience the ultimate live trading simulation! v1
            </Text>
          </VStack>

          <Box w="full" maxW="md" bg="gray.800" rounded="lg" shadow="lg" p={6}>
            <VStack spacing={4}>
              <Heading size="lg" sx={gradientText}>
                Login
              </Heading>

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel color="gray.200">Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      bg="gray.700"
                      color="white"
                      placeholder="Enter your email"
                      borderColor="gray.600"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'green.500', ring: 2 }}
                      required
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.200">Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      bg="gray.700"
                      color="white"
                      placeholder="Enter your password"
                      borderColor="gray.600"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'green.500', ring: 2 }}
                    />
                  </FormControl>

                  <Button type="submit" w="full" sx={gradientButton}>
                    Login
                  </Button>
                </Stack>
              </form>

              <Flex direction="column" align="center" mt={6} gap={2}>
                <Link
                  as={RouterLink}
                  to="/sign-up"
                  color="aliceblue"
                  fontSize="sm"
                  fontWeight="medium"
                  _hover={{ transform: 'scale(1.05)', textDecor: 'none' }}
                  transition="transform 0.2s"
                >
                  Don't have an account? Register
                </Link>
                <Link
                  as={RouterLink}
                  to="/forgot-password"
                  color="gray.400"
                  fontSize="sm"
                  _hover={{ color: 'gray.300', transform: 'scale(1.05)', textDecor: 'none' }}
                  transition="transform 0.2s"
                >
                  Forgot your password?
                </Link>
              </Flex>
            </VStack>
          </Box>

          <Text color="white" fontSize="sm" mt={8}>
            &copy; 2024 After Market. All rights reserved.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
};

export default LoginPage;
