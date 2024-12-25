import { Box, Button, Container, Flex, FormControl, FormLabel, Heading, Image, Input, Link, Stack, Text, VStack, keyframes, Select } from '@chakra-ui/react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { trpc } from '@utils/trpc';
import { toast } from 'react-toastify';
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

const SignUpPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralType, setReferralType] = useState('');
  const [referralName, setReferralName] = useState('');
  const signInMutation = useSignIn();

  const createUserMutation = trpc.users.createUser.useMutation({
    onSuccess: () => {
      signInMutation.mutate({ email, password });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    createUserMutation.mutate({
      email,
      password,
      username,
      name: fullName,
      referralType,
      referralName,
    });
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
                Register
              </Heading>

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <Stack spacing={4}>
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
                      _focus={{ borderColor: 'yellow.500', ring: 2 }}
                      required
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.200">Full Name</FormLabel>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      bg="gray.700"
                      color="white"
                      placeholder="Enter your full name"
                      borderColor="gray.600"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'yellow.500', ring: 2 }}
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
                      placeholder="Confirm your password"
                      borderColor="gray.600"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'yellow.500', ring: 2 }}
                      required
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.200">How did you hear about us?</FormLabel>
                    <Select
                      value={referralType}
                      onChange={(e) => setReferralType(e.target.value)}
                      bg="gray.700"
                      color="white"
                      borderColor="gray.600"
                      _focus={{ borderColor: 'yellow.500', ring: 2 }}
                      required
                    >
                      <option value="">Select an option</option>
                      <option value="friend">Friend</option>
                      <option value="social">Social Media</option>
                      <option value="search">Search Engine</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.200">Referral Name (Optional)</FormLabel>
                    <Input
                      type="text"
                      value={referralName}
                      onChange={(e) => setReferralName(e.target.value)}
                      bg="gray.700"
                      color="white"
                      placeholder="Enter the referral name"
                      borderColor="gray.600"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'yellow.500', ring: 2 }}
                    />
                  </FormControl>

                  <Button type="submit" w="full" sx={gradientButton}>
                    Register
                  </Button>
                </Stack>
              </form>

              <Flex direction="column" align="center" mt={6} gap={2}>
                <Link
                  as={RouterLink}
                  to="/login"
                  color="aliceblue"
                  fontSize="sm"
                  fontWeight="medium"
                  _hover={{ transform: 'scale(1.05)', textDecor: 'none' }}
                  transition="transform 0.2s"
                >
                  Already registered? Move to Login
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

export default SignUpPage;
