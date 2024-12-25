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
  const baseUrl = `https://api.the-odds-api.com/v4/sports/${game.sportKey}/scores?apiKey=${apiKey}&eventIds=${game.id.replace(/-/g, '')}`;
  
  try {
    // First try without daysFrom
    let response = await axios.get(baseUrl);
    
    // If no data found, try again with daysFrom=3
    if (response.data.length === 0) {
      response = await axios.get(`${baseUrl}&daysFrom=3`);
    }

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

interface ESPNGame {
  date: string;
  name: string;
  status: {
    type: {
      completed: boolean;
    };
  };
  competitions: Array<{
    competitors: Array<{
      homeAway: string;
      score: string;
    }>;
  }>;
}

const sportKeyToESPNMapping: Record<string, { sport: string; league: string }> = {
  'americanfootball_ncaaf': { sport: 'football', league: 'college-football' },
  'americanfootball_nfl': { sport: 'football', league: 'nfl' },
  'basketball_nba': { sport: 'basketball', league: 'nba' },
  'basketball_ncaab': { sport: 'basketball', league: 'mens-college-basketball' }
};

export const getGameScoreESPN = async (game: { 
  sportKey: string; 
  id: string; 
  homeTeam: string;
  awayTeam: string; 
  commenceTime: Date 
}) => {
  try {
    const espnMapping = sportKeyToESPNMapping[game.sportKey];
    if (!espnMapping) {
      console.warn(`No ESPN mapping found for sport key: ${game.sportKey}`);
      return null;
    }

    // Convert game time to Eastern timezone and format as YYYYMMDD
    const gameTimeEST = new Date(game.commenceTime).toLocaleString('en-US', { 
      timeZone: 'America/New_York' 
    });
    const date = new Date(gameTimeEST)
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');

    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnMapping.sport}/${espnMapping.league}/scoreboard?dates=${date}`;
    
    const response = await axios.get<{ events: ESPNGame[] }>(url);
    const games = response.data.events;

    if (!games || !games.length) return null;

    // Expected event name format from our game data
    const expectedName = `${game.awayTeam} at ${game.homeTeam}`.toLowerCase();

    // Find matching game within 1 hour of commence time
    const matchingGame = games.find((espnGame) => {
      // Check if game time is within 1 hour
      const espnDate = new Date(espnGame.date);
      const commenceDate = new Date(game.commenceTime);
      const hourDiff = Math.abs(espnDate.getTime() - commenceDate.getTime()) / 36e5;
      
      if (hourDiff > 1) return false;

      // Check team names using fuzzy match
      const espnName = espnGame.name.toLowerCase();
      return fuzzyMatch(expectedName, espnName);
    });

    if (!matchingGame || !matchingGame.competitions?.[0]) return null;

    const competition = matchingGame.competitions[0];
    const homeTeam = competition.competitors.find(t => t.homeAway === 'home');
    const awayTeam = competition.competitors.find(t => t.homeAway === 'away');

    return {
      completed: matchingGame.status.type.completed,
      homeScore: homeTeam?.score,
      awayScore: awayTeam?.score
    };

  } catch (error) {
    console.error('Error fetching ESPN game scores:', error);
    // Return null so the system can fall back to the original getGameScore
    return null;
  }
};

// Simple fuzzy matching function that allows for some variation in team names
function fuzzyMatch(str1: string, str2: string): boolean {
  // Remove common words and special characters
  const clean = (s: string) => s.replace(/at|vs\.?|\s+/g, '').replace(/[^a-z0-9]/g, '');
  const s1 = clean(str1);
  const s2 = clean(str2);
  
  // Check if one string contains most of the other
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  // Return true if at least 80% of characters match
  return matches / shorter.length >= 0.8;
}
