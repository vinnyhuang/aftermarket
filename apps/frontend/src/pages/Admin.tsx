import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Select,
  Button,
  List,
  ListItem,
  Input,
  Image,
  useToast, 
  HStack
} from '@chakra-ui/react';
import logo from '@assets/logo.png';
import { RouterOutput, trpc } from '@/utils/trpc';
import { useNavigate } from 'react-router-dom';

type Game = RouterOutput['admin']['getAvailableGames'][number];

const gradientText = {
  bgGradient: 'linear(to-r, #38BDF8, #6EE7B7)',
  bgClip: 'text',
  textTransform: 'uppercase'
};

const areGamesEqual = (game1: Game | null | undefined, game2: Game | null | undefined) => {
  if (!game1 || !game2) return false;
  return (
    game1.homeTeam === game2.homeTeam &&
    game1.awayTeam === game2.awayTeam &&
    game1.commenceTime === game2.commenceTime &&
    game1.sportKey === game2.sportKey
  );
};


const AdminPage = () => {
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [setGame, setSetGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const { data: activeGame, refetch: refetchActiveGame } = trpc.admin.getActiveGame.useQuery();
  const { mutate: setActiveGame } = trpc.admin.setActiveGame.useMutation({
    onSuccess: () => {
      toast({
        title: 'Game set successfully',
        status: 'success',
        duration: 3000,
      });
      refetchActiveGame();
    },
    onError: (error) => {
      toast({
        title: 'Error setting game',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  });
  const { mutate: unsetActiveGame } = trpc.admin.unsetActiveGame.useMutation({
    onSuccess: () => {
      toast({
        title: 'Game unset successfully',
        status: 'success', 
        duration: 3000,
      });
      refetchActiveGame();
    },
    onError: (error) => {
      toast({
        title: 'Error unsetting game',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  });

  const { refetch: refetchGames } = trpc.admin.getAvailableGames.useQuery(
    { sportKey: selectedSport, date: selectedDate },
    { enabled: false }
  );

  useEffect(() => {
    if (activeGame) {
      setSetGame(activeGame);
    }
  }, [activeGame]);

  const sportOptions = [
    { key: 'americanfootball_nfl', label: 'NFL' },
    { key: 'americanfootball_ncaaf', label: 'NCAAF' }
  ];

  const fetchAndSetAvailableGames = useCallback(async () => {
    if (selectedSport && selectedDate) {
      setIsLoading(true);
      try {
        const result = await refetchGames();
        if (result.data) {
          setGames(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedSport, selectedDate, refetchGames]);

  useEffect(() => {
    if (selectedSport && selectedDate) {
      fetchAndSetAvailableGames();
    }
  }, [selectedSport, selectedDate, fetchAndSetAvailableGames]);

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    if (selectedSport) {
      await fetchAndSetAvailableGames();
    }
  };

  const handleSportChange = async (sport: string) => {
    setSelectedSport(sport);
    if (selectedDate) {
      await fetchAndSetAvailableGames();
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
  };

  const handleSetGame = () => {
    if (selectedGame) {
      setActiveGame(selectedGame);
    }
  };

  const handleUnsetGame = () => {
    unsetActiveGame();
    setSelectedGame(null);
    setSetGame(null);
  };

  const navigate = useNavigate();

  const HeaderButtons = () => (
    <Box position="absolute" top={4} right={4}>
      <Button colorScheme="blue" onClick={() => navigate('/game')}>
        Return to Game
      </Button>
    </Box>
  );

  return (
    <Box bgGradient="linear(to-b, gray.900, gray.800, gray.900)" minH="100vh" p={4}>
      <Container maxW="container.md">
        <VStack spacing={8}>
          <HeaderButtons />
          <Box textAlign="center" mt={6}>
            <Image src={logo} alt="AfterMarket Logo" boxSize="128px" mx="auto" />
            <Heading sx={gradientText} fontSize="4xl" fontWeight="extrabold">
              AfterMarket Admin
            </Heading>
            <Text fontSize="lg" color="gray.300">
              Game Management Dashboard
            </Text>
          </Box>

          <Box w="full" bg="gray.800" p={6} rounded="lg">
            <Heading size="lg" color="green.400" mb={4}>Current Game</Heading>
            {setGame ? (
              <VStack align="stretch" spacing={2}>
                <Text color="gray.300">Sport: {sportOptions.find(opt => opt.key === setGame.sportKey)?.label}</Text>
                {(() => {
                  const gameDate = new Date(setGame.commenceTime);
                  const dateOptions = { timeZone: 'America/New_York' };
                  const timeOptions = { 
                    timeZone: 'America/New_York',
                    hour: "2-digit" as const,
                    minute: "2-digit" as const
                  };
                  
                  return (
                    <>
                      <Text color="gray.300">
                        Date: {gameDate.toLocaleDateString('en-US', dateOptions)}
                      </Text>
                      <Text color="gray.300">
                        Start Time: {gameDate.toLocaleTimeString('en-US', timeOptions)}
                      </Text>
                    </>
                  );
                })()}
                <Text color="gray.300">Home Team: {setGame.homeTeam}</Text>
                <Text color="gray.300">Away Team: {setGame.awayTeam}</Text>
                <Button
                  colorScheme="blue"
                  w="full"
                  mt={4}
                  onClick={handleUnsetGame}
                >
                  Unset Game
                </Button>
              </VStack>
            ) : (
              <Text color="gray.300">No game set</Text>
            )}
          </Box>

          <Box w="full" bg="gray.800" p={6} rounded="lg">
            <Heading size="lg" color="green.400" mb={4}>Select Game</Heading>
            <VStack spacing={4}>
              <Select
                value={selectedSport}
                onChange={(e) => handleSportChange(e.target.value)}
                placeholder="Select Sport"
                bg="gray.700"
                color="white"
              >
                {sportOptions.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                bg="gray.700"
                color="white"
              />

              {isLoading ? (
                <Box w="full" textAlign="center" p={4}>
                  <Text color="gray.300">Loading games...</Text>
                </Box>
              ) : games.length > 0 ? (
                <List spacing={3} w="full">
                  {games.map((game, index) => (
                    <ListItem
                      key={index}
                      p={3}
                      bg={areGamesEqual(selectedGame, game) ? 'blue.700' : 'gray.700'}
                      rounded="md"
                      cursor="pointer"
                      onClick={() => handleGameSelect(game)}
                      color="white"
                    >
                      <HStack spacing={2}>
                        <Text fontWeight="bold">{game.awayTeam}</Text>
                        <Text>vs</Text>
                        <Text fontWeight="bold">{game.homeTeam}</Text>
                        <Text color="gray.300">•</Text>
                        <Text color="gray.300">
                          {new Date(game.commenceTime).toLocaleTimeString('en-US', {
                            timeZone: 'America/New_York', 
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </HStack>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box w="full" textAlign="center" p={4}>
                  <Text color="gray.300">No games available for selected date</Text>
                </Box>
              )}

              <Button
                colorScheme="blue"
                isDisabled={!selectedGame}
                onClick={handleSetGame}
                w="full"
              >
                Set Game
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default AdminPage;
