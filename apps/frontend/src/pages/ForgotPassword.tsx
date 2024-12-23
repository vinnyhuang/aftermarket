import { Box, Button, Container, FormControl, FormLabel, Heading, Image, Input, Stack, Text, VStack, keyframes } from '@chakra-ui/react';
import { useState } from 'react';
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

const ForgotPasswordPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitted) {
      setIsSubmitted(true);
    } else {
      // Handle password reset submission
    }
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
              Forgot Password
            </Heading>
            <Text fontSize="lg" color="gray.300">
              {isSubmitted ? 'Enter your new password below.' : 'Reset your password to regain access!'}
            </Text>
          </VStack>

          <Box w="full" maxW="md" bg="gray.800" rounded="lg" shadow="lg" p={6}>
            <VStack spacing={4}>
              <Heading size="lg" sx={gradientText}>
                {isSubmitted ? 'Set New Password' : 'Account Verification'}
              </Heading>

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <Stack spacing={4}>
                  {!isSubmitted ? (
                    <FormControl>
                      <FormLabel color="gray.200">Username</FormLabel>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        bg="gray.700"
                        color="white"
                        placeholder="Enter your username"
                        borderColor="gray.600"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{ borderColor: 'yellow.500', ring: 2 }}
                        required
                      />
                    </FormControl>
                  ) : (
                    <>
                      <FormControl>
                        <FormLabel color="gray.200">New Password</FormLabel>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          bg="gray.700"
                          color="white"
                          placeholder="Enter your new password"
                          borderColor="gray.600"
                          _placeholder={{ color: 'gray.400' }}
                          _focus={{ borderColor: 'yellow.500', ring: 2 }}
                          required
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel color="gray.200">Confirm Password</FormLabel>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          bg="gray.700"
                          color="white"
                          placeholder="Confirm your new password"
                          borderColor="gray.600"
                          _placeholder={{ color: 'gray.400' }}
                          _focus={{ borderColor: 'yellow.500', ring: 2 }}
                          required
                        />
                      </FormControl>
                    </>
                  )}

                  <Button type="submit" w="full" sx={gradientButton}>
                    {isSubmitted ? 'Reset Password' : 'Submit'}
                  </Button>
                </Stack>
              </form>
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

export default ForgotPasswordPage;
