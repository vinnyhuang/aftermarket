import { adminProcedure, procedure, router } from '../../server/trpc';
import { z } from 'zod';
import axios from 'axios';
import { prisma } from '../../server/context';
import { getOddsForGame } from '../odds/odds.service';
import { TRPCError } from '@trpc/server';

const sportKeySchema = z.string();
const dateSchema = z.string();

// The type for the game object returned from The Odds API
export type Game = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

export const adminRouter = router({
  getAvailableGames: adminProcedure
    .input(z.object({ sportKey: sportKeySchema, date: dateSchema }))
    .query(async ({ input }) => {
      const { sportKey, date } = input;
      const apiKey = process.env.THE_ODDS_API_KEY;
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${apiKey}`;

      const response = await axios.get(url);
      const games = response.data;

      // Filter games by date in Eastern time
      const filteredGames = games.filter((game: Game) => {
        const utcDate = new Date(game.commence_time);
        const easternDate = new Date(utcDate.toLocaleString('en-US', { 
          timeZone: 'America/New_York'
        }));
        const easternDateString = easternDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        return easternDateString === date;
      });

      // Convert snake case to camel case and remove id
      return filteredGames.map(({ id, sport_key, sport_title, commence_time, home_team, away_team }: Game) => ({
        id,
        sportKey: sport_key,
        sportTitle: sport_title,
        commenceTime: commence_time,
        homeTeam: home_team,
        awayTeam: away_team
      }));
    }),

  getActiveGame: procedure
    .query(async () => {
      const activeGame = await prisma.game.findFirst({
        where: {
          active: true
        }
      });
      return activeGame;
    }),

  setActiveGame: adminProcedure
    .input(z.object({
      id: z.string(),
      homeTeam: z.string(),
      awayTeam: z.string(), 
      commenceTime: z.string(),
      sportKey: z.string(),
      sportTitle: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { id, homeTeam, awayTeam, commenceTime, sportKey, sportTitle } = input;

      // Check if the game already exists
      const existingGame = await prisma.game.findUnique({
        where: {
          id
        }
      });

      let gameId: string;

      if (existingGame) {
        // Set existing game to active
        await prisma.game.update({
          where: { id },
          data: { active: true }
        });
        gameId = id;
      } else {
        // Get odds from odds service
        const gameInfo = {
          id,
          homeTeam,
          awayTeam,
          commenceTime: new Date(commenceTime),
          sportKey,
          sportTitle,
          active: true,
        }
        const pregameOdds = await getOddsForGame(gameInfo);

        if (!pregameOdds) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to get pregame odds'
          });
        }

        // Add the new game and set it as active with odds data
        const newGame = await prisma.game.create({
          data: {
            ...gameInfo,
            pregameHomePayout: pregameOdds.homePrice * 100,
            pregameAwayPayout: pregameOdds.awayPrice * 100,
            pregameHomeWinProb: pregameOdds.homeWinProb,
            pregameAwayWinProb: pregameOdds.awayWinProb,
          },
        });
        gameId = newGame.id;
      }

      // Set all other games to inactive
      await prisma.game.updateMany({
        where: {
          NOT: {
            id: gameId
          },
        },
        data: {
          active: false,
        },
      });

      return { success: true };
    }),

  unsetActiveGame: adminProcedure
    .mutation(async () => {
      // Set all games to inactive
      await prisma.game.updateMany({
        where: {},
        data: {
          active: false,
        },
      });

      return { success: true };
    }),
});
