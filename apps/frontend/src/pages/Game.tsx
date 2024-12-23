import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  Image,
  Heading,
  Text,
  Button,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  List,
  ListItem,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from '@chakra-ui/react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import logo from '@assets/logo.png';
import { TimeOdds } from '@prisma/client';
import { trpc } from '@/utils/trpc';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const gradientText = {
  bgGradient: 'linear(to-r, #38BDF8, #6EE7B7)',
  bgClip: 'text',
  textTransform: 'uppercase'
};

const calculateTeamPrice = (
  currentWinProb: number | null,
  pregameWinProb: number | null
): number => {
  if (!currentWinProb || !pregameWinProb) return 0;
  return (Number(currentWinProb) / Number(pregameWinProb)) * 100;
};

const GamePage = () => {
  const navigate = useNavigate();
  const [buyAmount, setBuyAmount] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [countdown, setCountdown] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const { isOpen: isBuyOpen, onOpen: onBuyOpen, onClose: onBuyClose } = useDisclosure();
  const { isOpen: isSellOpen, onOpen: onSellOpen, onClose: onSellClose } = useDisclosure();
  const [oddsHistory, setOddsHistory] = useState<TimeOdds[]>([]);
  const { data: activeGame } = trpc.admin.getActiveGame.useQuery();
  const { data: user } = trpc.users.getCurrentUser.useQuery();
  const { data: userGame, refetch: refetchUserGame } = trpc.game.getUserGame.useQuery(
    { userId: user?.id || '', gameId: activeGame?.id || '' },
    { enabled: !!user && !!activeGame }
  );
  const createUserGameMutation = trpc.game.createUserGame.useMutation({
    onSuccess: () => refetchUserGame()
  });
  const { data: positions, refetch: refetchPositions } = trpc.game.getPositions.useQuery(
    { userGameId: userGame?.id || '' },
    { enabled: !!userGame }
  );
  const buyPositionMutation = trpc.game.buyPosition.useMutation({
    onSuccess: () => {
      refetchPositions();
      onBuyClose();
    }
  });

  const sellPositionMutation = trpc.game.sellPosition.useMutation({
    onSuccess: () => {
      refetchPositions();
      onSellClose();
    }
  });

  useEffect(() => {
    if (user && activeGame && !userGame && !isCreatingGame) {
      const createGame = async () => {
        setIsCreatingGame(true);
        try {
          await createUserGameMutation.mutateAsync({
            userId: user.id,
            gameId: activeGame.id
          });
          await refetchUserGame();
          await refetchPositions();
        } finally {
          setIsCreatingGame(false);
        }
      };
      createGame();
    }
  }, [user, activeGame, userGame, createUserGameMutation, refetchUserGame, refetchPositions, isCreatingGame]);

  const activePosition = positions?.find(p => !p.sellAmount && !p.sellPrice);
  const availableBankroll = userGame?.bankroll
    ? Number(userGame.bankroll) -
      (positions?.reduce((sum, pos) => sum + Number(pos.buyAmount), 0) || 0) +
      (positions?.reduce((sum, pos) => sum + (Number(pos.sellAmount) || 0), 0) || 0)
    : 0;

    const maxPayout = Math.max(
      Number(activeGame?.pregameHomePayout || 0),
      Number(activeGame?.pregameAwayPayout || 0)
    );

    const chartData = {
      labels: oddsHistory.map(odds => {
        const date = new Date(odds.time);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/New_York'
        });
      }),
      datasets: [
        {
          label: `${activeGame?.homeTeam} Trade Value`,
          data: oddsHistory.map(odds =>
            calculateTeamPrice(Number(odds.homeWinProb), Number(activeGame?.pregameHomeWinProb || 1))
          ),
          borderColor: '#4caf50',
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4caf50',
        },
        {
          label: `${activeGame?.awayTeam} Trade Value`,
          data: oddsHistory.map(odds =>
            calculateTeamPrice(Number(odds.awayWinProb), Number(activeGame?.pregameAwayWinProb || 1))
          ),
          borderColor: '#ff5722',
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ff5722',
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        y: {
          beginAtZero: true,
          max: maxPayout,
          ticks: {
            callback: function(tickValue: number | string) {
              return `$${tickValue}`;
            },
            color: 'rgb(156, 163, 175)'
          },
          grid: {
            color: 'rgba(75, 85, 99, 0.2)'
          }
        },
        x: {
          ticks: {
            color: 'rgb(156, 163, 175)'
          },
          grid: {
            color: 'rgba(75, 85, 99, 0.2)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: TooltipItem<"line">) {
              return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
            }
          }
        },
        legend: {
          labels: {
            color: 'rgb(156, 163, 175)'
          }
        }
      }
    } as const;

  useEffect(() => {
    if (!activeGame?.commenceTime) return;

    const gameTime = new Date(activeGame.commenceTime);
    const now = new Date();

    if (gameTime <= now) {
      setCountdown('The game has started!');
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      const timeLeft = gameTime.getTime() - now.getTime();

      if (timeLeft <= 0) {
        setCountdown('The game has started!');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeGame]);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'odds_history') {
        setOddsHistory(data.data);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, []);

  const handleBuy = () => {
    if (!userGame || !selectedTeam) return;

    buyPositionMutation.mutate({
      userGameId: userGame.id,
      team: selectedTeam,
      buyAmount: buyAmount,
      buyPrice: selectedTeam === 'home' ? homePrice : awayPrice
    });
  };
  
  const handleSell = (positionId: string) => {
    if (!activePosition) return;

    const sellPrice = activePosition.team === 'home' ? homePrice : awayPrice;
    sellPositionMutation.mutate({
      positionId,
      sellAmount: Number(activePosition.buyAmount) * sellPrice / Number(activePosition.buyPrice),
      sellPrice
    });
  };

  const HeaderButtons = () => (
    <Box position="absolute" top={4} right={4}>
      <Flex gap={2}>
        {user?.role === 'admin' && (
          <Button colorScheme="blue" onClick={() => navigate('/admin')}>
            Admin
          </Button>
        )}
        <Button colorScheme="blue" onClick={() => {
          // TODO: Implement logout logic
          navigate('/login');
        }}>
          Logout
        </Button>
      </Flex>
    </Box>
  );

  const Header = () => (
    <Box textAlign="center" mt={6}>
      <Image src={logo} alt="After Market Logo" boxSize="128px" mx="auto" />
      <Heading sx={gradientText} fontSize="4xl" fontWeight="extrabold">
        After Market Dashboard
      </Heading>
    </Box>
  );

  if (!activeGame) {
    return (
      <Box bgGradient="linear(to-b, gray.900, gray.800, gray.900)" minH="100vh" p={4}>
        <Container maxW="container.xl">
          <HeaderButtons />
          <VStack spacing={8}>
            <Header />
            <Heading size="lg" color="green.400" mt={8}>No Game Scheduled</Heading>
            <Text fontSize="lg" color="gray.300" mt={4}>Please check back later</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  // const hasGameStarted = new Date(activeGame.commenceTime) <= new Date();
  const hasGameStarted = true;

  const latestOdds = oddsHistory[oddsHistory.length - 1];
  const homePrice = calculateTeamPrice(
    Number(latestOdds?.homeWinProb || null),
    Number(activeGame?.pregameHomeWinProb || null)
  );
  const awayPrice = calculateTeamPrice(
    Number(latestOdds?.awayWinProb || null),
    Number(activeGame?.pregameAwayWinProb || null)
  );

  return (
    <Box bgGradient="linear(to-b, gray.900, gray.800, gray.900)" minH="100vh" p={4}>
      <Container maxW="container.xl">
        <HeaderButtons />
        <VStack spacing={8}>
          <Header />
          <Text fontSize="lg" color="gray.300">
            Live Tracking for {activeGame.homeTeam} vs. {activeGame.awayTeam}
          </Text>

          {!hasGameStarted && (
            <Box textAlign="center">
              <Heading size="lg" color="green.400">Countdown to Game</Heading>
              <Text fontSize="lg" color="blue.400">{countdown}</Text>
            </Box>
          )}

          {hasGameStarted && userGame && (
            <>
              <Box textAlign="center" w="full" bg="gray.800" p={6} rounded="lg" mb={4}>
                <Heading size="lg" color="green.400" mb={4}>Pregame Trade Values</Heading>
                <VStack spacing={2}>
                  <Text color="gray.300">
                    Max value from $100 pregame trade on {activeGame.homeTeam}: ${(Number(activeGame.pregameHomePayout || 0)).toFixed(2)}
                  </Text>
                  <Text color="gray.300">
                    Max value from $100 pregame trade on {activeGame.awayTeam}: ${(Number(activeGame.pregameAwayPayout || 0)).toFixed(2)}
                  </Text>
                </VStack>
              </Box>

              <Box textAlign="center" w="full">
                <Heading size="lg" color="green.400">Your Balance</Heading>
                <Text fontSize="2xl" fontWeight="bold" color="blue.400">${availableBankroll}</Text>
              </Box>

              <Box w="full" maxW="3xl" bg="gray.800" p={6} rounded="lg">
                <Heading size="lg" color="green.400" textAlign="center" mb={4}>Live Odds Chart</Heading>
                <Line data={chartData} options={chartOptions} />
              </Box>

              <Box w="full" maxW="3xl" bg="gray.800" p={6} rounded="lg" mb={4}>
                <Heading size="lg" color="green.400" textAlign="center" mb={4}>Current Prices</Heading>
                <Flex justify="space-around">
                  <Text color="gray.300">
                    {activeGame.homeTeam}: ${homePrice.toFixed(2)}
                  </Text>
                  <Text color="gray.300">
                    {activeGame.awayTeam}: ${awayPrice.toFixed(2)}
                  </Text>
                </Flex>
              </Box>

              <Flex gap={4} justifyContent="center">
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={onBuyOpen}
                  isDisabled={!!activePosition}
                >
                  Buy
                </Button>
                <Button
                  colorScheme="red"
                  size="lg"
                  onClick={onSellOpen}
                  isDisabled={!activePosition}
                >
                  Sell
                </Button>
              </Flex>
            </>
          )}

          <Box w="full" bg="gray.800" p={6} rounded="lg">
            <Heading size="lg" color="green.400" mb={4}>Your Positions</Heading>
            {positions && positions.length > 0 ? (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th color="gray.400">Team</Th>
                    <Th color="gray.400">Amount Paid</Th>
                    <Th color="gray.400">Buy Price</Th>
                    <Th color="gray.400">Amount Sold For</Th>
                    <Th color="gray.400">Sell Price</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {positions.map(position => (
                    <Tr key={position.id}>
                      <Td color="white">
                        {position.team === 'home' ? activeGame?.homeTeam : activeGame?.awayTeam}
                      </Td>
                      <Td color="white">${Number(position.buyAmount).toFixed(2)}</Td>
                      <Td color="white">${Number(position.buyPrice).toFixed(2)}</Td>
                      <Td color="white">
                        {position.sellAmount ? `$${Number(position.sellAmount).toFixed(2)}` : '-'}
                      </Td>
                      <Td color="white">
                        {position.sellPrice ? `$${Number(position.sellPrice).toFixed(2)}` : '-'}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <Text color="gray.300">No positions yet</Text>
            )}
          </Box>

          <Box w="full" bg="gray.800" p={6} rounded="lg">
            <Heading size="lg" color="green.400" mb={4}>Game Overview</Heading>
            <VStack align="stretch" spacing={6}>
              <Box>
                <Heading size="md" color="green.400" mb={2}>Prize</Heading>
                <List spacing={2}>
                  <ListItem color="gray.300">• The trader who ends the game with the highest bankroll will win the $500 value prize.</ListItem>
                  <ListItem color="gray.300">• The trader who ends the game with the highest comeback will win the $250 value prize.</ListItem>
                </List>
              </Box>
              <Box>
                <Heading size="md" color="green.400" mb={2}>Rules</Heading>
                <List spacing={2}>
                  <ListItem color="gray.300">• You must have sufficient funds in your bankroll to make a trade.</ListItem>
                  <ListItem color="gray.300">• You can't trade more than once at a time.</ListItem>
                  <ListItem color="gray.300">• You can trade as often as you like, and your order will be executed immediately.</ListItem>
                </List>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </Container>

      <Modal isOpen={isBuyOpen} onClose={onBuyClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader color="blue.400">Buy Position</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                placeholder="Select Team"
                bg="gray.700"
                color="white"
              >
                <option value="home">{activeGame.homeTeam}</option>
                <option value="away">{activeGame.awayTeam}</option>
              </Select>
              {selectedTeam && (
                <Text color="gray.300">
                  Current Price: ${selectedTeam === 'home' ? homePrice.toFixed(2) : awayPrice.toFixed(2)}
                </Text>
              )}
              <Text color="gray.300">Amount: ${buyAmount}</Text>
              <Slider
                value={buyAmount}
                onChange={setBuyAmount}
                min={1}
                max={availableBankroll}
                step={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleBuy}>
              Confirm
            </Button>
            <Button variant="ghost" onClick={onBuyClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isSellOpen} onClose={onSellClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader color="red.400">Sell Position</ModalHeader>
          <ModalBody>
            {activePosition ? (
              <Box p={4} bg="gray.700" rounded="md">
                <Text color="gray.300">
                  Position on {activePosition.team === 'home' ? activeGame?.homeTeam : activeGame?.awayTeam}
                </Text>
                <Text color="gray.300">
                  Amount Paid: ${Number(activePosition.buyAmount).toFixed(2)}
                </Text>
                <Text color="gray.300">
                  Buy Price: ${Number(activePosition.buyPrice).toFixed(2)}
                </Text>
                <Text color="gray.300">
                  Current Price: ${activePosition.team === 'home' ? homePrice.toFixed(2) : awayPrice.toFixed(2)}
                </Text>
                <Text color="gray.300">
                  Amount to Sell For: ${(Number(activePosition.buyAmount) * (activePosition.team === 'home' ? homePrice : awayPrice) / Number(activePosition.buyPrice)).toFixed(2)}
                </Text>
              </Box>
            ) : (
              <Text color="gray.300">No active position to sell.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={() => handleSell(activePosition?.id || '')}>
              Confirm
            </Button>
            <Button variant="ghost" onClick={onSellClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GamePage;
