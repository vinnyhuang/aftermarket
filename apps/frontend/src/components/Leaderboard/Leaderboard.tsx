import { Box, Table, Thead, Tbody, Tr, Th, Td, Heading } from '@chakra-ui/react';

export type LeaderboardEntry = {
  userId: string;
  username: string;
  bankroll: number;
};

export const Leaderboard = ({ entries }: { entries: LeaderboardEntry[] }) => {
  return (
    <Box w="full" bg="gray.800" p={6} rounded="lg">
      <Heading size="lg" color="green.400" mb={4}>Leaderboard</Heading>
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th color="gray.400">Rank</Th>
              <Th color="gray.400">Player</Th>
              <Th color="gray.400" isNumeric>Bankroll Value</Th>
            </Tr>
          </Thead>
          <Tbody>
            {entries.map((entry, index) => (
              <Tr key={entry.userId}>
                <Td color="white">{index + 1}</Td>
                <Td color="white">{entry.username}</Td>
                <Td color="white" isNumeric>${entry.bankroll.toFixed(2)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};
