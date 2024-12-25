import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Leaderboard, LeaderboardEntry } from '@/components/Leaderboard/Leaderboard';
import { toast } from 'react-toastify';
import { useLogout } from '@/hooks/useLogout';

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

const Header = () => (
  <Box textAlign="center" mt={6}>
    <Image src={logo} alt="AfterMarket Logo" boxSize="128px" mx="auto" />
    <Heading sx={gradientText} fontSize="4xl" fontWeight="extrabold">
      The AfterMarket Game
    </Heading>
  </Box>
);

const calculateTeamPrice = (
  currentWinProb: number | null,
  pregameWinProb: number | null
): number => {
  if (!currentWinProb || !pregameWinProb) return 0;
  return (Number(currentWinProb) / Number(pregameWinProb)) * 100;
};

const GamePage = () => {
  const navigate = useNavigate();
  const [oddsHistory, setOddsHistory] = useState<TimeOdds[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdown, setCountdown] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [buyAmount, setBuyAmount] = useState(1);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isConnectedWS, setIsConnectedWS] = useState(false);
  const [lastUpdateTimeWS, setLastUpdateTimeWS] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const { isOpen: isBuyOpen, onOpen: onBuyOpen, onClose: onBuyClose } = useDisclosure();
  const { isOpen: isSellOpen, onOpen: onSellOpen, onClose: onSellClose } = useDisclosure();
  const logout = useLogout();
  const { data: activeGame, refetch: refetchActiveGame } = trpc.admin.getActiveGame.useQuery();
  const { data: user } = trpc.users.getCurrentUser.useQuery();
  const { data: userGame, refetch: refetchUserGame, isLoading: isLoadingUserGame } = trpc.game.getUserGame.useQuery(
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

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
  
    const wsUrl = import.meta.env.VITE_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
  
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnectedWS(true);
      
      // Start ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
          setLastPingTime(Date.now());
        }
      }, 15000); // Send ping every 15 seconds
    };
  
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnectedWS(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        console.log(`[${new Date().toISOString()}] Received pong response`);
        setLastPingTime(Date.now());
      } else if (data.type === 'odds_history') {
        setOddsHistory(data.data);
        setLastUpdateTimeWS(Date.now());
      } else if (data.type === 'leaderboard_update') {
        setLeaderboard(data.data);
      } else if (data.type === 'game_end') {
        refetchActiveGame();
      }
    };
  
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnectedWS(false);
    };
  }, [refetchActiveGame]);

  // Initial connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const checkConnection = () => {
      const now = Date.now();
      const isStale = lastUpdateTimeWS && now - lastUpdateTimeWS > 30000;
      const pingTimeout = lastPingTime && now - lastPingTime > 45000;
  
      if (!isConnectedWS || isStale || pingTimeout) {
        if (wsRef.current) {
          wsRef.current.close();
        }
        connectWebSocket();
      }
    };
  
    const intervalId = setInterval(checkConnection, 5000);
    return () => clearInterval(intervalId);
  }, [isConnectedWS, lastUpdateTimeWS, lastPingTime, connectWebSocket]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if connection is stale (no updates in last 30 seconds)
        const isStale = lastUpdateTimeWS && Date.now() - lastUpdateTimeWS > 30000;
        
        if (!isConnectedWS || isStale) {
          if (wsRef.current) {
            wsRef.current.close();
          }
          connectWebSocket();
          toast.info('Reconnecting to server...');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnectedWS, lastUpdateTimeWS, connectWebSocket]);

  useEffect(() => {
    if (user && activeGame && !userGame && !isCreatingGame && !isLoadingUserGame) {
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
  }, [user, activeGame, userGame, createUserGameMutation, refetchUserGame, refetchPositions, isLoadingUserGame, isCreatingGame]);

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

  const homePriceHistory = useMemo(() => 
    oddsHistory.map(odds =>
      calculateTeamPrice(Number(odds.homeWinProb), Number(activeGame?.pregameHomeWinProb || 1))
    ), [oddsHistory, activeGame?.pregameHomeWinProb]
  );

  const awayPriceHistory = useMemo(() =>
    oddsHistory.map(odds =>
      calculateTeamPrice(Number(odds.awayWinProb), Number(activeGame?.pregameAwayWinProb || 1))
    ), [oddsHistory, activeGame?.pregameAwayWinProb]
  );

  const maxY = useMemo(() => 
    Math.ceil(Math.max(...homePriceHistory, ...awayPriceHistory) / 10) * 10,
    [homePriceHistory, awayPriceHistory]
  );

  const HeaderButtons = () => (
    <Box position="absolute" top={4} right={4}>
      <Flex gap={2}>
        {user?.role === 'admin' && (
          <Button colorScheme="blue" onClick={() => navigate('/admin')}>
            Admin
          </Button>
        )}
        <Button colorScheme="blue" onClick={() => {
          if (wsRef.current) {
            wsRef.current.close();
          }
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          logout();
        }}>
          Logout
        </Button>
      </Flex>
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

  const activePosition = positions?.find(p => !p.sellAmount && !p.sellPrice);
  const availableBankroll = userGame?.bankroll
    ? Number((Number(userGame.bankroll) -
      (positions?.reduce((sum, pos) => sum + Number(pos.buyAmount), 0) || 0) +
      (positions?.reduce((sum, pos) => sum + (Number(pos.sellAmount) || 0), 0) || 0)).toFixed(2))
    : 0;

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
        data: homePriceHistory,
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
        data: awayPriceHistory,
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
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      y: {
        beginAtZero: true,
        max: maxY,
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

  const handleBuy = () => {
    if (!userGame || !selectedTeam) return;
    
    // Check for stale data
    if (!isConnectedWS) {
      toast.error('Cannot trade: No connection to server');
      return;
    }

    if (!lastUpdateTimeWS || Date.now() - lastUpdateTimeWS > 30000) {
      toast.error('Cannot trade: Market data is stale');
      return;
    }

    buyPositionMutation.mutate({
      userGameId: userGame.id,
      team: selectedTeam,
      buyAmount: buyAmount,
      buyPrice: selectedTeam === 'home' ? homePrice : awayPrice
    });
  };
  
  const handleSell = (positionId: string) => {
    if (!activePosition) return;

    // Check for stale data
    if (!isConnectedWS) {
      toast.error('Cannot trade: No connection to server');
      return;
    }

    if (!lastUpdateTimeWS || Date.now() - lastUpdateTimeWS > 30000) {
      toast.error('Cannot trade: Market data is stale');
      return;
    }

    const sellPrice = activePosition.team === 'home' ? homePrice : awayPrice;
    sellPositionMutation.mutate({
      positionId,
      sellAmount: Number(activePosition.buyAmount) * sellPrice / Number(activePosition.buyPrice),
      sellPrice
    });
  };

  const hasGameStarted = new Date(activeGame.commenceTime) <= new Date();
  const hasGameEnded = activeGame.ended;

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
            Live Trading for {activeGame.homeTeam} vs. {activeGame.awayTeam}
          </Text>

          {!hasGameStarted && (
            <Box textAlign="center">
              <Heading size="lg" color="green.400">Countdown to Game</Heading>
              <Text fontSize="lg" color="blue.400">{countdown}</Text>
            </Box>
          )}

          {hasGameStarted && userGame && (
            <>
              {hasGameEnded && (
                <Box w="full" bg="blue.700" p={4} rounded="lg" textAlign="center">
                  <Text color="white" fontSize="lg" fontWeight="bold">
                    Game has ended. All positions have been settled. Scroll down for the final leaderboard!
                  </Text>
                </Box>
              )}
              <Box textAlign="center" w="full">
                <Heading size="lg" color="green.400">Your Balance</Heading>
                <Text fontSize="2xl" fontWeight="bold" color="blue.400">${availableBankroll}</Text>
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

              <Box w="full" maxW="3xl" bg="gray.800" p={6} rounded="lg">
                <Heading size="lg" color="green.400" textAlign="center" mb={4}>Live Game Chart</Heading>
                <Box h={["300px", "400px"]}>
                  <Line data={chartData} options={chartOptions} />
                </Box>
              </Box>

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

              <Flex gap={4} justifyContent="center">
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={onBuyOpen}
                  isDisabled={!!activePosition || hasGameEnded}
                >
                  Buy
                </Button>
                <Button
                  colorScheme="red"
                  size="lg"
                  onClick={onSellOpen}
                  isDisabled={!activePosition || hasGameEnded}
                >
                  Sell
                </Button>
              </Flex>

              <Box w="full" bg="gray.800" p={6} rounded="lg">
                <Heading size="lg" color="green.400" mb={4}>Your Positions</Heading>
                {positions && positions.length > 0 ? (
                  <Box overflowX="auto">
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
                  </Box>
                ) : (
                  <Text color="gray.300">No positions yet</Text>
                )}
              </Box>
              <Leaderboard entries={leaderboard} />
            </>
          )}

          <Box w="full" bg="gray.800" p={6} rounded="lg">
            <Heading size="lg" color="green.400" mb={4}>The Game</Heading>
            <VStack align="stretch" spacing={6}>
              <Box>
                <Heading size="md" color="green.400" mb={2}>Overview</Heading>
                <List spacing={2}>
                  <ListItem color="gray.300">• Trade positions based on the real-time outcomes of the game!</ListItem>
                  <ListItem color="gray.300">• Treat each team as a stock: a team's current trade value is proportional to its win probability.</ListItem>
                  <ListItem color="gray.300">• The max (post-game) trade value for each team was determined by the pregame win probabilities. Higher pre-game win probability means lesser max value.</ListItem>
                  <ListItem color="gray.300">• Your goal is to maximize your returns over the course of the game.</ListItem>
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
