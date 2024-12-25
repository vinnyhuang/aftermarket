import { Box, Button, Container, Flex, FormControl, FormLabel, Heading, Image, Input, Link, Stack, Text, VStack, keyframes } from '@chakra-ui/react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import logo from '@assets/logo.png';
import { useSignIn } from '@/hooks/useSignIn';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signInMutation = useSignIn();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signInMutation.mutate({ email, password });
  };

  return (
    <Box bgGradient="linear(to-b, gray.900, gray.800, gray.900)" minH="100vh">
      <Container maxW="container.md" pt={8}>
        <VStack spacing={8}>
          <Box mb={6}>
            <Image src={logo} alt="AfterMarket Logo" boxSize="128px" objectFit="contain" />
          </Box>

          <VStack spacing={2} textAlign="center" mb={8}>
            <Heading
              fontSize="4xl"
              fontWeight="extrabold"
              sx={gradientText}
              animation={`${pulseAnimation} 2s infinite`}
            >
              AfterMarket
            </Heading>
            <Text fontSize="lg" color="gray.300">
              Experience the ultimate live trading simulation!
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
            &copy; 2024 AfterMarket. All rights reserved.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
};

export default LoginPage;
