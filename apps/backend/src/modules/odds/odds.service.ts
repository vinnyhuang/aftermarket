import axios from 'axios';

const BOOKMAKER_KEY = 'draftkings';
const MARKET_KEY = 'h2h';

const calculateProbability = (odds: number): number => {
  try {
    return Number(((1 / odds) * 100).toFixed(2));
  } catch (error) {
    return 0.0;
  }
};

export const getOddsForGame = async (game: { sportKey: string; id: string; homeTeam: string; awayTeam: string }) => {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const url = `https://api.the-odds-api.com/v4/sports/${game.sportKey}/odds?apiKey=${apiKey}&eventIds=${game.id.replace(/-/g, '')}&markets=${MARKET_KEY}&regions=us`;
  const response = await axios.get(url);
  const bookmaker = response.data[0]?.bookmakers?.find((b: { key: string }) => b.key === BOOKMAKER_KEY);
  const market = bookmaker?.markets?.find((m: { key: string }) => m.key === MARKET_KEY);
  const outcomes = market?.outcomes;

  // Find odds for home and away teams
  const homePayout = outcomes?.find((odd: { name: string }) => odd.name === game.homeTeam)?.price;
  const awayPayout = outcomes?.find((odd: { name: string }) => odd.name === game.awayTeam)?.price;

  if (!homePayout || !awayPayout) return null;

  // Calculate win probabilities
  const homeWinProb = calculateProbability(homePayout);
  const awayWinProb = calculateProbability(awayPayout);

  return {
    homePrice: homePayout,
    awayPrice: awayPayout,
    homeWinProb,
    awayWinProb
  };
};

export const getGameScore = async (game: { sportKey: string; id: string }) => {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const url = `https://api.the-odds-api.com/v4/sports/${game.sportKey}/scores?apiKey=${apiKey}&eventIds=${game.id.replace(/-/g, '')}`;
  
  try {
    const response = await axios.get(url);
    const gameData = response.data[0];
    
    if (!gameData) return null;
    
    return {
      completed: gameData.completed,
      homeScore: gameData.scores?.find((s: { name: string; score: string }) => s.name === gameData.home_team)?.score,
      awayScore: gameData.scores?.find((s: { name: string; score: string }) => s.name === gameData.away_team)?.score
    };
  } catch (error) {
    console.error('Error fetching game scores:', error);
    return null;
  }
};